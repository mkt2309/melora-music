const express = require('express');
const router = express.Router();

const {
    getAlbumArtists
} = require('../controllers/albumArtistsController');

router.get('/albums/:albumId/artists', getAlbumArtists);

module.exports = router;
