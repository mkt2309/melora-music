const createUserClient = require('../config/supabaseUser');

// Lấy danh sách gói đăng ký của người dùng
const getSubscriptions = async (req, res) => {
    try {
        const supabase = createUserClient(req.accessToken);

        const { data, error } = await supabase
            .from('user_subscriptions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Get subscriptions error:', error.message);

            return res.status(500).json({
                message: 'Failed to retrieve subscriptions.'
            });
        }

        res.json({
            message: 'Subscriptions retrieved successfully.',
            count: data.length,
            subscriptions: data
        });
    } catch (error) {
        console.error('Get subscriptions error:', error.message);

        res.status(500).json({
            message: 'Failed to retrieve subscriptions.'
        });
    }
};

module.exports = {
    getSubscriptions
};