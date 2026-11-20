const express = require('express');
const router = express.Router();
const roomsController = require('../controllers/rooms.controller');
const { authenticate, optionalAuth } = require('../middleware/auth');

// Subjects metadata
router.get('/subjects', roomsController.getSubjects);

// Room routes
router.get('/', optionalAuth, roomsController.listRooms);
router.post('/', authenticate, roomsController.createRoom);
router.post('/join-by-code', authenticate, roomsController.joinByCode);

router.get('/:id', authenticate, roomsController.getRoom);
router.patch('/:id', authenticate, roomsController.updateRoom);
router.delete('/:id', authenticate, roomsController.deleteRoom);

router.post('/:id/join', authenticate, roomsController.joinRoom);
router.post('/:id/leave', authenticate, roomsController.leaveRoom);

router.get('/:id/members', authenticate, roomsController.getMembers);
router.delete('/:id/members/:userId', authenticate, roomsController.removeMember);

module.exports = router;
