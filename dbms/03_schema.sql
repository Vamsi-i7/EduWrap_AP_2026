DROP SCHEMA IF EXISTS eduwrap CASCADE;
CREATE SCHEMA eduwrap;
SET search_path TO eduwrap;

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

CREATE TABLE subjects (
    subject_id    integer        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          text           NOT NULL UNIQUE
);

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

CREATE TABLE room_members (
    room_id       integer        NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    user_id       integer        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    joined_at     timestamptz    NOT NULL DEFAULT now(),
    PRIMARY KEY (room_id, user_id)
);

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

CREATE TABLE cards (
    card_id           integer    GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    deck_id           integer    NOT NULL REFERENCES decks(deck_id) ON DELETE CASCADE,
    front             text       NOT NULL,
    back              text       NOT NULL,
    source_answer_id  integer,
    created_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_cards_front  CHECK (char_length(front) <= 500),
    CONSTRAINT ck_cards_back   CHECK (char_length(back)  <= 1000)
);

CREATE TABLE card_progress (
    user_id        integer      NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    card_id        integer      NOT NULL REFERENCES cards(card_id) ON DELETE CASCADE,
    box            integer      NOT NULL DEFAULT 1,
    due_date       date         NOT NULL,
    last_reviewed  timestamptz,
    PRIMARY KEY (user_id, card_id),
    CONSTRAINT ck_progress_box CHECK (box BETWEEN 1 AND 5)
);

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

CREATE TABLE answers (
    answer_id     integer        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doubt_id      integer        NOT NULL REFERENCES doubts(doubt_id) ON DELETE CASCADE,
    author_id     integer        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    body          text           NOT NULL,
    is_accepted   boolean        NOT NULL DEFAULT false,
    created_at    timestamptz    NOT NULL DEFAULT now(),
    CONSTRAINT ck_answers_body CHECK (char_length(body) <= 2000)
);

CREATE UNIQUE INDEX uq_one_accepted_answer
    ON answers (doubt_id) WHERE is_accepted;

ALTER TABLE cards
    ADD CONSTRAINT fk_cards_source_answer
        FOREIGN KEY (source_answer_id)
        REFERENCES answers(answer_id)
        ON DELETE SET NULL;

CREATE TABLE answer_upvotes (
    answer_id     integer        NOT NULL REFERENCES answers(answer_id) ON DELETE CASCADE,
    user_id       integer        NOT NULL REFERENCES users(user_id)    ON DELETE CASCADE,
    created_at    timestamptz    NOT NULL DEFAULT now(),
    PRIMARY KEY (answer_id, user_id)
);

CREATE TABLE points_events (
    event_id      integer        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id       integer        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    event_type    text           NOT NULL,
    points        integer        NOT NULL,
    doubt_id      integer        REFERENCES doubts(doubt_id)   ON DELETE CASCADE,
    answer_id     integer        REFERENCES answers(answer_id) ON DELETE CASCADE,
    voter_id      integer,
    session_ref   text,
    event_date    date,
    created_at    timestamptz    NOT NULL DEFAULT now(),

    CONSTRAINT ck_pe_event_type CHECK (
        event_type IN (
            'ask_doubt', 'post_answer', 'answer_upvoted',
            'answer_accepted', 'session_completed', 'daily_goal'
        )
    ),

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

    CONSTRAINT fk_pe_upvote
        FOREIGN KEY (answer_id, voter_id)
        REFERENCES answer_upvotes(answer_id, user_id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX uq_pe_daily_goal
    ON points_events (user_id, event_date)
    WHERE event_type = 'daily_goal';

CREATE TABLE badges (
    badge_id      integer        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          text           NOT NULL UNIQUE,
    description   text
);

CREATE TABLE user_badges (
    user_id       integer        NOT NULL REFERENCES users(user_id)   ON DELETE CASCADE,
    badge_id      integer        NOT NULL REFERENCES badges(badge_id) ON DELETE CASCADE,
    awarded_at    timestamptz    NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, badge_id)
);
