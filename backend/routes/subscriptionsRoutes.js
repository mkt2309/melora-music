const express = require('express');
const router = express.Router();

const {
    getSubscriptions
} = require('../controllers/subscriptionsController');

const verifyToken = require('../middleware/authMiddleware');

router.get('/', verifyToken, getSubscriptions);

module.exports = router;