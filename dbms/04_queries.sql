SET search_path TO eduwrap, public;

-- @R01 -- READ
SELECT u.user_id,
       u.name,
       u.email,
       u.password_hash,
       u.daily_goal,
       u.created_at
FROM users u
WHERE u.email = 'asha@mail.com';

-- @R02 -- READ
SELECT u.user_id,
       u.name,
       u.email,
       u.daily_goal,
       u.created_at,
       COALESCE(SUM(pe.points), 0) AS total_points,
       COUNT(DISTINCT ub.badge_id) AS badges_count,
       COUNT(DISTINCT rm.room_id)  AS rooms_joined,
       COUNT(DISTINCT d.deck_id)   AS decks_created
FROM users u
LEFT JOIN points_events pe ON pe.user_id = u.user_id
LEFT JOIN user_badges ub   ON ub.user_id = u.user_id
LEFT JOIN room_members rm  ON rm.user_id = u.user_id
LEFT JOIN decks d          ON d.owner_id = u.user_id
WHERE u.user_id = 1
GROUP BY u.user_id, u.name, u.email, u.daily_goal, u.created_at;

-- @R03 -- READ
SELECT u.user_id,
       u.name,
       u.daily_goal,
       u.created_at
FROM users u
WHERE u.user_id = 1;

-- @W01 -- WRITE
INSERT INTO users (name, email, password_hash, daily_goal)
VALUES ('Kavya Iyer', 'kavya@mail.com', '$2b$10$e8wF3Q...hash', 20)
RETURNING user_id, name, email, daily_goal, created_at;

-- @W02 -- WRITE
UPDATE users
SET daily_goal = 30
WHERE user_id = 1;

-- @W03 -- WRITE
UPDATE users
SET name = 'Asha Sharma'
WHERE user_id = 1;

-- @R04 -- READ
SELECT s.subject_id,
       s.name AS subject_name,
       COUNT(DISTINCT r.room_id) AS total_rooms,
       COUNT(DISTINCT d.deck_id) AS total_decks
FROM subjects s
LEFT JOIN rooms r ON r.subject_id = s.subject_id
LEFT JOIN decks d ON d.subject_id = s.subject_id
GROUP BY s.subject_id, s.name
ORDER BY s.name ASC;

-- @W04 -- WRITE
INSERT INTO subjects (name)
VALUES ('Operating Systems')
RETURNING subject_id, name;

-- @R05 -- READ
SELECT r.room_id,
       r.name        AS room_name,
       r.description AS room_description,
       r.visibility,
       r.invite_code,
       r.created_at,
       s.name        AS subject_name,
       u.name        AS owner_name,
       COUNT(rm.user_id) AS member_count
FROM rooms r
JOIN subjects s     ON s.subject_id = r.subject_id
JOIN users u        ON u.user_id = r.owner_id
LEFT JOIN room_members rm ON rm.room_id = r.room_id
WHERE r.visibility = 'public'
GROUP BY r.room_id, r.name, r.description, r.visibility, r.invite_code, r.created_at, s.name, u.name
ORDER BY member_count DESC, r.created_at DESC;

-- @R06 -- READ
SELECT r.room_id,
       r.name        AS room_name,
       r.description AS room_description,
       r.visibility,
       r.invite_code,
       r.created_at,
       s.name        AS subject_name,
       u.user_id     AS owner_id,
       u.name        AS owner_name,
       COUNT(DISTINCT rm.user_id) AS member_count,
       COUNT(DISTINCT d.doubt_id) AS doubt_count,
       COUNT(DISTINCT dk.deck_id) AS shared_deck_count
FROM rooms r
JOIN subjects s           ON s.subject_id = r.subject_id
JOIN users u              ON u.user_id = r.owner_id
LEFT JOIN room_members rm ON rm.room_id = r.room_id
LEFT JOIN doubts d        ON d.room_id = r.room_id
LEFT JOIN decks dk        ON dk.room_id = r.room_id
WHERE r.room_id = 1
GROUP BY r.room_id, r.name, r.description, r.visibility, r.invite_code, r.created_at, s.name, u.user_id, u.name;

-- @R07 -- READ
SELECT r.room_id,
       r.name        AS room_name,
       r.description AS room_description,
       r.visibility,
       r.invite_code,
       s.name        AS subject_name,
       u.name        AS owner_name
FROM rooms r
JOIN subjects s ON s.subject_id = r.subject_id
JOIN users u    ON u.user_id = r.owner_id
WHERE r.invite_code = 'JOIN1234';

-- @R08 -- READ
SELECT r.room_id,
       r.name        AS room_name,
       r.description AS room_description,
       r.visibility,
       my_rm.joined_at,
       s.name        AS subject_name,
       u.name        AS owner_name,
       COUNT(all_rm.user_id) AS total_members
FROM room_members my_rm
JOIN rooms r             ON r.room_id = my_rm.room_id
JOIN subjects s          ON s.subject_id = r.subject_id
JOIN users u             ON u.user_id = r.owner_id
LEFT JOIN room_members all_rm ON all_rm.room_id = r.room_id
WHERE my_rm.user_id = 1
GROUP BY r.room_id, r.name, r.description, r.visibility, my_rm.joined_at, s.name, u.name
ORDER BY my_rm.joined_at DESC;

-- @R09 -- READ
SELECT rm.user_id,
       u.name AS member_name,
       u.email,
       rm.joined_at,
       (rm.user_id = r.owner_id) AS is_owner,
       COALESCE(SUM(pe.points), 0) AS total_points
FROM room_members rm
JOIN rooms r              ON r.room_id = rm.room_id
JOIN users u              ON u.user_id = rm.user_id
LEFT JOIN points_events pe ON pe.user_id = u.user_id
WHERE rm.room_id = 1
GROUP BY rm.room_id, rm.user_id, u.name, u.email, rm.joined_at, r.owner_id
ORDER BY is_owner DESC, total_points DESC;

-- @W05 -- WRITE
INSERT INTO rooms (name, description, subject_id, visibility, invite_code, owner_id)
VALUES ('Algorithms Study Circle', 'Preparing for algorithms and problem solving', 1, 'public', 'ALGO2026', 1)
RETURNING room_id, name, invite_code, created_at;

-- @W06 -- WRITE
INSERT INTO room_members (room_id, user_id)
VALUES (1, 2)
ON CONFLICT (room_id, user_id) DO NOTHING;

-- @W07 -- WRITE
DELETE FROM room_members
WHERE room_id = 1 AND user_id = 2;

-- @W08 -- WRITE
UPDATE rooms
SET name = 'DBMS Batch A - Advanced',
    description = 'Deep dive into indexing, query plans, and concurrency',
    visibility = 'public'
WHERE room_id = 1;

-- @W09 -- WRITE
DELETE FROM rooms
WHERE room_id = 1;

-- @R10 -- READ
SELECT d.deck_id,
       d.title       AS deck_title,
       d.description AS deck_description,
       d.visibility,
       d.created_at,
       s.name        AS subject_name,
       u.name        AS owner_name,
       r.name        AS room_name,
       COUNT(c.card_id) AS total_cards
FROM decks d
JOIN subjects s           ON s.subject_id = d.subject_id
JOIN users u              ON u.user_id = d.owner_id
LEFT JOIN rooms r         ON r.room_id = d.room_id
LEFT JOIN room_members rm ON rm.room_id = d.room_id AND rm.user_id = 1
LEFT JOIN cards c         ON c.deck_id = d.deck_id
WHERE d.visibility = 'public'
   OR d.owner_id = 1
   OR (d.visibility = 'room' AND rm.user_id IS NOT NULL)
GROUP BY d.deck_id, d.title, d.description, d.visibility, d.created_at, s.name, u.name, r.name
ORDER BY d.created_at DESC;

-- @R11 -- READ
SELECT d.deck_id,
       d.title       AS deck_title,
       d.description AS deck_description,
       d.visibility,
       d.room_id,
       d.created_at,
       s.name        AS subject_name,
       u.user_id     AS owner_id,
       u.name        AS owner_name,
       r.name        AS room_name,
       COUNT(c.card_id) AS card_count
FROM decks d
JOIN subjects s   ON s.subject_id = d.subject_id
JOIN users u      ON u.user_id = d.owner_id
LEFT JOIN rooms r ON r.room_id = d.room_id
LEFT JOIN cards c ON c.deck_id = d.deck_id
WHERE d.deck_id = 1
GROUP BY d.deck_id, d.title, d.description, d.visibility, d.room_id, d.created_at, s.name, u.user_id, u.name, r.name;

-- @R12 -- READ
SELECT c.card_id,
       c.front,
       c.back,
       c.source_answer_id,
       c.created_at,
       d.title       AS deck_title,
       ans_d.doubt_id,
       ans_d.title   AS source_doubt_title
FROM cards c
JOIN decks d          ON d.deck_id = c.deck_id
LEFT JOIN answers a   ON a.answer_id = c.source_answer_id
LEFT JOIN doubts ans_d ON ans_d.doubt_id = a.doubt_id
WHERE c.deck_id = 1
ORDER BY c.card_id ASC;

-- @R13 -- READ
SELECT c.card_id,
       c.front,
       c.back,
       c.source_answer_id,
       c.created_at,
       d.deck_id,
       d.title AS deck_title,
       s.name  AS subject_name,
       u.name  AS deck_owner_name
FROM cards c
JOIN decks d    ON d.deck_id = c.deck_id
JOIN subjects s ON s.subject_id = d.subject_id
JOIN users u    ON u.user_id = d.owner_id
WHERE c.card_id = 1;

-- @W10 -- WRITE
INSERT INTO decks (title, description, subject_id, visibility, owner_id, room_id)
VALUES ('SQL Normalization & BCNF', 'Flashcards testing 1NF, 2NF, 3NF, and BCNF concepts', 1, 'room', 1, 1)
RETURNING deck_id, title, visibility, created_at;

-- @W11 -- WRITE
UPDATE decks
SET title = 'Advanced SQL Normalization',
    description = 'Updated study deck covering multi-valued dependencies',
    visibility = 'public',
    room_id = NULL
WHERE deck_id = 1;

-- @W12 -- WRITE
DELETE FROM decks
WHERE deck_id = 1;

-- @W13 -- WRITE
INSERT INTO cards (deck_id, front, back, source_answer_id)
VALUES (1, 'What is the definition of 3NF?', 'A relation is in 3NF if it is in 2NF and has no transitive dependencies between non-key attributes.', NULL)
RETURNING card_id, deck_id, front, created_at;

-- @W14 -- WRITE
INSERT INTO cards (deck_id, front, back, source_answer_id)
VALUES (1, 'When does 3NF satisfy BCNF?', 'When every determinant in the relation is a superkey (no dependency X -> Y where X is not a candidate key).', 1)
RETURNING card_id, deck_id, source_answer_id, created_at;

-- @W15 -- WRITE
UPDATE cards
SET front = 'What is the condition for BCNF?',
    back  = 'Every non-trivial functional dependency X -> Y has X as a superkey.'
WHERE card_id = 1;

-- @W16 -- WRITE
DELETE FROM cards
WHERE card_id = 1;

-- @R14 -- READ
SELECT cp.card_id,
       c.front,
       c.back,
       cp.box,
       cp.due_date,
       cp.last_reviewed,
       d.deck_id,
       d.title AS deck_title,
       s.name  AS subject_name
FROM card_progress cp
JOIN cards c    ON c.card_id = cp.card_id
JOIN decks d    ON d.deck_id = c.deck_id
JOIN subjects s ON s.subject_id = d.subject_id
WHERE cp.user_id = 1
  AND cp.due_date <= CURRENT_DATE
ORDER BY cp.box ASC, cp.due_date ASC
LIMIT 20;

-- @R15 -- READ
SELECT d.deck_id,
       d.title AS deck_title,
       COUNT(c.card_id) AS total_cards,
       COUNT(CASE WHEN cp.box = 1 THEN 1 END) AS box_1_count,
       COUNT(CASE WHEN cp.box = 2 THEN 1 END) AS box_2_count,
       COUNT(CASE WHEN cp.box = 3 THEN 1 END) AS box_3_count,
       COUNT(CASE WHEN cp.box = 4 THEN 1 END) AS box_4_count,
       COUNT(CASE WHEN cp.box = 5 THEN 1 END) AS box_5_count,
       COUNT(CASE WHEN cp.box IS NULL THEN 1 END) AS unreviewed_count
FROM decks d
JOIN cards c ON c.deck_id = d.deck_id
LEFT JOIN card_progress cp ON cp.card_id = c.card_id AND cp.user_id = 1
WHERE d.deck_id = 1
GROUP BY d.deck_id, d.title;

-- @R16 -- READ
SELECT c.card_id,
       c.front,
       c.back,
       d.deck_id,
       d.title AS deck_title
FROM cards c
JOIN decks d ON d.deck_id = c.deck_id
LEFT JOIN card_progress cp ON cp.card_id = c.card_id AND cp.user_id = 1
WHERE c.deck_id = 1
  AND cp.card_id IS NULL
ORDER BY c.card_id ASC
LIMIT 20;

-- @W17 -- WRITE
INSERT INTO card_progress (user_id, card_id, box, due_date, last_reviewed)
VALUES (1, 1, 2, CURRENT_DATE + interval '3 days', now())
ON CONFLICT (user_id, card_id)
DO UPDATE SET box           = EXCLUDED.box,
              due_date      = EXCLUDED.due_date,
              last_reviewed = EXCLUDED.last_reviewed;

-- @W18 -- WRITE
DELETE FROM card_progress cp
USING cards c
WHERE cp.card_id = c.card_id
  AND cp.user_id = 1
  AND c.deck_id = 1;

-- @R17 -- READ
SELECT d.doubt_id,
       d.title,
       d.body,
       d.created_at,
       u.user_id AS author_id,
       u.name    AS author_name,
       COUNT(a.answer_id) AS total_answers,
       COALESCE(BOOL_OR(a.is_accepted), false) AS has_accepted_answer
FROM doubts d
JOIN users u        ON u.user_id = d.author_id
LEFT JOIN answers a ON a.doubt_id = d.doubt_id
WHERE d.room_id = 1
GROUP BY d.doubt_id, d.title, d.body, d.created_at, u.user_id, u.name
ORDER BY d.created_at DESC;

-- @R18 -- READ
SELECT d.doubt_id,
       d.title,
       d.body,
       d.created_at,
       u.name AS author_name,
       r.name AS room_name
FROM doubts d
JOIN rooms r        ON r.room_id = d.room_id
JOIN users u        ON u.user_id = d.author_id
LEFT JOIN answers a ON a.doubt_id = d.doubt_id
WHERE d.room_id = 1
  AND a.answer_id IS NULL
ORDER BY d.created_at ASC;

-- @R19 -- READ
SELECT d.doubt_id,
       d.title,
       d.body,
       d.created_at,
       r.room_id,
       r.name AS room_name,
       s.name AS subject_name,
       u.user_id AS author_id,
       u.name    AS author_name
FROM doubts d
JOIN rooms r    ON r.room_id = d.room_id
JOIN subjects s ON s.subject_id = r.subject_id
JOIN users u    ON u.user_id = d.author_id
WHERE d.doubt_id = 1;

-- @R20 -- READ
SELECT d.doubt_id,
       d.title,
       d.created_at,
       r.room_id,
       r.name AS room_name,
       s.name AS subject_name,
       u.name AS author_name,
       COUNT(a.answer_id) AS answer_count
FROM doubts d
JOIN rooms r        ON r.room_id = d.room_id
JOIN subjects s     ON s.subject_id = r.subject_id
JOIN users u        ON u.user_id = d.author_id
LEFT JOIN answers a ON a.doubt_id = d.doubt_id
WHERE (d.title ILIKE '%normalization%' OR d.body ILIKE '%normalization%')
GROUP BY d.doubt_id, d.title, d.created_at, r.room_id, r.name, s.name, u.name
ORDER BY d.created_at DESC
LIMIT 20;

-- @W19 -- WRITE
INSERT INTO doubts (room_id, author_id, title, body)
VALUES (1, 1, 'Why is 3NF not always sufficient for BCNF?', 'Looking for an intuitive real-world example where 3NF holds but BCNF is violated due to overlapping candidate keys.')
RETURNING doubt_id, room_id, author_id, title, created_at;

-- @W20 -- WRITE
UPDATE doubts
SET title = 'Why is 3NF not always sufficient for BCNF? (Example needed)',
    body  = 'Clarifying: specifically when non-trivial FDs have a prime attribute on the RHS.'
WHERE doubt_id = 1 AND author_id = 1;

-- @W21 -- WRITE
DELETE FROM doubts
WHERE doubt_id = 1;

-- @R21 -- READ
SELECT a.answer_id,
       a.doubt_id,
       a.body,
       a.is_accepted,
       a.created_at,
       u.user_id AS author_id,
       u.name    AS author_name,
       COUNT(au.user_id) AS upvote_count,
       BOOL_OR(my_vote.user_id IS NOT NULL) AS has_user_upvoted
FROM answers a
JOIN users u               ON u.user_id = a.author_id
LEFT JOIN answer_upvotes au ON au.answer_id = a.answer_id
LEFT JOIN answer_upvotes my_vote ON my_vote.answer_id = a.answer_id AND my_vote.user_id = 1
WHERE a.doubt_id = 1
GROUP BY a.answer_id, a.doubt_id, a.body, a.is_accepted, a.created_at, u.user_id, u.name
ORDER BY a.is_accepted DESC, upvote_count DESC, a.created_at ASC;

-- @R22 -- READ
SELECT a.answer_id,
       a.body        AS answer_body,
       a.is_accepted,
       d.doubt_id,
       d.title       AS doubt_title,
       r.room_id,
       r.name        AS room_name,
       u.name        AS author_name
FROM answers a
JOIN doubts d ON d.doubt_id = a.doubt_id
JOIN rooms r  ON r.room_id = d.room_id
JOIN users u  ON u.user_id = a.author_id
WHERE a.answer_id = 1;

-- @W22 -- WRITE
INSERT INTO answers (doubt_id, author_id, body)
VALUES (1, 2, 'BCNF requires every determinant to be a candidate key. 3NF allows X -> Y if Y is a prime attribute, which can still lead to redundancy.')
RETURNING answer_id, doubt_id, author_id, is_accepted, created_at;

-- @W23 -- WRITE
UPDATE answers
SET body = 'Updated explanation: BCNF eliminates all redundancy based on functional dependencies, whereas 3NF allows prime attributes on the right-hand side.'
WHERE answer_id = 1 AND author_id = 2;

-- @W24 -- WRITE
UPDATE answers
SET is_accepted = true
WHERE answer_id = 1 AND doubt_id = 1;

-- @W25 -- WRITE
UPDATE answers
SET is_accepted = false
WHERE doubt_id = 1 AND is_accepted = true;

-- @W26 -- WRITE
DELETE FROM answers
WHERE answer_id = 1;

-- @W27 -- WRITE
INSERT INTO answer_upvotes (answer_id, user_id)
VALUES (1, 3)
ON CONFLICT (answer_id, user_id) DO NOTHING;

-- @W28 -- WRITE
DELETE FROM answer_upvotes
WHERE answer_id = 1 AND user_id = 3;

-- @R23 -- READ
SELECT rm.user_id,
       u.name AS member_name,
       COALESCE(SUM(pe.points), 0) AS weekly_points,
       DENSE_RANK() OVER (ORDER BY COALESCE(SUM(pe.points), 0) DESC) AS rank
FROM room_members rm
JOIN users u ON u.user_id = rm.user_id
LEFT JOIN points_events pe
       ON pe.user_id = rm.user_id
      AND pe.created_at >= date_trunc('week', CURRENT_TIMESTAMP)
WHERE rm.room_id = 1
GROUP BY rm.user_id, u.name
ORDER BY rank ASC, u.name ASC;

-- @R24 -- READ
SELECT u.user_id,
       u.name AS student_name,
       SUM(pe.points) AS total_weekly_points,
       DENSE_RANK() OVER (ORDER BY SUM(pe.points) DESC) AS rank
FROM users u
JOIN points_events pe
  ON pe.user_id = u.user_id
WHERE pe.created_at >= date_trunc('week', CURRENT_TIMESTAMP)
GROUP BY u.user_id, u.name
ORDER BY total_weekly_points DESC
LIMIT 10;

-- @R25 -- READ
SELECT pe.event_id,
       pe.event_type,
       pe.points,
       pe.created_at,
       d.title    AS doubt_title,
       ans_d.title AS answer_doubt_title,
       voter.name AS upvoter_name
FROM points_events pe
LEFT JOIN doubts d          ON d.doubt_id = pe.doubt_id
LEFT JOIN answers a         ON a.answer_id = pe.answer_id
LEFT JOIN doubts ans_d      ON ans_d.doubt_id = a.doubt_id
LEFT JOIN users voter       ON voter.user_id = pe.voter_id
WHERE pe.user_id = 1
ORDER BY pe.created_at DESC
LIMIT 20;

-- @R26 -- READ
SELECT b.badge_id,
       b.name AS badge_name,
       b.description,
       (ub.user_id IS NOT NULL) AS is_earned,
       ub.awarded_at
FROM badges b
LEFT JOIN user_badges ub ON ub.badge_id = b.badge_id AND ub.user_id = 1
ORDER BY is_earned DESC, b.badge_id ASC;

-- @W29 -- WRITE
INSERT INTO points_events (user_id, event_type, points, doubt_id)
VALUES (1, 'ask_doubt', 2, 1);

-- @W30 -- WRITE
INSERT INTO points_events (user_id, event_type, points, answer_id)
VALUES (2, 'post_answer', 5, 1);

-- @W31 -- WRITE
INSERT INTO points_events (user_id, event_type, points, answer_id, voter_id)
VALUES (2, 'answer_upvoted', 3, 1, 3);

-- @W32 -- WRITE
INSERT INTO points_events (user_id, event_type, points, answer_id)
VALUES (2, 'answer_accepted', 15, 1);

-- @W33 -- WRITE
INSERT INTO points_events (user_id, event_type, points, session_ref)
VALUES (1, 'session_completed', 10, 'sess_mongo_67389a');

-- @W34 -- WRITE
INSERT INTO points_events (user_id, event_type, points, event_date)
VALUES (1, 'daily_goal', 10, CURRENT_DATE)
ON CONFLICT (user_id, event_date) WHERE event_type = 'daily_goal' DO NOTHING;

-- @W35 -- WRITE
INSERT INTO user_badges (user_id, badge_id)
VALUES (1, 1)
ON CONFLICT (user_id, badge_id) DO NOTHING;

-- @R27 -- READ
SELECT u.user_id,
       u.name,
       u.daily_goal,
       COALESCE(SUM(pe.points), 0) AS total_points,
       COUNT(DISTINCT CASE WHEN cp.due_date <= CURRENT_DATE THEN cp.card_id END) AS cards_due_today,
       COUNT(DISTINCT rm.room_id)  AS rooms_joined,
       COUNT(DISTINCT d.doubt_id)  AS doubts_asked,
       COUNT(DISTINCT a.answer_id) AS answers_given
FROM users u
LEFT JOIN points_events pe ON pe.user_id = u.user_id
LEFT JOIN card_progress cp ON cp.user_id = u.user_id
LEFT JOIN room_members rm  ON rm.user_id = u.user_id
LEFT JOIN doubts d         ON d.author_id = u.user_id
LEFT JOIN answers a        ON a.author_id = u.user_id
WHERE u.user_id = 1
GROUP BY u.user_id, u.name, u.daily_goal;

-- @R28 -- READ
SELECT r.room_id,
       r.name AS room_name,
       COUNT(DISTINCT rm.user_id) AS total_members,
       COUNT(DISTINCT d.doubt_id) AS total_doubts,
       COUNT(DISTINCT CASE WHEN a.is_accepted THEN d.doubt_id END) AS resolved_doubts,
       COUNT(DISTINCT dk.deck_id) AS total_decks,
       COUNT(DISTINCT c.card_id)  AS total_cards
FROM rooms r
LEFT JOIN room_members rm ON rm.room_id = r.room_id
LEFT JOIN doubts d        ON d.room_id = r.room_id
LEFT JOIN answers a       ON a.doubt_id = d.doubt_id
LEFT JOIN decks dk        ON dk.room_id = r.room_id
LEFT JOIN cards c         ON c.deck_id = dk.deck_id
WHERE r.room_id = 1
GROUP BY r.room_id, r.name;
