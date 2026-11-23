const supabase = require('../config/supabasePublic');

// Lấy danh sách nghệ sĩ
const getArtists = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('artists')
            .select('artist_id, name, bio, image_url, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Get artists error:', error.message);
            return res.status(500).json({
                message: 'Failed to retrieve artists.'
            });
        }

        const artists = data.map((artist) => ({
            id: artist.artist_id,
            artist_id: artist.artist_id,
            name: artist.name,
            bio: artist.bio,
            image_url: artist.image_url
        }));

        return res.json({
            message: 'Artists retrieved successfully.',
            count: artists.length,
            artists
        });
    } catch (error) {
        console.error('Get artists error:', error.message);
        return res.status(500).json({
            message: 'Failed to retrieve artists.'
        });
    }
};

module.exports = {
    getArtists
};
