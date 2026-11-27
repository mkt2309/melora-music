const express = require('express');
const router = express.Router();

const {
    getArtistFollows,
    followArtist,
    unfollowArtist
} = require('../controllers/artistFollowsController');

const verifyToken = require('../middleware/authMiddleware');
const optionalAuth = require('../middleware/optionalAuthMiddleware');

router.get('/', optionalAuth, getArtistFollows);
router.post('/', verifyToken, followArtist);
router.delete('/:artistId', verifyToken, unfollowArtist);

module.exports = router;