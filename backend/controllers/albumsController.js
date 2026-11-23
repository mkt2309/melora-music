const supabase = require('../config/supabasePublic');

// Lấy danh sách album kèm nghệ sĩ và danh sách bài hát
const getAlbums = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('albums')
            .select(`
                album_id,
                title,
                release_date,
                cover_url,
                created_at,
                album_artists (
                    artists (
                        artist_id,
                        name
                    )
                ),
                album_tracks (
                    song_id,
                    disc_number,
                    track_number
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Get albums error:', error.message);
            return res.status(500).json({
                message: 'Failed to retrieve albums.'
            });
        }

        const albums = data.map((album) => {
            const artists = (album.album_artists || [])
                .map((item) => item.artists)
                .filter(Boolean)
                .sort((a, b) => Number(a.artist_id) - Number(b.artist_id));

            const tracks = (album.album_tracks || [])
                .slice()
                .sort((a, b) =>
                    (a.disc_number - b.disc_number) ||
                    (a.track_number - b.track_number)
                );

            return {
                id: album.album_id,
                title: album.title,
                year: album.release_date
                    ? Number(String(album.release_date).slice(0, 4))
                    : null,
                release_date: album.release_date,
                cover_url: album.cover_url,
                artist: artists.map((item) => item.name).join(', ') || 'Nhiều nghệ sĩ',
                artists,
                track_ids: tracks.map((track) => track.song_id)
            };
        });

        return res.json({
            message: 'Albums retrieved successfully.',
            count: albums.length,
            albums
        });
    } catch (error) {
        console.error('Get albums error:', error.message);
        return res.status(500).json({
            message: 'Failed to retrieve albums.'
        });
    }
};

module.exports = {
    getAlbums
};
