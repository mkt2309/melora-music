const supabase = require('../config/supabasePublic');

// Lấy bảng xếp hạng từ các lượt nghe đã được bộ đệm xác nhận
const getLeaderboard = async (req, res) => {
    try {
        const requestedLimit = Number(req.query.limit);
        const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
            ? Math.min(requestedLimit, 100)
            : 50;

        const { data, error } = await supabase
            .from('song_rankings')
            .select(`
                song_id,
                play_count,
                updated_at,
                songs (
                    title,
                    duration_seconds,
                    song_artists (
                        artist_order,
                        artists (
                            artist_id,
                            name
                        )
                    )
                )
            `)
            .order('play_count', { ascending: false })
            .order('song_id', { ascending: true })
            .limit(limit);

        if (error) {
            console.error('Get song leaderboard error:', error.message);
            return res.status(500).json({
                message: 'Failed to retrieve song leaderboard.'
            });
        }

        const ranking = (data || []).map((row, index) => {
            const artists = (row.songs?.song_artists || [])
                .slice()
                .sort((a, b) =>
                    (a.artist_order ?? Number.MAX_SAFE_INTEGER) -
                    (b.artist_order ?? Number.MAX_SAFE_INTEGER)
                )
                .map((item) => item.artists)
                .filter(Boolean);

            return {
                rank: index + 1,
                song_id: row.song_id,
                title: row.songs?.title || 'Unknown song',
                artist: artists.map((artist) => artist.name).join(', '),
                duration_seconds: row.songs?.duration_seconds ?? null,
                play_count: Number(row.play_count),
                updated_at: row.updated_at
            };
        });

        return res.json({
            message: 'Song leaderboard retrieved successfully.',
            count: ranking.length,
            ranking
        });
    } catch (error) {
        console.error('Get song leaderboard error:', error.message);
        return res.status(500).json({
            message: 'Failed to retrieve song leaderboard.'
        });
    }
};

module.exports = {
    getLeaderboard
};
