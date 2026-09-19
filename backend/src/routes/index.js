const express = require('express');
const { success } = require('../utils/response');

const router = express.Router();

router.get('/health', (req, res) => {
  return success(res, null, 'API is running');
});

module.exports = router;
