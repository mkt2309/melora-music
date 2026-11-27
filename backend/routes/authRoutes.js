const express = require('express');
const router = express.Router();

const {
    register,
    login,
    getMe,
    logout,
    refreshToken
} = require('../controllers/authController');

const verifyToken = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', verifyToken, getMe);
router.post('/logout', verifyToken, logout);
router.post('/refresh', refreshToken);

module.exports = router;