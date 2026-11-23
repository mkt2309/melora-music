const { createClient } = require('@supabase/supabase-js');

const supabaseAuth = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

// Đăng ký tài khoản
const register = async (req, res) => {
    try {
        const { email, password, username } = req.body;

        if (!email || !password || !username) {
            return res.status(400).json({
                message: 'Email, password and username are required.'
            });
        }

        const { data, error } = await supabaseAuth.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username
                }
            }
        });

        if (error) {
            return res.status(400).json({
                message: error.message
            });
        }

        res.status(201).json({
            message: 'Registration request completed.',
            user: data.user,
            session: data.session
        });
    } catch (error) {
        console.error('Registration error:', error.message);

        res.status(500).json({
            message: 'Registration failed.'
        });
    }
};

// Đăng nhập
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: 'Email and password are required.'
            });
        }

        const { data, error } = await supabaseAuth.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return res.status(401).json({
                message: error.message
            });
        }

        res.json({
            message: 'Login successful.',
            user: data.user,
            session: data.session
        });
    } catch (error) {
        console.error('Login error:', error.message);

        res.status(500).json({
            message: 'Login failed.'
        });
    }
};


const getMe = (req, res) => {
    res.json({
        message: 'User authenticated successfully.',
        user: {
            id: req.user.id,
            email: req.user.email,
            created_at: req.user.created_at,
            user_metadata: req.user.user_metadata
        }
    });
};

// Đăng xuất tài khoản
const logout = async (req, res) => {
    try {
        const { error } = await supabaseAuth.auth.admin.signOut(
            req.accessToken,
            'local'
        );

        if (error) {
            console.error('Logout error:', error.message);

            return res.status(400).json({
                message: 'Logout failed.'
            });
        }

        res.json({
            message: 'Logout successful.'
        });
    } catch (error) {
        console.error('Logout error:', error.message);

        res.status(500).json({
            message: 'Logout failed.'
        });
    }
};

// Làm mới Access Token
const refreshToken = async (req, res) => {
    try {
        const { refresh_token } = req.body;

        if (!refresh_token) {
            return res.status(400).json({
                message: 'Refresh token is required.'
            });
        }

        const { data, error } = await supabaseAuth.auth.refreshSession({
            refresh_token
        });

        if (error || !data.session) {
            return res.status(401).json({
                message: 'Invalid or expired refresh token.'
            });
        }

        res.json({
            message: 'Token refreshed successfully.',
            session: data.session
        });
    } catch (error) {
        console.error('Token refresh error:', error.message);

        res.status(500).json({
            message: 'Token refresh failed.'
        });
    }
};

module.exports = {
    register,
    login,
    getMe,
    logout,
    refreshToken
};