const express = require('express');
const router = express.Router();

const {
    getPlaylists,
    createPlaylist,
    deletePlaylist
} = require('../controllers/playlistsController');

const verifyToken = require('../middleware/authMiddleware');
const optionalAuth = require('../middleware/optionalAuthMiddleware');

router.get('/', optionalAuth, getPlaylists);
router.post('/', verifyToken, createPlaylist);
router.delete('/:id', verifyToken, deletePlaylist);

module.exports = router;
