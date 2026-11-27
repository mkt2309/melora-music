const { createClient } = require('@supabase/supabase-js');

// Client dùng publishable key cho các thao tác xác thực thông thường.
const supabaseAuth = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

// Client đặc quyền chỉ dùng cho thao tác thu hồi phiên ở phía máy chủ.
const supabaseAdmin = createClient(
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
        const email = typeof req.body.email === 'string'
            ? req.body.email.trim().toLowerCase()
            : '';
        const password = typeof req.body.password === 'string'
            ? req.body.password
            : '';
        const username = typeof req.body.username === 'string'
            ? req.body.username.trim()
            : '';

        if (!email || !password || !username) {
            return res.status(400).json({
                message: 'Email, password and username are required.'
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                message: 'A valid email address is required.'
            });
        }

        if (password.length < 8 || password.length > 72) {
            return res.status(400).json({
                message: 'Password must contain between 8 and 72 characters.'
            });
        }

        if (username.length < 3 || username.length > 30) {
            return res.status(400).json({
                message: 'Username must contain between 3 and 30 characters.'
            });
        }

        const { data, error } = await supabaseAuth.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username,
                    display_name: username
                }
            }
        });

        if (error) {
            return res.status(400).json({
                message: error.message
            });
        }

        return res.status(201).json({
            message: data.session
                ? 'Registration successful.'
                : 'Registration received. Confirm your email to sign in.',
            user: data.user,
            session: data.session
        });
    } catch (error) {
        console.error('Registration error:', error.message);
        return res.status(500).json({
            message: 'Registration failed.'
        });
    }
};

// Đăng nhập
const login = async (req, res) => {
    try {
        const email = typeof req.body.email === 'string'
            ? req.body.email.trim().toLowerCase()
            : '';
        const password = typeof req.body.password === 'string'
            ? req.body.password
            : '';

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

        return res.json({
            message: 'Login successful.',
            user: data.user,
            session: data.session
        });
    } catch (error) {
        console.error('Login error:', error.message);
        return res.status(500).json({
            message: 'Login failed.'
        });
    }
};

// Lấy thông tin tài khoản hiện tại
const getMe = (req, res) => {
    return res.json({
        message: 'User authenticated successfully.',
        user: {
            id: req.user.id,
            email: req.user.email,
            created_at: req.user.created_at,
            user_metadata: req.user.user_metadata
        }
    });
};

// Đăng xuất tài khoản và thu hồi phiên hiện tại
const logout = async (req, res) => {
    try {
        const { error } = await supabaseAdmin.auth.admin.signOut(
            req.accessToken,
            'local'
        );

        if (error) {
            console.error('Logout error:', error.message);
            return res.status(400).json({
                message: 'Logout failed.'
            });
        }

        return res.json({
            message: 'Logout successful.'
        });
    } catch (error) {
        console.error('Logout error:', error.message);
        return res.status(500).json({
            message: 'Logout failed.'
        });
    }
};

// Làm mới Access Token
const refreshToken = async (req, res) => {
    try {
        const refresh_token = typeof req.body.refresh_token === 'string'
            ? req.body.refresh_token
            : '';

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

        return res.json({
            message: 'Token refreshed successfully.',
            session: data.session
        });
    } catch (error) {
        console.error('Token refresh error:', error.message);
        return res.status(500).json({
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
