const express = require('express');
const router = express.Router();
const notifController = require('../controllers/notifications.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, notifController.getNotifications);
router.get('/unread-count', authenticate, notifController.getUnreadCount);
router.patch('/:id/read', authenticate, notifController.markAsRead);
router.post('/mark-all-read', authenticate, notifController.markAllAsRead);

module.exports = router;
