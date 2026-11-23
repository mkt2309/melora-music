const express = require('express');
const router = express.Router();

const {
    getPlaylists
} = require('../controllers/playlistsController');

const optionalAuth = require('../middleware/optionalAuthMiddleware');

router.get('/', optionalAuth, getPlaylists);

module.exports = router;