const supabasePublic = require('../config/supabasePublic');
const createUserClient = require('../config/supabaseUser');

// Lấy danh sách playlist
const getPlaylists = async (req, res) => {
    try {
        let supabase;

        if (req.accessToken) {
            supabase = createUserClient(req.accessToken);
        } else {
            supabase = supabasePublic;
        }

        const { data, error } = await supabase
            .from('playlists')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Get playlists error:', error.message);

            return res.status(500).json({
                message: 'Failed to retrieve playlists.'
            });
        }

        res.json({
            message: 'Playlists retrieved successfully.',
            count: data.length,
            playlists: data
        });
    } catch (error) {
        console.error('Get playlists error:', error.message);

        res.status(500).json({
            message: 'Failed to retrieve playlists.'
        });
    }
};

module.exports = {
    getPlaylists
};