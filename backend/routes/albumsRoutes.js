const express = require('express');
const router = express.Router();

const {
    getAlbums
} = require('../controllers/albumsController');

router.get('/', getAlbums);

module.exports = router;