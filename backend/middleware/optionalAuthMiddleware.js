const supabase = require('../config/supabase');

const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return next();
        }

        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message: 'Invalid authorization format.'
            });
        }

        const token = authHeader.split(' ')[1];

        const { data, error } = await supabase.auth.getUser(token);

        if (error || !data.user) {
            return res.status(401).json({
                message: 'Invalid or expired access token.'
            });
        }

        req.user = data.user;
        req.accessToken = token;

        next();
    } catch (error) {
        console.error('Optional authentication error:', error.message);

        res.status(500).json({
            message: 'Authentication verification failed.'
        });
    }
};

module.exports = optionalAuth;