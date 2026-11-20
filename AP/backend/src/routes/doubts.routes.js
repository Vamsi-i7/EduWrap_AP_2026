const express = require('express');
const router = express.Router();
const doubtsController = require('../controllers/doubts.controller');
const { authenticate } = require('../middleware/auth');

// Doubts routes
router.get('/', authenticate, doubtsController.listDoubts);
router.post('/', authenticate, doubtsController.createDoubt);

router.get('/:id', authenticate, doubtsController.getDoubt);
router.patch('/:id', authenticate, doubtsController.updateDoubt);
router.delete('/:id', authenticate, doubtsController.deleteDoubt);

// Answers subroutes
router.post('/:id/answers', authenticate, doubtsController.createAnswer);

// Answer actions (mounted directly or under answers)
const answersRouter = express.Router();
answersRouter.post('/:id/upvote', authenticate, doubtsController.toggleUpvote);
answersRouter.post('/:id/accept', authenticate, doubtsController.toggleAcceptAnswer);
answersRouter.put('/:id/accept', authenticate, doubtsController.toggleAcceptAnswer);
answersRouter.post('/:id/save-as-card', authenticate, doubtsController.saveAsCard);
answersRouter.delete('/:id', authenticate, doubtsController.deleteAnswer);

module.exports = {
  doubtsRouter: router,
  answersRouter,
};
