const express = require('express');
const router = express.Router();

const {
    getFollows,
    followUser,
    unfollowUser
} = require('../controllers/followsController');

const verifyToken = require('../middleware/authMiddleware');
const optionalAuth = require('../middleware/optionalAuthMiddleware');

router.get('/', optionalAuth, getFollows);
router.post('/', verifyToken, followUser);
router.delete('/:followingId', verifyToken, unfollowUser);

module.exports = router;