const express = require('express');
const router = express.Router();

const {
    getListeningHistory,
    addListeningHistory,
    updateListeningHistory,
    deleteListeningHistory
} = require('../controllers/listeningHistoryController');

const verifyToken = require('../middleware/authMiddleware');

router.get('/', verifyToken, getListeningHistory);
router.post('/', verifyToken, addListeningHistory);
router.patch('/:historyId', verifyToken, updateListeningHistory);
router.delete('/:historyId', verifyToken, deleteListeningHistory);

module.exports = router;