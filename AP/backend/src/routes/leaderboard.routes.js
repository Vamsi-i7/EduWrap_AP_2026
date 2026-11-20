const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboard.controller');
const { authenticate } = require('../middleware/auth');

router.get('/rooms/:roomId', authenticate, leaderboardController.getRoomLeaderboard);

module.exports = router;
