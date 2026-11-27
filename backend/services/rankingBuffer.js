const supabase = require('../config/supabase');

const WINDOW_MS = 2_000;
const BOT_REQ_THRESHOLD = 2;
const BOT_FOCUS_THRESHOLD = 0.70;
const MAX_PLAYS_PER_USER_SONG_PER_MINUTE = 5;
const PAGE_SIZE = 1000;
const QUERY_CHUNK_SIZE = 500;
const UPSERT_CHUNK_SIZE = 500;

// Queue RAM chứa history_id của các lượt nghe cần đánh giá.
const activeWindowIds = new Set();

// Các cửa sổ đã đóng được xử lý lần lượt, không chạy chồng lấn.
const completedWindows = [];

let isProcessing = false;
let recoveryComplete = false;
let leaderboardRefreshRequested = true;

const fetchAllRows = async (buildQuery) => {
    const rows = [];
    let start = 0;

    while (true) {
        const { data, error } = await buildQuery()
            .range(start, start + PAGE_SIZE - 1);

        if (error) throw error;

        rows.push(...(data || []));

        if (!data || data.length < PAGE_SIZE) break;
        start += PAGE_SIZE;
    }

    return rows;
};

const fetchHistoryRows = async (historyIds) => {
    const rows = [];

    for (let i = 0; i < historyIds.length; i += QUERY_CHUNK_SIZE) {
        const idChunk = historyIds.slice(i, i + QUERY_CHUNK_SIZE);
        const chunkRows = await fetchAllRows(() => supabase
            .from('listening_history')
            .select(`
                history_id,
                user_id,
                song_id,
                played_at,
                listened_seconds,
                completed,
                songs (
                    duration_seconds
                )
            `)
            .in('history_id', idChunk)
            .order('history_id', { ascending: true }));

        rows.push(...chunkRows);
    }

    return rows;
};

const getRecentPlayContext = async (historyRows, windowStartMs, windowEndMs) => {
    const userIds = [...new Set(historyRows.map((row) => row.user_id))];

    if (userIds.length === 0) {
        return new Map();
    }

    // Đếm lượt nghe trong 60 giây kết thúc tại cuối Tumbling Window đang xét.
    const cutoff = new Date(windowStartMs - 60_000).toISOString();
    const windowEnd = new Date(windowEndMs).toISOString();
    const recentRows = [];

    for (let i = 0; i < userIds.length; i += QUERY_CHUNK_SIZE) {
        const userChunk = userIds.slice(i, i + QUERY_CHUNK_SIZE);
        const chunkRows = await fetchAllRows(() => supabase
            .from('listening_history')
            .select('user_id, song_id')
            .in('user_id', userChunk)
            .gte('played_at', cutoff)
            .lt('played_at', windowEnd)
            .order('history_id', { ascending: true }));

        recentRows.push(...chunkRows);
    }

    const counts = new Map();

    for (const row of recentRows) {
        const key = `${row.user_id}:${row.song_id}`;
        counts.set(key, (counts.get(key) || 0) + 1);
    }

    return counts;
};

const getWindowSpamReasons = (historyRows) => {
    const rowsByUser = new Map();

    for (const row of historyRows) {
        if (!rowsByUser.has(row.user_id)) {
            rowsByUser.set(row.user_id, []);
        }

        rowsByUser.get(row.user_id).push(row);
    }

    const spamReasons = new Map();

    for (const [userId, rows] of rowsByUser) {
        if (rows.length <= BOT_REQ_THRESHOLD) continue;

        const songCounts = new Map();

        for (const row of rows) {
            songCounts.set(
                row.song_id,
                (songCounts.get(row.song_id) || 0) + 1
            );
        }

        let topSongCount = 0;
        let topSongId = null;

        for (const [songId, count] of songCounts) {
            if (count > topSongCount) {
                topSongCount = count;
                topSongId = songId;
            }
        }

        const focusRatio = topSongCount / rows.length;

        if (focusRatio >= BOT_FOCUS_THRESHOLD) {
            spamReasons.set(
                userId,
                `tumbling_window_spam_over_2_requests_70_percent_song_${topSongId}`
            );
        }
    }

    return spamReasons;
};

const classifyListening = (row, recentPlayCount, windowSpamReason = null) => {
    const listenedSeconds = Number(row.listened_seconds || 0);
    const durationSeconds = Number(row.songs?.duration_seconds || 0);

    if (durationSeconds > 0 && listenedSeconds > durationSeconds + 5) {
        return {
            status: 'rejected',
            reason: 'listened_time_exceeds_song_duration'
        };
    }

    if (windowSpamReason) {
        return {
            status: 'suspicious',
            reason: windowSpamReason
        };
    }

    if (recentPlayCount > MAX_PLAYS_PER_USER_SONG_PER_MINUTE) {
        return {
            status: 'suspicious',
            reason: 'more_than_5_plays_of_same_song_in_60_seconds'
        };
    }

    const minimumAcceptedSeconds = durationSeconds > 0
        ? Math.min(30, Math.ceil(durationSeconds * 0.8))
        : 30;

    if (row.completed || listenedSeconds >= minimumAcceptedSeconds) {
        return {
            status: 'accepted',
            reason: null
        };
    }

    return {
        status: 'suspicious',
        reason: 'listening_time_below_acceptance_threshold'
    };
};

const refreshLeaderboard = async () => {
    const [songs, acceptedEvents] = await Promise.all([
        fetchAllRows(() => supabase
            .from('songs')
            .select('song_id')
            .order('song_id', { ascending: true })),
        fetchAllRows(() => supabase
            .from('ranking_events')
            .select('song_id')
            .eq('status', 'accepted')
            .order('history_id', { ascending: true }))
    ]);

    const counts = new Map();

    for (const event of acceptedEvents) {
        counts.set(event.song_id, (counts.get(event.song_id) || 0) + 1);
    }

    if (songs.length === 0) return;

    const updatedAt = new Date().toISOString();
    const rankingRows = songs.map((song) => ({
        song_id: song.song_id,
        play_count: counts.get(song.song_id) || 0,
        updated_at: updatedAt
    }));

    for (let i = 0; i < rankingRows.length; i += UPSERT_CHUNK_SIZE) {
        const { error } = await supabase
            .from('song_rankings')
            .upsert(rankingRows.slice(i, i + UPSERT_CHUNK_SIZE), {
                onConflict: 'song_id'
            });

        if (error) throw error;
    }
};

const recoverPendingHistory = async () => {
    try {
        const [historyRows, rankingEvents] = await Promise.all([
            fetchAllRows(() => supabase
                .from('listening_history')
                .select('history_id, listened_seconds, completed')
                .order('history_id', { ascending: true })),
            fetchAllRows(() => supabase
                .from('ranking_events')
                .select('history_id, listened_seconds, completed')
                .order('history_id', { ascending: true }))
        ]);

        const evaluatedByHistoryId = new Map(
            rankingEvents.map((event) => [event.history_id, event])
        );

        for (const history of historyRows) {
            const evaluated = evaluatedByHistoryId.get(history.history_id);
            const currentSeconds = Number(history.listened_seconds ?? 0);

            if (
                !evaluated ||
                Number(evaluated.listened_seconds ?? 0) !== currentSeconds ||
                Boolean(evaluated.completed) !== Boolean(history.completed)
            ) {
                // Kể cả lượt nghe chưa có progress cũng được phục hồi.
                // Lượt đó sẽ bị đánh dấu suspicious cho tới khi có progress mới.
                activeWindowIds.add(history.history_id);
            }
        }

        recoveryComplete = true;
        console.log(
            `Ranking queue recovery completed: ${activeWindowIds.size} pending history records`
        );

        return true;
    } catch (error) {
        console.error('Ranking queue recovery failed:', error.message);
        return false;
    }
};

const ensureRecovery = async () => {
    if (recoveryComplete) return true;
    return recoverPendingHistory();
};

const processWindow = async (windowBatch) => {
    const windowStartMs = new Date(windowBatch.windowStart).getTime();
    const windowEndMs = new Date(windowBatch.windowEnd).getTime();
    const windowStart = new Date(windowStartMs).toISOString();
    const windowEnd = new Date(windowEndMs).toISOString();
    const historyRows = [];

    // Lấy toàn bộ lượt nghe của các user trong cửa sổ event-time,
    // không chỉ các ID vừa được đưa vào Queue.
    for (let i = 0; i < windowBatch.userIds.length; i += QUERY_CHUNK_SIZE) {
        const userChunk = windowBatch.userIds.slice(i, i + QUERY_CHUNK_SIZE);
        const chunkRows = await fetchAllRows(() => supabase
            .from('listening_history')
            .select(`
                history_id,
                user_id,
                song_id,
                played_at,
                listened_seconds,
                completed,
                songs (
                    duration_seconds
                )
            `)
            .in('user_id', userChunk)
            .gte('played_at', windowStart)
            .lt('played_at', windowEnd)
            .order('history_id', { ascending: true }));

        historyRows.push(...chunkRows);
    }

    if (historyRows.length === 0) return;

    const recentPlayCounts =
        await getRecentPlayContext(historyRows, windowStartMs, windowEndMs);
    const windowSpamReasons = getWindowSpamReasons(historyRows);

    const evaluatedAt = new Date().toISOString();
    const rankingEvents = historyRows.map((row) => {
        const key = `${row.user_id}:${row.song_id}`;
        const windowSpamReason = windowSpamReasons.get(row.user_id) || null;
        const result = classifyListening(
            row,
            recentPlayCounts.get(key) || 0,
            windowSpamReason
        );

        return {
            history_id: row.history_id,
            user_id: row.user_id,
            song_id: row.song_id,
            listened_seconds: Number(row.listened_seconds || 0),
            completed: Boolean(row.completed),
            status: result.status,
            reason: result.reason,
            evaluated_at: evaluatedAt
        };
    });

    for (let i = 0; i < rankingEvents.length; i += UPSERT_CHUNK_SIZE) {
        const { error } = await supabase
            .from('ranking_events')
            .upsert(rankingEvents.slice(i, i + UPSERT_CHUNK_SIZE), {
                onConflict: 'history_id'
            });

        if (error) throw error;
    }

    const summary = rankingEvents.reduce((result, event) => {
        result[event.status] += 1;
        return result;
    }, { accepted: 0, suspicious: 0, rejected: 0 });

    console.log(
        'Ranking tumbling window processed:',
        {
            windowStart,
            windowEnd,
            events: rankingEvents.length,
            spamUsers: windowSpamReasons.size,
            ...summary
        }
    );

};

const drainCompletedWindows = async () => {
    if (isProcessing) return;

    isProcessing = true;

    try {
        const recovered = await ensureRecovery();
        if (!recovered) return;

        let processedAnyWindow = false;

        while (completedWindows.length > 0) {
            completedWindows.sort((left, right) => new Date(left.windowStart) - new Date(right.windowStart));
            const currentWindow = completedWindows[0];

            try {
                await processWindow(currentWindow);
                completedWindows.shift();
                processedAnyWindow = true;
            } catch (error) {
                // Giữ nguyên cửa sổ lỗi ở đầu hàng đợi để thử lại.
                // Upsert theo history_id giúp việc thử lại không nhân đôi event.
                console.error(
                    'Ranking tumbling window processing failed:',
                    error.message
                );
                break;
            }
        }

        if (processedAnyWindow) {
            leaderboardRefreshRequested = true;
        }

        if (leaderboardRefreshRequested && completedWindows.length === 0) {
            leaderboardRefreshRequested = false;

            try {
                await refreshLeaderboard();
            } catch (error) {
                leaderboardRefreshRequested = true;
                console.error('Leaderboard refresh failed:', error.message);
            }
        }
    } finally {
        isProcessing = false;
    }
};

const materializeTumblingWindows = async (historyIds) => {
    const queuedRows = await fetchHistoryRows(historyIds);
    const groups = new Map();

    // Gán từng lượt nghe vào một cửa sổ cố định, không chồng lấn,
    // dựa trên played_at (event time) đã được PostgreSQL lưu.
    for (const row of queuedRows) {
        const playedAtMs = new Date(row.played_at).getTime();
        if (!Number.isFinite(playedAtMs)) continue;

        const windowStartMs = Math.floor(playedAtMs / WINDOW_MS) * WINDOW_MS;
        let group = groups.get(windowStartMs);

        if (!group) {
            group = { userIds: new Set() };
            groups.set(windowStartMs, group);
        }

        group.userIds.add(row.user_id);
    }

    const orderedWindows = [...groups.entries()]
        .sort(([left], [right]) => left - right);

    for (const [windowStartMs, group] of orderedWindows) {
        completedWindows.push({
            windowStart: new Date(windowStartMs).toISOString(),
            windowEnd: new Date(windowStartMs + WINDOW_MS).toISOString(),
            userIds: [...group.userIds]
        });
    }
};

const closeTumblingWindow = () => {
    const historyIds = [...activeWindowIds];
    activeWindowIds.clear();

    if (historyIds.length > 0) {
        materializeTumblingWindows(historyIds)
            .then(() => drainCompletedWindows())
            .catch((error) => {
                // Nếu không đọc được played_at để tạo window, đưa ID trở lại Queue.
                for (const historyId of historyIds) {
                    activeWindowIds.add(historyId);
                }

                console.error('Ranking window materialization failed:', error.message);
            });
    }

    void drainCompletedWindows();
};

const enqueueListeningHistory = (historyId) => {
    const id = Number(historyId);

    if (Number.isInteger(id) && id > 0) {
        activeWindowIds.add(id);
    }
};

const requestLeaderboardRefresh = () => {
    leaderboardRefreshRequested = true;
    void drainCompletedWindows();
};

// API tương thích để có thể yêu cầu đóng cửa sổ và xử lý ngay.
const processBatch = async () => {
    const historyIds = [...activeWindowIds];
    activeWindowIds.clear();

    if (historyIds.length > 0) {
        try {
            await materializeTumblingWindows(historyIds);
        } catch (error) {
            for (const historyId of historyIds) {
                activeWindowIds.add(historyId);
            }

            throw error;
        }
    }

    await drainCompletedWindows();
};

// Căn cửa sổ theo mốc thời gian cố định, không tạo các cửa sổ chồng lấn.
const scheduleNextWindow = () => {
    const now = Date.now();
    const nextBoundary = (Math.floor(now / WINDOW_MS) + 1) * WINDOW_MS;

    const timer = setTimeout(() => {
        closeTumblingWindow(nextBoundary);
        scheduleNextWindow();
    }, nextBoundary - now);

    if (typeof timer.unref === 'function') {
        timer.unref();
    }
};

scheduleNextWindow();

module.exports = {
    enqueueListeningHistory,
    requestLeaderboardRefresh,
    processBatch
};
