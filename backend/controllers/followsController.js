const supabasePublic = require('../config/supabasePublic');
const createUserClient = require('../config/supabaseUser');

// Lấy danh sách lượt theo dõi
const getFollows = async (req, res) => {
    try {
        let supabase;

        if (req.accessToken) {
            supabase = createUserClient(req.accessToken);
        } else {
            supabase = supabasePublic;
        }

        const { data, error } = await supabase
            .from('follows')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Get follows error:', error.message);

            return res.status(500).json({
                message: 'Failed to retrieve follows.'
            });
        }

        res.json({
            message: 'Follows retrieved successfully.',
            count: data.length,
            follows: data
        });
    } catch (error) {
        console.error('Get follows error:', error.message);

        res.status(500).json({
            message: 'Failed to retrieve follows.'
        });
    }
};

// Theo dõi người dùng khác
const followUser = async (req, res) => {
    try {
        const supabase = createUserClient(req.accessToken);
        const followingId = req.body.following_id;

        if (
            typeof followingId !== 'string' ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(followingId)
        ) {
            return res.status(400).json({
                message: 'A valid following_id is required.'
            });
        }

        if (followingId === req.user.id) {
            return res.status(400).json({
                message: 'You cannot follow yourself.'
            });
        }

        const { data, error } = await supabase
            .from('follows')
            .insert({
                follower_id: req.user.id,
                following_id: followingId
            })
            .select()
            .single();

        if (error) {
            console.error('Follow user error:', error.message);

            return res.status(500).json({
                message: 'Failed to follow user.'
            });
        }

        res.status(201).json({
            message: 'User followed successfully.',
            follow: data
        });
    } catch (error) {
        console.error('Follow user error:', error.message);

        res.status(500).json({
            message: 'Failed to follow user.'
        });
    }
};

// Bỏ theo dõi người dùng
const unfollowUser = async (req, res) => {
    try {
        const supabase = createUserClient(req.accessToken);
        const followingId = req.params.followingId;

        if (
            typeof followingId !== 'string' ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(followingId)
        ) {
            return res.status(400).json({
                message: 'A valid followingId is required.'
            });
        }

        const { error } = await supabase
            .from('follows')
            .delete()
            .eq('follower_id', req.user.id)
            .eq('following_id', followingId);

        if (error) {
            console.error('Unfollow user error:', error.message);

            return res.status(500).json({
                message: 'Failed to unfollow user.'
            });
        }

        res.json({
            message: 'User unfollowed successfully.'
        });
    } catch (error) {
        console.error('Unfollow user error:', error.message);

        res.status(500).json({
            message: 'Failed to unfollow user.'
        });
    }
};

module.exports = {
    getFollows,
    followUser,
    unfollowUser
};