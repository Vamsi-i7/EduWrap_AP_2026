const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, dashboardController.getDashboardSummary);
router.get('/habit', authenticate, dashboardController.getHabitChart);

module.exports = router;
