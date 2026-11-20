const express = require('express');
const router = express.Router();
const practiceController = require('../controllers/practice.controller');
const { authenticate } = require('../middleware/auth');

router.get('/:deckId/due', authenticate, practiceController.getDueCards);
router.post('/:deckId/submit', authenticate, practiceController.submitSession);

module.exports = router;
