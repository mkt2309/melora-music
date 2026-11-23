const supabase = require('../config/supabasePublic');

// Lấy danh sách các gói đăng ký
const getSubscriptionPlans = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('subscription_plans')
            .select('*')
            .order('plan_id', { ascending: true });

        if (error) {
            console.error('Get subscription plans error:', error.message);

            return res.status(500).json({
                message: 'Failed to retrieve subscription plans.'
            });
        }

        res.json({
            message: 'Subscription plans retrieved successfully.',
            count: data.length,
            plans: data
        });
    } catch (error) {
        console.error('Get subscription plans error:', error.message);

        res.status(500).json({
            message: 'Failed to retrieve subscription plans.'
        });
    }
};

module.exports = {
    getSubscriptionPlans
};