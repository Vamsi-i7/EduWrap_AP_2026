const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');
const { authenticate } = require('../middleware/auth');

router.get('/feed', authenticate, activityController.getFeed);
router.get('/rooms/:roomId', authenticate, activityController.getRoomFeed);

module.exports = router;
