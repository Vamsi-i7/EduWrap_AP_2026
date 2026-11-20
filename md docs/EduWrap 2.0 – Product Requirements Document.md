# EduWrap 2.0 – Product Requirements Document

**Version 1.0 · November 15, 2026** Author: Krishna · Team T0055, Section A · B.Tech CSAI, Rishihood University (AP capstone) Status: Draft for approval. No code or files are created until this PRD and the architecture are approved.

---

## 1. Overview

**EduWrap** is a collaborative study platform for university cohorts. Students form study rooms, share flashcard decks, ask and answer doubts, and build a daily study habit through streaks, points and weekly leaderboards.

**Tagline:** Study together. Stay consistent.

**One-line pitch:** EduWrap turns scattered peer help into a shared, searchable study base, and keeps students coming back with habit mechanics.

**Product philosophy:** clean and modern UI, essential features only, every feature tied to a purpose, simple readable code, strict frontend/backend separation.

## 2. Problem statement

In a university cohort, study help is scattered and disappears:

- Doubts are asked in WhatsApp groups, get buried within an hour, and are asked again next semester.
- Good notes and flashcards stay on one student's phone or laptop.
- Nobody can tell which answer was correct, or find what a classmate already solved.
- Students study alone and have little reason to stay consistent.

Existing tools solve parts of this: flashcard apps are individual, chat groups are unsearchable, and forums are not scoped to a cohort. EduWrap combines cohort-scoped Q&A, shared revision material and habit-building in one place.

## 3. Target users

**Primary:** undergraduate students studying in a cohort (for example a B.Tech batch).

| Persona | Behaviour | What they need |
| --- | --- | --- |
| Asha, the organiser | Builds notes and decks, keeps her group on track | Easy deck creation, a room for her group, visibility of who is active |
| Ravi, the crammer | Studies close to exams | Fast answers, a clear list of cards due, quick revision |
| Meera, the helper | Enjoys explaining | Recognition for good answers (upvotes, accepted answers, points) |

**Not targeted:** teachers, institutions, school students. There is no instructor role in v1.

## 4. Goals, non-goals and success metrics

**Goals**

1. Capture peer knowledge as a permanent, searchable, trustable record (Q&A with accepted answers).
2. Make revision shared and effortless (decks and spaced-repetition practice).
3. Build a daily habit (streaks, daily goal, points, leaderboard).
4. Be a complete, explainable full-stack application that demonstrates AP and DE concepts.

**Non-goals (v1):** AI features, video or voice, mobile apps, payments, teacher tools, file uploads, email notifications, real-time chat.

**Success metrics** (for the pitch and demo)

| Metric | Target |
| --- | --- |
| Time from registration to first practice session | under 3 minutes |
| Doubts that receive at least one answer | at least 70% in the demo dataset |
| Weekly active students practising or answering | tracked on the dashboard |
| Functional requirements passing acceptance tests | 100% of Core, at least 80% of Growth |

## 5. Scope

| Layer | Contents | Rule |
| --- | --- | --- |
| **Core** | Accounts and onboarding, rooms, decks and cards, practice, doubts and answers, dashboard | Must be complete and stable |
| **Growth** | Streaks and daily goal, points, weekly leaderboard, notifications, activity feed | Built after Core is stable |
| **Stretch** | Badges, deck cloning, keyboard shortcuts | First to be cut if time runs short |

**Out of scope for v1:** password reset, email verification, social login, account deletion, content reporting, direct messages, file or image uploads, real-time chat, dark mode, localisation, admin back-office. These are listed as future scope in the final report.

## 6. User roles and permissions

| Role | Description |
| --- | --- |
| Guest | Not logged in. Sees only the landing, login and register pages |
| Student | Any logged-in user |
| Room Owner | The Student who created a room (role is per room) |

| Action | Guest | Student | Room Owner |
| --- | --- | --- | --- |
| View landing, register, login | Yes | Yes | Yes |
| Create room, join public room, join by invite code | No | Yes | Yes |
| View room content (doubts, room decks, leaderboard) | No | Members only | Yes |
| Post doubt or answer in a room | No | Members only | Yes |
| Edit or delete own content | No | Yes | Yes |
| Delete any doubt, answer or deck inside the room | No | No | Yes |
| Remove a member, edit or delete the room | No | No | Yes |
| Accept an answer | No | Only the asker | Only the asker |

## 7. Functional requirements

### 7.1 Accounts and onboarding (Core)

- **FR-A1** Register with name, email and password (minimum 8 characters). Email is unique. Passwords are stored hashed.
- **FR-A2** Login returns a token valid for 24 hours. Logout removes it on the client.
- **FR-A3** Protected pages and API routes require a valid token. An invalid or expired token sends the user to login.
- **FR-A4** After first registration, a short onboarding asks for a daily card goal (10, 20, 30 or 50) and offers to join a room or create one. Both steps can be skipped.
- **FR-A5** The user can edit their name and daily goal from the profile page.

### 7.2 Rooms (Core)

- **FR-R1** Create a room with name (3 to 50 characters), description (up to 200), subject and visibility (public or private). The creator becomes Room Owner and an 8-character invite code is generated.
- **FR-R2** Discover public rooms with search by name and filter by subject. Joining a public room is one click.
- **FR-R3** Join a private room by entering its invite code.
- **FR-R4** A member can leave a room. The owner cannot leave but can delete the room, which deletes its doubts and answers and unlinks its decks.
- **FR-R5** The room page has four sections: Overview (description, members, stats), Doubts, Decks and Leaderboard.
- **FR-R6** The owner can remove members, delete any doubt, answer or room deck, and edit room details.

### 7.3 Decks and cards (Core)

- **FR-D1** Create a deck with title, description, subject and visibility: private (owner only), room (members of one chosen room the owner belongs to) or public (all students).
- **FR-D2** The owner can add, edit, delete and reorder-free list cards. Card front is up to 500 characters, back up to 1000. A deck holds at most 200 cards.
- **FR-D3** Anyone who can see a deck can browse and practise it. Only the owner can edit it.
- **FR-D4** Browse decks with search by title and filters for subject, mine, room and public. Lists are paginated (12 per page).
- **FR-D5** (Stretch) Clone: a student can copy a visible deck into their own private decks.

### 7.4 Practice and spaced repetition (Core)

- **FR-P1** A student can start a session on any deck they can see. Cards due today come first, then new cards, up to 20 cards per session.
- **FR-P2** Scheduling uses five Leitner boxes with review intervals of 1, 2, 4, 8 and 16 days. New cards start in box 1 and are due immediately. Marking a card known moves it up one box (maximum 5). Marking it missed returns it to box 1. Progress is stored per user per card.
- **FR-P3** The session screen shows one card at a time, flips on click or Space, has Known and Missed buttons (keys 1 and 2), and a progress bar.
- **FR-P4** At the end, a summary shows cards reviewed, accuracy and time. The progress updates and points are saved in one database transaction, then the session summary is stored in MongoDB.
- **FR-P5** The dashboard shows how many cards are due today across all decks the student has practised.

### 7.5 Doubts and answers (Core)

- **FR-Q1** A member posts a doubt in a room: title (10 to 150 characters) and body (up to 2000). The subject is inherited from the room.
- **FR-Q2** Doubt lists (per room, and an All my rooms view) support filters (all, unanswered, answered, mine), keyword search on title and body, and pagination (10 per page).
- **FR-Q3** The doubt page shows the question and answers ordered by accepted first, then upvotes, then newest.
- **FR-Q4** A member posts an answer (up to 2000 characters). Multiple answers per doubt are allowed.
- **FR-Q5** Upvote an answer: one vote per student per answer, no upvoting your own answer, and clicking again removes the vote.
- **FR-Q6** Only the asker can mark an answer as accepted. At most one answer per doubt is accepted, and the asker can change it.
- **FR-Q7** Authors can edit or delete their own doubts and answers. Deleting a doubt deletes its answers.
- **FR-Q8** On any answer, Save as card creates a card in a deck the student owns (chosen or newly created). Front is the doubt title, back is the answer text, and the card keeps a reference to the source answer.

### 7.6 Habit and gamification (Growth)

- **FR-G1** Points are awarded according to the table in section 8.
- **FR-G2** A day counts toward the streak if the student completes at least one practice session or posts at least one answer. The streak is the number of consecutive qualifying days ending today (or yesterday if today is not yet done). Days are calculated in Indian Standard Time.
- **FR-G3** Daily goal progress is cards reviewed today divided by the goal set in onboarding or profile.
- **FR-G4** The weekly leaderboard ranks a room's members by points earned from Monday 00:00 to Sunday 23:59 IST, showing the top 10 and the viewer's own rank. Ties are broken by name.
- **FR-G5** (Stretch) Badges: First Answer, 7-Day Streak, Helper (5 accepted answers), Century (100 cards reviewed). Each badge is awarded once and shown on the profile.

### 7.7 Notifications and activity (Growth)

- **FR-N1** Notifications are created when someone answers your doubt, your answer is accepted, a member joins your room (to the owner), or you are removed from a room.
- **FR-N2** The navbar bell shows the unread count. The list can be opened, items marked read, or all marked read. The count refreshes by polling every 30 seconds.
- **FR-N3** Each room has an activity feed showing recent events (doubt posted, answer posted, answer accepted, deck added, member joined). The dashboard shows a combined feed for the student's rooms.

### 7.8 Dashboard (Core, with Growth widgets)

The Home page shows: greeting and quick actions (Create deck, Ask a doubt); streak and daily goal ring (Growth); cards due today with a Start revision button; a seven-day activity chart (Growth); my rooms; my unanswered doubts and recent answers to them; combined activity feed (Growth); and weekly points with rank (Growth). New users with no data see helpful empty states instead of blank widgets.

### 7.9 Profile (Core)

Shows name, email, join date, daily goal (editable), streak, total points, and the student's own doubts, answers and decks. Badges appear here (Stretch).

## 8. Points rules (Growth)

| Event | Points | Limit |
| --- | --- | --- |
| Post a doubt | +2 | Counts for the first 5 doubts each day |
| Post an answer | +5 | None |
| Your answer receives an upvote | +2 | None; removed if the vote is removed |
| Your answer is accepted | +15 | No points if the asker accepts their own answer |
| Complete a practice session (at least 5 cards) | +10 | First 3 sessions each day |
| Reach the daily goal | +5 | Once per day |

Every point award is a row linked to its source. If the source (for example an answer) is deleted, its points are removed with it, which prevents post-and-delete farming.

## 9. Key user flows

1. **First visit:** landing page → register → onboarding (daily goal, join or create a room) → dashboard.
2. **Ask for help:** room → Doubts → Ask → submit → other members are notified when they answer → asker accepts the best answer → answerer earns points.
3. **Turn an answer into revision:** open an accepted answer → Save as card → pick a deck → card appears in Decks and in tomorrow's due count.
4. **Daily revision:** dashboard → cards due → Start revision → flip, mark → summary → streak and points update.
5. **Build a deck:** Decks → New deck → set visibility → add cards → share with a room.

## 10. UX and design requirements

**Sitemap**

| Area | Pages |
| --- | --- |
| Public | Landing, Login, Register |
| App (sidebar) | Home, Rooms (list, discover, room page), Decks (list, deck detail, practice), Doubts (list, doubt detail), Leaderboard, Profile |
| Global | Notification bell, user menu |

**Landing page:** hero with headline, two calls to action, a product preview, three feature cards, a three-step How it works, a live stats strip (students, answers, cards practised) and a footer.

**Design system:** one accent colour on a white and soft-grey base, one typeface (Inter), Tailwind spacing scale, rounded cards, and a small reusable component set (Button, Input, Card, Badge, Modal, Toast, Avatar, EmptyState, Skeleton). Charts are drawn with plain SVG or CSS, with no chart library.

**States every page must handle:** loading (skeletons), empty (guidance and a call to action), error (clear message and retry), and success (toast confirmation).

**Responsive:** usable from 360 px width up. The sidebar collapses to a menu on mobile.

## 11. Non-functional requirements

| Area | Requirement |
| --- | --- |
| Security | Passwords hashed (bcrypt). Token-based auth. Parameterised SQL only. Server-side validation of all input. React escaping for user text. CORS limited to the frontend origin. Secrets only in environment variables. Authorisation checked on the server for every action in section 6 |
| Performance | Typical list and detail endpoints respond in under 300 ms on the demo dataset. Lists are paginated. Indexes on foreign keys and search columns |
| Reliability | Consistent JSON errors with correct status codes. No unhandled promise rejections. Graceful behaviour when MongoDB is unavailable (see 12.4) |
| Data integrity | Foreign keys, UNIQUE, NOT NULL and CHECK constraints enforce rules. Multi-table changes use transactions |
| Usability | At most three clicks from Home to any main action. Clear form validation messages |
| Accessibility | Sufficient colour contrast, labelled inputs, visible keyboard focus, semantic HTML |
| Compatibility | Latest Chrome, Edge and Firefox |
| Maintainability | Frontend and backend in separate folders. Backend organised as routes, controllers and database access. Consistent naming. Comments on non-obvious logic |
| Explainability | Every file and every query can be explained by the team in the viva |

## 12. Data requirements

### 12.1 Responsibilities of each database

- **PostgreSQL** is the source of truth for structured, related data that needs integrity: accounts, rooms, memberships, decks, cards, per-user card progress, doubts, answers, upvotes and points.
- **MongoDB** stores event-style data that grows quickly and has a flexible shape: study sessions, activity feed events, notifications and daily activity counters.

This split is the answer to why two databases: relationships and constraints belong in the relational store, high-volume loosely structured events belong in the document store. The exact split must be confirmed with the course instructor (see section 18).

### 12.2 PostgreSQL entities

| Table | Purpose and key columns | Relationships |
| --- | --- | --- |
| users | name, email (unique), password\_hash, daily\_goal, created\_at | Referenced by almost everything |
| subjects | name (unique) | One subject has many rooms and decks |
| rooms | name, description, subject\_id, visibility, invite\_code (unique), owner\_id | Belongs to a subject and an owner |
| room\_members | room\_id, user\_id, joined\_at. Primary key (room\_id, user\_id) | Many-to-many between users and rooms |
| decks | title, description, subject\_id, visibility, owner\_id, room\_id (nullable) | CHECK: room\_id is required when visibility is room |
| cards | deck\_id, front, back, source\_answer\_id (nullable) | Belongs to a deck, optionally traced to an answer |
| card\_progress | user\_id, card\_id, box (1 to 5), due\_date, last\_reviewed. Primary key (user\_id, card\_id) | Many-to-many between users and cards |
| doubts | room\_id, author\_id, title, body, created\_at | Belongs to a room and an author |
| answers | doubt\_id, author\_id, body, is\_accepted, created\_at | Unique partial index allows one accepted answer per doubt |
| answer\_upvotes | answer\_id, user\_id. Primary key (answer\_id, user\_id) | Many-to-many between users and answers |
| points\_events | user\_id, type, points, source\_type, source\_id, room\_id (nullable), created\_at | Source rows cascade on delete |
| badges, user\_badges | (Stretch) badge catalogue and awards | Many-to-many between users and badges |

These tables are the input for the normalization document (`dbms/01_normalization.md`): the unnormalised starting design, then 1NF, 2NF, 3NF and a BCNF check, with the functional dependencies for each table.

### 12.3 MongoDB collections

| Collection | Document contents |
| --- | --- |
| study\_sessions | user\_id, deck\_id, started\_at, duration\_seconds, cards (list of card\_id and result), known\_count, missed\_count |
| activity\_events | type, actor\_id, room\_id, reference ids, text summary, created\_at |
| notifications | recipient\_id, type, message, link, read flag, created\_at |
| daily\_activity | user\_id, date (IST), cards\_reviewed, answers\_posted, sessions. Used for streak, goal and chart |

Indexes: activity\_events on (room\_id, created\_at), notifications on (recipient\_id, read, created\_at), daily\_activity on (user\_id, date) unique.

### 12.4 Cross-database rules

1. PostgreSQL is written first and committed. MongoDB writes follow.
2. If a MongoDB write fails, the main action still succeeds and the error is logged. Activity, notifications and counters are treated as non-critical.
3. Identifiers in MongoDB are the PostgreSQL ids (as numbers), so documents can be joined to rows in application code.
4. When a user or room is deleted in PostgreSQL, related MongoDB documents are left as history or cleaned by the same controller.

### 12.5 Data lifecycle

Seed data: a script creates demo users, rooms, decks, cards, doubts, answers and a few weeks of activity so that every screen looks populated in the demo. The database can be reset and re-seeded with one command.

## 13. API overview

Exact routes are defined in the architecture phase. All routes live under `/api`, return JSON, and use standard status codes (200, 201, 400, 401, 403, 404, 409, 500).

| Group | Purpose |
| --- | --- |
| /auth | register, login, current user |
| /users | profile read and update, public stats |
| /rooms | create, list and discover, join, leave, members, update, delete |
| /decks and /decks/:id/cards | deck and card CRUD |
| /practice | get due cards, submit a session |
| /doubts and /doubts/:id/answers | doubts, answers, accept, upvote, save as card |
| /leaderboard | weekly ranking for a room |
| /notifications | list, mark read |
| /activity | room and dashboard feeds |
| /dashboard | aggregated summary for Home |

## 14. Concept coverage for the jury

| Area | Concepts demonstrated | Where |
| --- | --- | --- |
| Node.js | Modules, npm, async/await, environment variables, database drivers | Whole backend |
| Express | Routing, route params, query strings, JSON body parsing, custom middleware (logging, auth), error-handling middleware, status codes, CORS | All API routes |
| PostgreSQL | Primary and foreign keys, UNIQUE, NOT NULL, CHECK, partial unique index, many-to-many junction tables, JOIN, GROUP BY with aggregates, subqueries, indexes, transactions, ON DELETE CASCADE, seed scripts | Rooms, doubts, leaderboard, practice, points |
| Normalization | 1NF, 2NF, 3NF and BCNF reasoning | `dbms/01_normalization.md` |
| MongoDB | Collections and documents, insert, find with filters, update and upsert, aggregation pipeline, indexes | Sessions, activity, notifications, daily activity |
| Integration | Request lifecycle across React, Express, PostgreSQL and MongoDB | Every write action |
| React | Components, props, state, effects, routing, controlled forms, fetch, context for auth | Whole frontend |

**Example request lifecycle (answering a doubt):** the form posts to the answers route with the token. Express runs the logger and the auth middleware, the controller checks the user is a room member, inserts the answer and its points row inside a transaction, then writes the activity event and a notification to MongoDB, and returns 201 with the new answer. React updates the list and shows a toast.

## 15. Technical constraints and dependencies

- Frontend: React, JavaScript, HTML5, CSS3, Tailwind CSS. Backend: Node.js, Express. Databases: PostgreSQL and MongoDB. JavaScript only, no TypeScript.
- No other frameworks or services. Minimal packages, to be approved before use: pg, mongodb (or mongoose), bcrypt, jsonwebtoken, cors, dotenv, react-router-dom.
- No real-time library. Live-feeling updates use polling. Socket.io is only added if explicitly approved.
- No chart, UI-kit or state-management libraries.
- Repository: https://github.com/Vamsi-i7/EduWrap\_AP\_2026. The DE Practo assignment stays in its own repository.

## 16. Edge cases and rules

- Duplicate email on registration returns a clear conflict message.
- A student cannot join a room twice, upvote an answer twice, or accept two answers for one doubt (enforced by constraints, not only code).
- Non-members cannot read or write room content, even with a direct link (403).
- A deck switched from room to private is no longer visible to the room. Students keep their own progress on cards.
- Deleting a card removes its progress rows. Deleting a deck removes its cards.
- Leaving a room keeps the student's doubts and answers but hides them from them if they can no longer see the room.
- Practice with no due cards offers to review the deck anyway.
- All text input is trimmed and length-checked on client and server.
- Expired token mid-session shows a message and returns to login without losing the current page address.

## 17. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Scope too large for the deadline | Layered plan. Core must be complete before Growth starts. Stretch is cut first |
| Team cannot explain advanced parts | Basic concepts only. A one-page lifecycle and a concept map per feature for the viva |
| Two-database consistency | PostgreSQL first, MongoDB best-effort, rules written in 12.4 |
| Empty app looks lifeless in demo | Seed script with realistic data, good empty states |
| Instructor expects different database split | Confirm early (section 18) |
| UI polish consumes time | Fixed small design system and component set reused everywhere |

## 18. Timeline (proposed)

Academic DBMS checkpoints are fixed: CP1 Nov 16, CP2 Nov 17, CP3 Nov 19, CP4 Nov 23, CP5 Nov 25 to 26. The AP build dates below are a proposal and must be confirmed against the AP submission date.

| Date | Work |
| --- | --- |
| Nov 15 | Approve PRD |
| Nov 16 | CP1: schema and `dbms/01_normalization.md` |
| Nov 17 | UI/UX design (pages, components) and architecture approval |
| Nov 18 to 20 | Core build: auth, rooms, decks, practice, doubts, dashboard |
| Nov 21 to 22 | Growth build: streak, points, leaderboard, notifications, activity. Seed data |
| Nov 23 | Testing, bug fixes, documentation, jury walkthrough notes |
| Nov 25 to 26 | CP5 individual analysis |

## 19. Acceptance and definition of done

- Every Core requirement passes a written test case and a manual walkthrough.
- All permission rules in section 6 are verified, including direct-link access by non-members.
- Database constraints reject invalid data even when the API is bypassed.
- Both databases contain live data after a normal demo run.
- The app runs from a clean clone with a README and a seed command.
- The team can trace any button click through React, Express and both databases.
- `dbms/01_normalization.md` is committed and consistent with the final schema.

**Demo script (about 5 minutes):** register, onboarding, join a room, ask a doubt, answer from a second account, accept, save as card, practise the deck, show streak, points and leaderboard change, then show the rows in PostgreSQL and the documents in MongoDB.

## 20. Open decisions that need approval

1. Confirm with the instructor that PostgreSQL plus MongoDB with the split in 12.1 satisfies the capstone requirement.
2. Approve the dependency list in section 15 and the polling approach (no Socket.io).
3. Confirm the AP submission and viva dates for the timeline in section 18.
4. Decide whether registration should be limited to university email addresses (default: open).
5. Choose a project colour and logo direction (default: indigo, simple wordmark).
