const supabase = require('../config/supabasePublic');

// Lấy danh sách album
const getAlbums = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('albums')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Get albums error:', error.message);

            return res.status(500).json({
                message: 'Failed to retrieve albums.'
            });
        }

        res.json({
            message: 'Albums retrieved successfully.',
            count: data.length,
            albums: data
        });
    } catch (error) {
        console.error('Get albums error:', error.message);

        res.status(500).json({
            message: 'Failed to retrieve albums.'
        });
    }
};

module.exports = {
    getAlbums
};