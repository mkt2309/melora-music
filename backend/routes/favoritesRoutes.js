const express = require('express');
const router = express.Router();

const {
    getFavorites,
    addFavorite,
    removeFavorite
} = require('../controllers/favoritesController');

const verifyToken = require('../middleware/authMiddleware');

router.get('/', verifyToken, getFavorites);
router.post('/', verifyToken, addFavorite);
router.delete('/:songId', verifyToken, removeFavorite);

module.exports = router;