
const supabasePublic = require('../config/supabasePublic');

// Lấy danh sách nghệ sĩ của một album
const getAlbumArtists = async (req, res) => {
    try {
        const albumId = req.params.albumId;

        if (!/^[1-9]\d*$/.test(albumId)) {
            return res.status(400).json({
                message: 'A valid albumId is required.'
            });
        }

        const { data, error } = await supabasePublic
            .from('album_artists')
            .select('*')
            .eq('album_id', albumId);

        if (error) {
            console.error('Get album artists error:', error.message);

            return res.status(500).json({
                message: 'Failed to retrieve album artists.'
            });
        }

        res.json({
            message: 'Album artists retrieved successfully.',
            count: data.length,
            artists: data
        });
    } catch (error) {
        console.error('Get album artists error:', error.message);

        res.status(500).json({
            message: 'Failed to retrieve album artists.'
        });
    }
};

module.exports = {
    getAlbumArtists
};
