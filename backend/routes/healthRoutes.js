const express = require('express');
const router = express.Router();

const {
    checkBackend,
    checkSupabase
} = require('../controllers/healthController');

router.get('/', checkBackend);
router.get('/supabase', checkSupabase);

module.exports = router;