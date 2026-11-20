const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const usersRoutes = require('./users.routes');
const roomsRoutes = require('./rooms.routes');
const decksRoutes = require('./decks.routes');
const practiceRoutes = require('./practice.routes');
const { doubtsRouter, answersRouter } = require('./doubts.routes');
const leaderboardRoutes = require('./leaderboard.routes');
const dashboardRoutes = require('./dashboard.routes');
const notificationsRoutes = require('./notifications.routes');
const activityRoutes = require('./activity.routes');

router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'EduWrap 2.0 API is operational',
    timestamp: new Date().toISOString(),
  });
});

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'eduwrap-backend',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/rooms', roomsRoutes);
router.use('/decks', decksRoutes);
router.use('/practice', practiceRoutes);
router.use('/doubts', doubtsRouter);
router.use('/answers', answersRouter);
router.use('/leaderboard', leaderboardRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/activity', activityRoutes);

module.exports = router;
