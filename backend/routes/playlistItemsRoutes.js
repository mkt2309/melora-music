const express = require('express');
const router = express.Router();

const {
    getPlaylistItems,
    addPlaylistItem,
    updatePlaylistItem,
    deletePlaylistItem
} = require('../controllers/playlistItemsController');

const verifyToken = require('../middleware/authMiddleware');
const optionalAuth = require('../middleware/optionalAuthMiddleware');

router.get('/playlists/:playlistId/items', optionalAuth, getPlaylistItems);
router.post('/playlists/:playlistId/items', verifyToken, addPlaylistItem);
router.put('/playlist-items/:itemId', verifyToken, updatePlaylistItem);
router.delete('/playlist-items/:itemId', verifyToken, deletePlaylistItem);

module.exports = router;
