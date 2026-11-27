const supabase = require('../config/supabasePublic');

// Lấy danh sách bài hát kèm nghệ sĩ, album và số lượt nghe hợp lệ
const getSongs = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('songs')
            .select(`
                song_id,
                title,
                duration_seconds,
                release_date,
                created_at,
                song_artists (
                    artist_order,
                    artists (
                        artist_id,
                        name
                    )
                ),
                album_tracks (
                    album_id,
                    disc_number,
                    track_number,
                    albums (
                        album_id,
                        title,
                        cover_url,
                        release_date
                    )
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Get songs error:', error.message);
            return res.status(500).json({
                message: 'Failed to retrieve songs.'
            });
        }

        const { data: playCounts, error: playCountsError } = await supabase
            .from('song_rankings')
            .select('song_id, play_count');

        if (playCountsError) {
            console.error('Get song rankings error:', playCountsError.message);
            return res.status(500).json({
                message: 'Failed to retrieve song rankings.'
            });
        }

        const playCountBySongId = new Map(
            (playCounts || []).map((item) => [
                Number(item.song_id),
                Number(item.play_count)
            ])
        );

        const keyword = String(req.query.q || '').trim().toLocaleLowerCase('vi');

        let songs = data.map((song) => {
            const artists = (song.song_artists || [])
                .slice()
                .sort((a, b) =>
                    (a.artist_order ?? Number.MAX_SAFE_INTEGER) -
                    (b.artist_order ?? Number.MAX_SAFE_INTEGER)
                )
                .map((item) => item.artists)
                .filter(Boolean);

            const albumTracks = (song.album_tracks || [])
                .slice()
                .sort((a, b) =>
                    (Number(a.album_id) - Number(b.album_id)) ||
                    (a.disc_number - b.disc_number) ||
                    (a.track_number - b.track_number)
                );

            const albumTrack = albumTracks[0];
            const album = albumTrack?.albums || null;

            return {
                id: song.song_id,
                title: song.title,
                duration_seconds: song.duration_seconds,
                release_date: song.release_date,
                artist: artists.map((item) => item.name).join(', '),
                artist_id: artists[0]?.artist_id ?? null,
                artists,
                album: album?.title ?? '',
                album_id: album?.album_id ?? null,
                cover_url: album?.cover_url ?? null,
                plays: playCountBySongId.get(Number(song.song_id)) || 0
            };
        });

        if (keyword) {
            songs = songs.filter((song) =>
                [song.title, song.artist, song.album]
                    .some((value) => String(value || '').toLocaleLowerCase('vi').includes(keyword))
            );
        }

        return res.json({
            message: 'Songs retrieved successfully.',
            count: songs.length,
            songs
        });
    } catch (error) {
        console.error('Get songs error:', error.message);
        return res.status(500).json({
            message: 'Failed to retrieve songs.'
        });
    }
};

module.exports = {
    getSongs
};
