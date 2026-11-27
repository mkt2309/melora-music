const supabase = require('../config/supabasePublic');

// Lấy danh sách thể loại nhạc
const getGenres = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('genres')
            .select('*');

        if (error) {
            console.error('Get genres error:', error.message);

            return res.status(500).json({
                message: 'Failed to retrieve genres.'
            });
        }

        res.json({
            message: 'Genres retrieved successfully.',
            count: data.length,
            genres: data
        });
    } catch (error) {
        console.error('Get genres error:', error.message);

        res.status(500).json({
            message: 'Failed to retrieve genres.'
        });
    }
};

module.exports = {
    getGenres
};