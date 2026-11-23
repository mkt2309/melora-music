const supabase = require('../config/supabasePublic');

// Lấy danh sách nghệ sĩ
const getArtists = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('artists')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Get artists error:', error.message);

            return res.status(500).json({
                message: 'Failed to retrieve artists.'
            });
        }

        res.json({
            message: 'Artists retrieved successfully.',
            count: data.length,
            artists: data
        });
    } catch (error) {
        console.error('Get artists error:', error.message);

        res.status(500).json({
            message: 'Failed to retrieve artists.'
        });
    }
};

module.exports = {
    getArtists
};