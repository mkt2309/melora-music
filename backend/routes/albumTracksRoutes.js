const express = require('express');
const router = express.Router();

const {
    getAlbumTracks
} = require('../controllers/albumTracksController');

router.get('/albums/:albumId/tracks', getAlbumTracks);

module.exports = router;
