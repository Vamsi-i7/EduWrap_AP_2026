const db = require('../config/db');
const { BadRequestError, ForbiddenError, NotFoundError } = require('../utils/errors');
const { success } = require('../utils/response');

// Helper to check user visibility on a deck
async function canAccessDeck(deckId, userId) {
  const querySql = `
    SELECT d.deck_id,
           d.title,
           d.description,
           d.subject_id,
           d.visibility,
           d.owner_id,
           d.room_id,
           d.created_at,
           (d.owner_id = $2) AS is_owner,
           CASE
             WHEN d.visibility = 'public' THEN true
             WHEN d.owner_id = $2 THEN true
             WHEN d.visibility = 'room' AND rm.user_id IS NOT NULL THEN true
             ELSE false
           END AS can_access
    FROM decks d
    LEFT JOIN room_members rm ON rm.room_id = d.room_id AND rm.user_id = $2
    WHERE d.deck_id = $1;
  `;
  const result = await db.query(querySql, [deckId, userId || -1]);
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

// @W10 -- CREATE DECK
async function createDeck(req, res, next) {
  try {
    const userId = req.user.userId;
    const { title, description = null, subject_id, visibility = 'private', room_id = null } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 80) {
      throw new BadRequestError('Title must be between 3 and 80 characters');
    }
    const parsedSubjectId = parseInt(subject_id, 10);
    if (isNaN(parsedSubjectId)) {
      throw new BadRequestError('Valid subject_id is required');
    }
    if (!['private', 'room', 'public'].includes(visibility)) {
      throw new BadRequestError('Visibility must be private, room, or public');
    }

    let parsedRoomId = null;
    if (visibility === 'room') {
      if (!room_id) {
        throw new BadRequestError('room_id is required when deck visibility is "room"');
      }
      parsedRoomId = parseInt(room_id, 10);
      // Check user is a member of the room
      const memCheck = await db.query(
        'SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2',
        [parsedRoomId, userId]
      );
      if (memCheck.rows.length === 0) {
        throw new ForbiddenError('You can only create room decks for rooms you belong to');
      }
    } else {
      if (room_id) {
        throw new BadRequestError('room_id must be null for private or public decks');
      }
    }

    const insertSql = `
      INSERT INTO decks (title, description, subject_id, visibility, owner_id, room_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING deck_id, title, description, subject_id, visibility, owner_id, room_id, created_at;
    `;
    const result = await db.query(insertSql, [
      title.trim(),
      description ? description.trim() : null,
      parsedSubjectId,
      visibility,
      userId,
      parsedRoomId,
    ]);

    return success(res, { deck: result.rows[0] }, 201, 'Deck created successfully');
  } catch (err) {
    next(err);
  }
}

// @R10 -- LIST DECKS WITH FILTERS AND PAGINATION
async function listDecks(req, res, next) {
  try {
    const userId = req.user ? req.user.userId : -1;
    const { subject_id, visibility, room_id, mine, q, page = 1, limit = 12 } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
    const offset = (parsedPage - 1) * parsedLimit;

    // Conditions: user can only see public decks, decks in rooms they belong to, or their own decks
    let conditions = [
      `(d.visibility = 'public' OR d.owner_id = $1 OR (d.visibility = 'room' AND rm.user_id IS NOT NULL))`
    ];
    const params = [userId];
    let pIdx = 2;

    if (mine === 'true') {
      conditions.push(`d.owner_id = $1`);
    }
    if (visibility) {
      conditions.push(`d.visibility = $${pIdx++}`);
      params.push(visibility);
    }
    if (subject_id) {
      conditions.push(`d.subject_id = $${pIdx++}`);
      params.push(parseInt(subject_id, 10));
    }
    if (room_id) {
      conditions.push(`d.room_id = $${pIdx++}`);
      params.push(parseInt(room_id, 10));
    }
    if (q && q.trim()) {
      conditions.push(`d.title ILIKE $${pIdx++}`);
      params.push(`%${q.trim()}%`);
    }

    const whereClause = conditions.join(' AND ');

    // Total count
    const countSql = `
      SELECT COUNT(DISTINCT d.deck_id)::integer AS total
      FROM decks d
      LEFT JOIN room_members rm ON rm.room_id = d.room_id AND rm.user_id = $1
      WHERE ${whereClause};
    `;
    const countRes = await db.query(countSql, params);
    const total = countRes.rows[0].total;

    // Paginated list (@R10)
    const listSql = `
      SELECT d.deck_id,
             d.title,
             d.description,
             d.visibility,
             d.room_id,
             d.created_at,
             s.subject_id,
             s.name        AS subject_name,
             u.user_id     AS owner_id,
             u.name        AS owner_name,
             COUNT(c.card_id)::integer AS card_count,
             (d.owner_id = $1) AS is_owner
      FROM decks d
      JOIN subjects s            ON s.subject_id = d.subject_id
      JOIN users u               ON u.user_id = d.owner_id
      LEFT JOIN room_members rm  ON rm.room_id = d.room_id AND rm.user_id = $1
      LEFT JOIN cards c          ON c.deck_id = d.deck_id
      WHERE ${whereClause}
      GROUP BY d.deck_id, d.title, d.description, d.visibility, d.room_id, d.created_at, s.subject_id, s.name, u.user_id, u.name
      ORDER BY d.created_at DESC
      LIMIT $${pIdx++} OFFSET $${pIdx++};
    `;
    params.push(parsedLimit, offset);

    const result = await db.query(listSql, params);

    return success(res, {
      decks: result.rows,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
}

// @R11 -- GET DECK DETAILS
async function getDeck(req, res, next) {
  try {
    const deckId = parseInt(req.params.id, 10);
    const userId = req.user ? req.user.userId : -1;
    if (isNaN(deckId)) throw new BadRequestError('Invalid deck ID');

    const deck = await canAccessDeck(deckId, userId);
    if (!deck) throw new NotFoundError('Deck not found');
    if (!deck.can_access) throw new ForbiddenError('You do not have access to this deck');

    const countRes = await db.query('SELECT COUNT(card_id)::integer AS card_count FROM cards WHERE deck_id = $1', [deckId]);
    deck.card_count = countRes.rows[0].card_count;

    return success(res, { deck });
  } catch (err) {
    next(err);
  }
}

// @W11 -- UPDATE DECK (OWNER ONLY)
async function updateDeck(req, res, next) {
  try {
    const deckId = parseInt(req.params.id, 10);
    const userId = req.user.userId;
    const { title, description, subject_id, visibility, room_id } = req.body;

    const deck = await canAccessDeck(deckId, userId);
    if (!deck) throw new NotFoundError('Deck not found');
    if (!deck.is_owner) throw new ForbiddenError('Only the deck owner can modify this deck');

    const updates = [];
    const params = [];
    let pIdx = 1;

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 80) {
        throw new BadRequestError('Title must be between 3 and 80 characters');
      }
      updates.push(`title = $${pIdx++}`);
      params.push(title.trim());
    }

    if (description !== undefined) {
      updates.push(`description = $${pIdx++}`);
      params.push(description ? description.trim() : null);
    }

    if (subject_id !== undefined) {
      const parsedSub = parseInt(subject_id, 10);
      if (isNaN(parsedSub)) throw new BadRequestError('Invalid subject_id');
      updates.push(`subject_id = $${pIdx++}`);
      params.push(parsedSub);
    }

    if (visibility !== undefined) {
      if (!['private', 'room', 'public'].includes(visibility)) {
        throw new BadRequestError('Invalid visibility');
      }
      updates.push(`visibility = $${pIdx++}`);
      params.push(visibility);

      if (visibility === 'room') {
        const targetRoom = room_id !== undefined ? room_id : deck.room_id;
        if (!targetRoom) throw new BadRequestError('room_id required for room visibility');
        updates.push(`room_id = $${pIdx++}`);
        params.push(targetRoom);
      } else {
        updates.push(`room_id = NULL`);
      }
    }

    if (updates.length === 0) throw new BadRequestError('No valid fields provided to update');

    params.push(deckId);
    const updateSql = `
      UPDATE decks
      SET ${updates.join(', ')}
      WHERE deck_id = $${pIdx}
      RETURNING deck_id, title, description, subject_id, visibility, room_id, created_at;
    `;
    const result = await db.query(updateSql, params);

    return success(res, { deck: result.rows[0] }, 200, 'Deck updated successfully');
  } catch (err) {
    next(err);
  }
}

// @W12 -- DELETE DECK (OWNER ONLY)
async function deleteDeck(req, res, next) {
  try {
    const deckId = parseInt(req.params.id, 10);
    const userId = req.user.userId;

    const deck = await canAccessDeck(deckId, userId);
    if (!deck) throw new NotFoundError('Deck not found');
    if (!deck.is_owner) throw new ForbiddenError('Only the deck owner can delete this deck');

    await db.query('DELETE FROM decks WHERE deck_id = $1', [deckId]);
    return success(res, { deleted_deck_id: deckId }, 200, 'Deck deleted successfully');
  } catch (err) {
    next(err);
  }
}

// @R13 -- LIST CARDS IN A DECK
async function getCards(req, res, next) {
  try {
    const deckId = parseInt(req.params.id, 10);
    const userId = req.user ? req.user.userId : -1;
    if (isNaN(deckId)) throw new BadRequestError('Invalid deck ID');

    const deck = await canAccessDeck(deckId, userId);
    if (!deck) throw new NotFoundError('Deck not found');
    if (!deck.can_access) throw new ForbiddenError('You do not have access to this deck');

    const cardsSql = `
      SELECT c.card_id,
             c.deck_id,
             c.front,
             c.back,
             c.source_answer_id,
             c.created_at
      FROM cards c
      WHERE c.deck_id = $1
      ORDER BY c.card_id ASC;
    `;
    const result = await db.query(cardsSql, [deckId]);
    return success(res, { cards: result.rows });
  } catch (err) {
    next(err);
  }
}

// @W14 -- ADD CARD TO DECK (OWNER ONLY, MAX 200)
async function addCard(req, res, next) {
  try {
    const deckId = parseInt(req.params.id, 10);
    const userId = req.user.userId;
    const { front, back, source_answer_id = null } = req.body;

    const deck = await canAccessDeck(deckId, userId);
    if (!deck) throw new NotFoundError('Deck not found');
    if (!deck.is_owner) throw new ForbiddenError('Only the deck owner can add cards');

    if (!front || typeof front !== 'string' || front.length > 500) {
      throw new BadRequestError('Card front is required and must be 500 characters or less');
    }
    if (!back || typeof back !== 'string' || back.length > 1000) {
      throw new BadRequestError('Card back is required and must be 1000 characters or less');
    }

    // Check 200 cards limit
    const countRes = await db.query('SELECT COUNT(card_id)::integer AS total FROM cards WHERE deck_id = $1', [deckId]);
    if (countRes.rows[0].total >= 200) {
      throw new BadRequestError('A deck can hold at most 200 cards');
    }

    const insertSql = `
      INSERT INTO cards (deck_id, front, back, source_answer_id)
      VALUES ($1, $2, $3, $4)
      RETURNING card_id, deck_id, front, back, source_answer_id, created_at;
    `;
    const result = await db.query(insertSql, [
      deckId,
      front.trim(),
      back.trim(),
      source_answer_id ? parseInt(source_answer_id, 10) : null,
    ]);

    return success(res, { card: result.rows[0] }, 201, 'Card created successfully');
  } catch (err) {
    next(err);
  }
}

// @W15 -- EDIT CARD (OWNER ONLY)
async function updateCard(req, res, next) {
  try {
    const deckId = parseInt(req.params.id, 10);
    const cardId = parseInt(req.params.cardId, 10);
    const userId = req.user.userId;
    const { front, back } = req.body;

    const deck = await canAccessDeck(deckId, userId);
    if (!deck) throw new NotFoundError('Deck not found');
    if (!deck.is_owner) throw new ForbiddenError('Only the deck owner can edit cards');

    const updates = [];
    const params = [];
    let pIdx = 1;

    if (front !== undefined) {
      if (typeof front !== 'string' || front.length > 500) {
        throw new BadRequestError('Card front must be 500 characters or less');
      }
      updates.push(`front = $${pIdx++}`);
      params.push(front.trim());
    }

    if (back !== undefined) {
      if (typeof back !== 'string' || back.length > 1000) {
        throw new BadRequestError('Card back must be 1000 characters or less');
      }
      updates.push(`back = $${pIdx++}`);
      params.push(back.trim());
    }

    if (updates.length === 0) throw new BadRequestError('Nothing to update');

    params.push(cardId, deckId);
    const updateSql = `
      UPDATE cards
      SET ${updates.join(', ')}
      WHERE card_id = $${pIdx++} AND deck_id = $${pIdx}
      RETURNING card_id, deck_id, front, back, source_answer_id, created_at;
    `;
    const result = await db.query(updateSql, params);
    if (result.rows.length === 0) throw new NotFoundError('Card not found in this deck');

    return success(res, { card: result.rows[0] }, 200, 'Card updated successfully');
  } catch (err) {
    next(err);
  }
}

// @W16 -- DELETE CARD (OWNER ONLY)
async function deleteCard(req, res, next) {
  try {
    const deckId = parseInt(req.params.id, 10);
    const cardId = parseInt(req.params.cardId, 10);
    const userId = req.user.userId;

    const deck = await canAccessDeck(deckId, userId);
    if (!deck) throw new NotFoundError('Deck not found');
    if (!deck.is_owner) throw new ForbiddenError('Only the deck owner can delete cards');

    const delRes = await db.query('DELETE FROM cards WHERE card_id = $1 AND deck_id = $2 RETURNING card_id', [cardId, deckId]);
    if (delRes.rows.length === 0) throw new NotFoundError('Card not found in this deck');

    return success(res, { deleted_card_id: cardId }, 200, 'Card deleted successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createDeck,
  listDecks,
  getDeck,
  updateDeck,
  deleteDeck,
  getCards,
  addCard,
  updateCard,
  deleteCard,
};
