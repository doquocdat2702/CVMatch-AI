const express = require('express');
const { success } = require('../utils/response');
const authRoute = require('../modules/auth/auth.route');

const router = express.Router();

router.get('/health', (req, res) => {
  return success(res, null, 'API is running');
});

router.use('/auth', authRoute);

module.exports = router;
