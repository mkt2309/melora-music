const supabase = require('../config/supabasePublic');

// Lấy danh sách bài hát
const getSongs = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('songs')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Get songs error:', error.message);

            return res.status(500).json({
                message: 'Failed to retrieve songs.'
            });
        }

        res.json({
            message: 'Songs retrieved successfully.',
            count: data.length,
            songs: data
        });
    } catch (error) {
        console.error('Get songs error:', error.message);

        res.status(500).json({
            message: 'Failed to retrieve songs.'
        });
    }
};

module.exports = {
    getSongs
};