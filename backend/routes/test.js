const express = require('express');
const router = express.Router();
const { Test } = require('../controllers/test.controller');

router.get('/', Test);

module.exports = router;