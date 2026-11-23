const supabase = require('../config/supabase');

const checkBackend = (req, res) => {
    res.json({
        message: 'Music Streaming Backend is running!'
    });
};

const checkSupabase = async (req, res) => {
    try {
        const { error } = await supabase
            .from('subscription_plans')
            .select('*')
            .limit(1);

        if (error) {
            console.error('Supabase query error:', error.message);

            return res.status(500).json({
                connected: false,
                message: 'Supabase connection failed.'
            });
        }

        res.json({
            connected: true,
            message: 'Backend is connected to Supabase!'
        });
    } catch (error) {
        console.error('Supabase connection error:', error.message);

        res.status(500).json({
            connected: false,
            message: 'Supabase connection failed.'
        });
    }
};

module.exports = {
    checkBackend,
    checkSupabase
};
