const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');
const { authenticate } = require('../middleware/auth');

router.get('/profile', authenticate, usersController.getProfile);
router.patch('/profile', authenticate, usersController.updateProfile);
router.get('/:id/stats', usersController.getPublicStats);

module.exports = router;
