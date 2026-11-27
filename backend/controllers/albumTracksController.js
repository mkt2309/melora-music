const supabasePublic = require('../config/supabasePublic');

// Lấy danh sách bài hát trong album
const getAlbumTracks = async (req, res) => {
    try {
        const albumId = req.params.albumId;

        if (!/^[1-9]\d*$/.test(albumId)) {
            return res.status(400).json({
                message: 'A valid albumId is required.'
            });
        }

        const { data, error } = await supabasePublic
            .from('album_tracks')
            .select('*')
            .eq('album_id', albumId)
            .order('disc_number', { ascending: true })
            .order('track_number', { ascending: true });

        if (error) {
            console.error('Get album tracks error:', error.message);

            return res.status(500).json({
                message: 'Failed to retrieve album tracks.'
            });
        }

        res.json({
            message: 'Album tracks retrieved successfully.',
            count: data.length,
            tracks: data
        });
    } catch (error) {
        console.error('Get album tracks error:', error.message);

        res.status(500).json({
            message: 'Failed to retrieve album tracks.'
        });
    }
};

module.exports = {
    getAlbumTracks
};
