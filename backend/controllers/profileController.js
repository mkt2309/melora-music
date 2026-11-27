const createUserClient = require('../config/supabaseUser');

// Lấy hồ sơ cá nhân
const getProfile = async (req, res) => {
    try {
        const supabase = createUserClient(req.accessToken);

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', req.user.id)
            .single();

        if (error) {
            console.error('Get profile error:', error.message);

            return res.status(404).json({
                message: 'Profile not found.'
            });
        }

        res.json({
            message: 'Profile retrieved successfully.',
            profile: data
        });
    } catch (error) {
        console.error('Get profile error:', error.message);

        res.status(500).json({
            message: 'Failed to retrieve profile.'
        });
    }
};

// Cập nhật hồ sơ cá nhân
const updateProfile = async (req, res) => {
    try {
        const supabase = createUserClient(req.accessToken);

        const {
            username,
            display_name,
            avatar_url,
            bio
        } = req.body;

        const updates = {};

        if (username !== undefined) updates.username = username;
        if (display_name !== undefined) updates.display_name = display_name;
        if (avatar_url !== undefined) updates.avatar_url = avatar_url;
        if (bio !== undefined) updates.bio = bio;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                message: 'No profile information provided.'
            });
        }

        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (error) {
            console.error('Update profile error:', error.message);

            return res.status(400).json({
                message: 'Failed to update profile.'
            });
        }

        res.json({
            message: 'Profile updated successfully.',
            profile: data
        });
    } catch (error) {
        console.error('Update profile error:', error.message);

        res.status(500).json({
            message: 'Failed to update profile.'
        });
    }
};

module.exports = {
    getProfile,
    updateProfile
};