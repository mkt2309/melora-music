const supabase = require('../config/supabase');

const WINDOW_MS = 10_000;
const MAX_PLAYS_PER_USER_SONG_PER_MINUTE = 5;
const PAGE_SIZE = 1000;

const pendingHistoryIds = new Set();
let isProcessing = false;
let leaderboardRefreshRequested = false;
let recoveryPromise = Promise.resolve();

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

const getRecentPlayContext = async (historyRows) => {
    const userIds = [...new Set(historyRows.map((row) => row.user_id))];

    if (userIds.length === 0) {
        return { counts: new Map(), relatedRows: [] };
    }

    const cutoff = new Date(Date.now() - 60_000).toISOString();
    const recentRows = await fetchAllRows(() => supabase
        .from('listening_history')
        .select(`
            history_id,
            user_id,
            song_id,
            listened_seconds,
            completed,
            songs (
                duration_seconds
            )
        `)
        .in('user_id', userIds)
        .gte('played_at', cutoff));

    const affectedPairs = new Set(
        historyRows.map((row) => `${row.user_id}:${row.song_id}`)
    );
    const relatedRows = recentRows.filter((row) =>
        affectedPairs.has(`${row.user_id}:${row.song_id}`)
    );
    const counts = new Map();

    for (const row of recentRows) {
        const key = `${row.user_id}:${row.song_id}`;
        counts.set(key, (counts.get(key) || 0) + 1);
    }

    return { counts, relatedRows };
};

const classifyListening = (row, recentPlayCount) => {
    const listenedSeconds = Number(row.listened_seconds || 0);
    const durationSeconds = Number(row.songs?.duration_seconds || 0);

    if (durationSeconds > 0 && listenedSeconds > durationSeconds + 5) {
        return {
            status: 'rejected',
            reason: 'listened_time_exceeds_song_duration'
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

    const { error } = await supabase
        .from('song_rankings')
        .upsert(rankingRows, { onConflict: 'song_id' });

    if (error) throw error;
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
            if (history.listened_seconds === null && !history.completed) continue;

            const evaluated = evaluatedByHistoryId.get(history.history_id);
            const currentSeconds = Number(history.listened_seconds || 0);

            if (
                !evaluated ||
                Number(evaluated.listened_seconds) !== currentSeconds ||
                Boolean(evaluated.completed) !== Boolean(history.completed)
            ) {
                pendingHistoryIds.add(history.history_id);
            }
        }
    } catch (error) {
        console.error('Ranking queue recovery failed:', error.message);
    }
};

const processBatch = async () => {
    await recoveryPromise;

    if (isProcessing || (pendingHistoryIds.size === 0 && !leaderboardRefreshRequested)) {
        return;
    }

    isProcessing = true;

    const batch = [...pendingHistoryIds];
    pendingHistoryIds.clear();

    const shouldRefreshLeaderboard = leaderboardRefreshRequested;
    leaderboardRefreshRequested = false;

    try {
        if (batch.length > 0) {
            const historyRows = await fetchAllRows(() => supabase
                .from('listening_history')
                .select(`
                    history_id,
                    user_id,
                    song_id,
                    listened_seconds,
                    completed,
                    songs (
                        duration_seconds
                    )
                `)
                .in('history_id', batch));

            if (historyRows.length > 0) {
                const { counts: recentPlayCounts, relatedRows } =
                    await getRecentPlayContext(historyRows);

                const rowsByHistoryId = new Map();

                for (const row of historyRows) {
                    rowsByHistoryId.set(row.history_id, row);
                }

                for (const row of relatedRows) {
                    rowsByHistoryId.set(row.history_id, row);
                }

                const evaluatedAt = new Date().toISOString();
                const rankingEvents = [...rowsByHistoryId.values()].map((row) => {
                    const key = `${row.user_id}:${row.song_id}`;
                    const result = classifyListening(
                        row,
                        recentPlayCounts.get(key) || 0
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

                const { error } = await supabase
                    .from('ranking_events')
                    .upsert(rankingEvents, { onConflict: 'history_id' });

                if (error) throw error;

                const summary = rankingEvents.reduce((result, event) => {
                    result[event.status] += 1;
                    return result;
                }, { accepted: 0, suspicious: 0, rejected: 0 });

                console.log(
                    `Ranking batch processed: ${rankingEvents.length} events`,
                    summary
                );
            }
        }

        if (batch.length > 0 || shouldRefreshLeaderboard) {
            await refreshLeaderboard();
        }
    } catch (error) {
        for (const historyId of batch) {
            pendingHistoryIds.add(historyId);
        }

        if (shouldRefreshLeaderboard || batch.length > 0) {
            leaderboardRefreshRequested = true;
        }

        console.error('Ranking batch processing failed:', error.message);
    } finally {
        isProcessing = false;
    }
};

const enqueueListeningHistory = (historyId) => {
    const id = Number(historyId);

    if (Number.isInteger(id) && id > 0) {
        pendingHistoryIds.add(id);
    }
};

const requestLeaderboardRefresh = () => {
    leaderboardRefreshRequested = true;
};

// Rebuild the queue from persisted listening data after a backend restart.
recoveryPromise = recoverPendingHistory();
leaderboardRefreshRequested = true;

const windowTimer = setInterval(() => {
    processBatch();
}, WINDOW_MS);

if (typeof windowTimer.unref === 'function') {
    windowTimer.unref();
}

module.exports = {
    enqueueListeningHistory,
    requestLeaderboardRefresh,
    processBatch
};
