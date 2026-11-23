const supabasePublic = require('../config/supabasePublic');

// Lấy danh sách thể loại của một bài hát
const getSongGenres = async (req, res) => {
    try {
        const songId = req.params.songId;

        if (!/^[1-9]\d*$/.test(songId)) {
            return res.status(400).json({
                message: 'A valid songId is required.'
            });
        }

        const { data, error } = await supabasePublic
            .from('song_genres')
            .select('*')
            .eq('song_id', songId);

        if (error) {
            console.error('Get song genres error:', error.message);

            return res.status(500).json({
                message: 'Failed to retrieve song genres.'
            });
        }

        res.json({
            message: 'Song genres retrieved successfully.',
            count: data.length,
            genres: data
        });
    } catch (error) {
        console.error('Get song genres error:', error.message);

        res.status(500).json({
            message: 'Failed to retrieve song genres.'
        });
    }
};

module.exports = {
    getSongGenres
};
