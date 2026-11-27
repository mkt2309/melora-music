const express = require('express');
const router = express.Router();

const {
    getSubscriptionPlans
} = require('../controllers/subscriptionPlansController');

router.get('/', getSubscriptionPlans);

module.exports = router;