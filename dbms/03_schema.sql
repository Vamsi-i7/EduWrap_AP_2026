-- dbms/03_schema.sql : EduWrap 2.0 – PostgreSQL schema (CP2)
-- 13 tables: 11 core + 2 stretch (badges, user_badges).
-- Derived from the normalized design in 01_normalization.md (sections 8.1–8.3).
--
-- Constraints: PK, FK, UNIQUE, NOT NULL, CHECK, partial unique index.
-- Cascades: ON DELETE CASCADE for owned/child data, ON DELETE SET NULL where
--   the parent's removal should not destroy the child (deck → room, card → answer).
-- No tuning indexes (added in CP3).
--
-- MongoDB collections (study_sessions, activity_events, notifications,
-- daily_activity) are not in this file; they are created in the application.

DROP SCHEMA IF EXISTS eduwrap CASCADE;
CREATE SCHEMA eduwrap;
SET search_path TO eduwrap;

-- ================================================================ users
-- FR-A: accounts and onboarding.
-- Candidate keys: user_id, email.
CREATE TABLE users (
    user_id       integer        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          text           NOT NULL,
    email         text           NOT NULL UNIQUE,
    password_hash text           NOT NULL,
    daily_goal    integer        NOT NULL DEFAULT 20,
    created_at    timestamptz    NOT NULL DEFAULT now(),
    CONSTRAINT ck_users_name       CHECK (char_length(name) BETWEEN 2 AND 60),
    CONSTRAINT ck_users_daily_goal CHECK (daily_goal IN (10, 20, 30, 50))
);

-- ============================================================= subjects
-- Shared lookup for rooms and decks; prevents spelling variants.
-- Candidate keys: subject_id, name.
CREATE TABLE subjects (
    subject_id    integer        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          text           NOT NULL UNIQUE
);

-- ================================================================= rooms
-- FR-R: study rooms (public or private, joined by search or invite code).
-- Candidate keys: room_id, invite_code.
CREATE TABLE rooms (
    room_id       integer        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          text           NOT NULL,
    description   text,
    subject_id    integer        NOT NULL REFERENCES subjects(subject_id),
    visibility    text           NOT NULL,
    invite_code   text           NOT NULL UNIQUE,
    owner_id      integer        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at    timestamptz    NOT NULL DEFAULT now(),
    CONSTRAINT ck_rooms_name       CHECK (char_length(name) BETWEEN 3 AND 50),
    CONSTRAINT ck_rooms_desc       CHECK (description IS NULL OR char_length(description) <= 200),
    CONSTRAINT ck_rooms_visibility CHECK (visibility IN ('public', 'private')),
    CONSTRAINT ck_rooms_invite     CHECK (char_length(invite_code) = 8)
);

-- ======================================================== room_members
-- Junction: users ↔ rooms (M:N). The owner is also inserted here.
-- ON DELETE CASCADE on both FKs: removing a room or user cleans up memberships.
CREATE TABLE room_members (
    room_id       integer        NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    user_id       integer        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    joined_at     timestamptz    NOT NULL DEFAULT now(),
    PRIMARY KEY (room_id, user_id)
);

-- ================================================================= decks
-- FR-D: flashcard decks. Visibility is private, room or public.
-- room_id is required exactly when visibility = 'room'.
-- If a room is deleted the deck stays (SET NULL) and the app sets visibility to private.
CREATE TABLE decks (
    deck_id       integer        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title         text           NOT NULL,
    description   text,
    subject_id    integer        NOT NULL REFERENCES subjects(subject_id),
    visibility    text           NOT NULL,
    owner_id      integer        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    room_id       integer        REFERENCES rooms(room_id) ON DELETE SET NULL,
    created_at    timestamptz    NOT NULL DEFAULT now(),
    CONSTRAINT ck_decks_title      CHECK (char_length(title) BETWEEN 3 AND 80),
    CONSTRAINT ck_decks_visibility CHECK (visibility IN ('private', 'room', 'public')),
    CONSTRAINT ck_decks_room_rule  CHECK (
        (visibility = 'room' AND room_id IS NOT NULL)
        OR (visibility <> 'room' AND room_id IS NULL)
    )
);

-- ================================================================= cards
-- FR-D: individual flashcards within a deck.
-- source_answer_id links a card that was saved from an answer (SET NULL if
-- the answer is later deleted; the card remains useful).
-- Forward-declared: answers table is created below; FK added via ALTER TABLE.
CREATE TABLE cards (
    card_id           integer    GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    deck_id           integer    NOT NULL REFERENCES decks(deck_id) ON DELETE CASCADE,
    front             text       NOT NULL,
    back              text       NOT NULL,
    source_answer_id  integer,                       -- FK added after answers table
    created_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_cards_front  CHECK (char_length(front) <= 500),
    CONSTRAINT ck_cards_back   CHECK (char_length(back)  <= 1000)
);

-- ======================================================== card_progress
-- FR-P: per-user spaced repetition state (Leitner boxes 1–5).
-- Junction with attributes: (user_id, card_id) → box, due_date, last_reviewed.
CREATE TABLE card_progress (
    user_id        integer      NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    card_id        integer      NOT NULL REFERENCES cards(card_id) ON DELETE CASCADE,
    box            integer      NOT NULL DEFAULT 1,
    due_date       date         NOT NULL,
    last_reviewed  timestamptz,
    PRIMARY KEY (user_id, card_id),
    CONSTRAINT ck_progress_box CHECK (box BETWEEN 1 AND 5)
);

-- ================================================================ doubts
-- FR-Q: questions scoped to a room.
CREATE TABLE doubts (
    doubt_id      integer        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    room_id       integer        NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    author_id     integer        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title         text           NOT NULL,
    body          text,
    created_at    timestamptz    NOT NULL DEFAULT now(),
    CONSTRAINT ck_doubts_title CHECK (char_length(title) BETWEEN 10 AND 150),
    CONSTRAINT ck_doubts_body  CHECK (body IS NULL OR char_length(body) <= 2000)
);

-- =============================================================== answers
-- FR-Q: answers to doubts. At most one accepted answer per doubt, enforced
-- by a partial unique index (not a plain UNIQUE, which would block multiple
-- non-accepted answers).
CREATE TABLE answers (
    answer_id     integer        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doubt_id      integer        NOT NULL REFERENCES doubts(doubt_id) ON DELETE CASCADE,
    author_id     integer        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    body          text           NOT NULL,
    is_accepted   boolean        NOT NULL DEFAULT false,
    created_at    timestamptz    NOT NULL DEFAULT now(),
    CONSTRAINT ck_answers_body CHECK (char_length(body) <= 2000)
);

-- At most one accepted answer per doubt.
CREATE UNIQUE INDEX uq_one_accepted_answer
    ON answers (doubt_id) WHERE is_accepted;

-- Now add the deferred FK from cards → answers.
ALTER TABLE cards
    ADD CONSTRAINT fk_cards_source_answer
        FOREIGN KEY (source_answer_id)
        REFERENCES answers(answer_id)
        ON DELETE SET NULL;

-- ======================================================= answer_upvotes
-- FR-Q: one upvote per user per answer (composite PK enforces this).
-- The application also blocks upvoting your own answer (checked in Express).
CREATE TABLE answer_upvotes (
    answer_id     integer        NOT NULL REFERENCES answers(answer_id) ON DELETE CASCADE,
    user_id       integer        NOT NULL REFERENCES users(user_id)    ON DELETE CASCADE,
    created_at    timestamptz    NOT NULL DEFAULT now(),
    PRIMARY KEY (answer_id, user_id)
);

-- ========================================================= points_events
-- FR-G1 / PRD section 8: points ledger.
-- Each event stores its own `points` value (history must not change when
-- rules change; see 01_normalization.md section 6.3).
-- Source columns: exactly the ones matching event_type are filled (CHECK).
-- Composite FK (answer_id, voter_id) → answer_upvotes for answer_upvoted events.
-- Weekly totals and leaderboard rank are computed by query, never stored.
CREATE TABLE points_events (
    event_id      integer        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id       integer        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    event_type    text           NOT NULL,
    points        integer        NOT NULL,
    doubt_id      integer        REFERENCES doubts(doubt_id)   ON DELETE CASCADE,
    answer_id     integer        REFERENCES answers(answer_id) ON DELETE CASCADE,
    voter_id      integer,                                     -- part of composite FK
    session_ref   text,                                        -- MongoDB study_session _id
    event_date    date,                                        -- for daily_goal events
    created_at    timestamptz    NOT NULL DEFAULT now(),

    -- Allowed event types
    CONSTRAINT ck_pe_event_type CHECK (
        event_type IN (
            'ask_doubt',
            'post_answer',
            'answer_upvoted',
            'answer_accepted',
            'session_completed',
            'daily_goal'
        )
    ),

    -- Source columns must match the event type.
    -- ask_doubt        → doubt_id filled,  rest NULL
    -- post_answer      → answer_id filled, rest NULL
    -- answer_accepted  → answer_id filled, rest NULL
    -- answer_upvoted   → answer_id AND voter_id filled, rest NULL
    -- session_completed→ session_ref filled, rest NULL
    -- daily_goal       → event_date filled, rest NULL
    CONSTRAINT ck_pe_src_ask_doubt CHECK (
        event_type <> 'ask_doubt'
        OR (doubt_id IS NOT NULL AND answer_id IS NULL AND voter_id IS NULL
            AND session_ref IS NULL AND event_date IS NULL)
    ),
    CONSTRAINT ck_pe_src_post_answer CHECK (
        event_type <> 'post_answer'
        OR (answer_id IS NOT NULL AND doubt_id IS NULL AND voter_id IS NULL
            AND session_ref IS NULL AND event_date IS NULL)
    ),
    CONSTRAINT ck_pe_src_answer_accepted CHECK (
        event_type <> 'answer_accepted'
        OR (answer_id IS NOT NULL AND doubt_id IS NULL AND voter_id IS NULL
            AND session_ref IS NULL AND event_date IS NULL)
    ),
    CONSTRAINT ck_pe_src_answer_upvoted CHECK (
        event_type <> 'answer_upvoted'
        OR (answer_id IS NOT NULL AND voter_id IS NOT NULL
            AND doubt_id IS NULL AND session_ref IS NULL AND event_date IS NULL)
    ),
    CONSTRAINT ck_pe_src_session CHECK (
        event_type <> 'session_completed'
        OR (session_ref IS NOT NULL AND doubt_id IS NULL AND answer_id IS NULL
            AND voter_id IS NULL AND event_date IS NULL)
    ),
    CONSTRAINT ck_pe_src_daily_goal CHECK (
        event_type <> 'daily_goal'
        OR (event_date IS NOT NULL AND doubt_id IS NULL AND answer_id IS NULL
            AND voter_id IS NULL AND session_ref IS NULL)
    ),

    -- Composite FK: (answer_id, voter_id) → answer_upvotes(answer_id, user_id)
    -- Ensures answer_upvoted events reference a real upvote and cascade when
    -- the upvote is removed.
    CONSTRAINT fk_pe_upvote
        FOREIGN KEY (answer_id, voter_id)
        REFERENCES answer_upvotes(answer_id, user_id)
        ON DELETE CASCADE
);

-- One daily_goal event per user per day.
CREATE UNIQUE INDEX uq_pe_daily_goal
    ON points_events (user_id, event_date)
    WHERE event_type = 'daily_goal';

-- ============================================================== badges
-- FR-G5 (stretch): badge catalogue.
-- Candidate keys: badge_id, name.
CREATE TABLE badges (
    badge_id      integer        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          text           NOT NULL UNIQUE,
    description   text
);

-- ========================================================= user_badges
-- FR-G5 (stretch): M:N junction between users and badges.
CREATE TABLE user_badges (
    user_id       integer        NOT NULL REFERENCES users(user_id)   ON DELETE CASCADE,
    badge_id      integer        NOT NULL REFERENCES badges(badge_id) ON DELETE CASCADE,
    awarded_at    timestamptz    NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, badge_id)
);

-- ========================================================================
-- Summary
-- ========================================================================
-- 13 tables total (11 core + 2 stretch):
--   users, subjects, rooms, room_members,
--   decks, cards, card_progress,
--   doubts, answers, answer_upvotes,
--   points_events,
--   badges, user_badges
--
-- Partial unique indexes (2):
--   uq_one_accepted_answer  — at most one accepted answer per doubt
--   uq_pe_daily_goal        — one daily_goal points event per user per day
--
-- Derived values NOT stored (computed by query):
--   answer count per doubt, upvote count per answer, member count per room,
--   cards due today, weekly points / leaderboard rank, total points,
--   streak and daily goal progress (MongoDB daily_activity).
--
-- MongoDB collections (not in this file):
--   study_sessions, activity_events, notifications, daily_activity.
