const express = require('express');
const router = express.Router();

const {
    getSongGenres
} = require('../controllers/songGenresController');

router.get('/songs/:songId/genres', getSongGenres);

module.exports = router;
