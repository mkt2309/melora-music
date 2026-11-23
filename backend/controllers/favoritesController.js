const createUserClient = require('../config/supabaseUser');

// Lấy danh sách bài hát yêu thích
const getFavorites = async (req, res) => {
    try {
        const supabase = createUserClient(req.accessToken);

        const { data, error } = await supabase
            .from('favorites')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Get favorites error:', error.message);

            return res.status(500).json({
                message: 'Failed to retrieve favorites.'
            });
        }

        res.json({
            message: 'Favorites retrieved successfully.',
            count: data.length,
            favorites: data
        });
    } catch (error) {
        console.error('Get favorites error:', error.message);

        res.status(500).json({
            message: 'Failed to retrieve favorites.'
        });
    }
};

// Thêm bài hát vào danh sách yêu thích
const addFavorite = async (req, res) => {
    try {
        const supabase = createUserClient(req.accessToken);
        const { song_id } = req.body;

        if (!song_id || !Number.isInteger(Number(song_id)) || Number(song_id) <= 0) {
            return res.status(400).json({
                message: 'A valid song_id is required.'
            });
        }

        const { data, error } = await supabase
            .from('favorites')
            .insert({
                user_id: req.user.id,
                song_id: Number(song_id)
            })
            .select()
            .single();

        if (error) {
            console.error('Add favorite error:', error.message);

            return res.status(500).json({
                message: 'Failed to add favorite.'
            });
        }

        res.status(201).json({
            message: 'Favorite added successfully.',
            favorite: data
        });
    } catch (error) {
        console.error('Add favorite error:', error.message);

        res.status(500).json({
            message: 'Failed to add favorite.'
        });
    }
};

// Xóa bài hát khỏi danh sách yêu thích
const removeFavorite = async (req, res) => {
    try {
        const supabase = createUserClient(req.accessToken);
        const songId = Number(req.params.songId);

        if (!Number.isInteger(songId) || songId <= 0) {
            return res.status(400).json({
                message: 'A valid songId is required.'
            });
        }

        const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('user_id', req.user.id)
            .eq('song_id', songId);

        if (error) {
            console.error('Remove favorite error:', error.message);

            return res.status(500).json({
                message: 'Failed to remove favorite.'
            });
        }

        res.json({
            message: 'Favorite removed successfully.'
        });
    } catch (error) {
        console.error('Remove favorite error:', error.message);

        res.status(500).json({
            message: 'Failed to remove favorite.'
        });
    }
};

module.exports = {
    getFavorites,
    addFavorite,
    removeFavorite
};