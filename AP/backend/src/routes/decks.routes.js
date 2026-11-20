const express = require('express');
const router = express.Router();
const decksController = require('../controllers/decks.controller');
const { authenticate, optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, decksController.listDecks);
router.post('/', authenticate, decksController.createDeck);

router.get('/:id', optionalAuth, decksController.getDeck);
router.patch('/:id', authenticate, decksController.updateDeck);
router.put('/:id', authenticate, decksController.updateDeck);
router.delete('/:id', authenticate, decksController.deleteDeck);

// Card subroutes
router.get('/:id/cards', optionalAuth, decksController.getCards);
router.post('/:id/cards', authenticate, decksController.addCard);
router.patch('/:id/cards/:cardId', authenticate, decksController.updateCard);
router.delete('/:id/cards/:cardId', authenticate, decksController.deleteCard);

module.exports = router;
