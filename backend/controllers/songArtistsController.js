const supabasePublic = require('../config/supabasePublic');

// Lấy danh sách nghệ sĩ của một bài hát
const getSongArtists = async (req, res) => {
    try {
        const songId = req.params.songId;

        if (!/^[1-9]\d*$/.test(songId)) {
            return res.status(400).json({
                message: 'A valid songId is required.'
            });
        }

        const { data, error } = await supabasePublic
            .from('song_artists')
            .select('*')
            .eq('song_id', songId)
            .order('artist_order', { ascending: true, nullsFirst: false });

        if (error) {
            console.error('Get song artists error:', error.message);

            return res.status(500).json({
                message: 'Failed to retrieve song artists.'
            });
        }

        res.json({
            message: 'Song artists retrieved successfully.',
            count: data.length,
            artists: data
        });
    } catch (error) {
        console.error('Get song artists error:', error.message);

        res.status(500).json({
            message: 'Failed to retrieve song artists.'
        });
    }
};

module.exports = {
    getSongArtists
};
