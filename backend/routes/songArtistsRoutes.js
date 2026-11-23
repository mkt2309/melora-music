const express = require('express');
const router = express.Router();

const {
    getSongArtists
} = require('../controllers/songArtistsController');

router.get('/songs/:songId/artists', getSongArtists);

module.exports = router;
