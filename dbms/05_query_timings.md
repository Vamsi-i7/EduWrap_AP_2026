# EduWrap 2.0 – Query Execution Timings (CP4)
**Team T0055** | Section A | Rishihood University
**Authors:** Jayanth Pranay Konada (Database) & Chekka Chandra Mouli (Testing & Integration)

Every query is executed 3 times using `EXPLAIN (ANALYZE, BUFFERS)` in PostgreSQL against the normalized `eduwrap` schema.
Write queries are timed inside `BEGIN; ... ROLLBACK;` blocks.

| Query | Type | What it does | Run 1 (ms) | Run 2 (ms) | Run 3 (ms) | Average (ms) | Scan type |
|-------|------|--------------|-----------:|-----------:|-----------:|-------------:|-----------|
| R01 | READ | Login user by email - fetch credentials and settings | — | — | — | — | Pending Benchmark |
| R02 | READ | User profile header - aggregate points, badges, rooms, decks | — | — | — | — | Pending Benchmark |
| R03 | READ | User settings - get current daily goal and account timestamp | — | — | — | — | Pending Benchmark |
| W01 | WRITE | Register user - create new student account | — | — | — | — | Pending Benchmark |
| W02 | WRITE | Update daily goal - adjust target cards per day | — | — | — | — | Pending Benchmark |
| W03 | WRITE | Update profile name - change display name | — | — | — | — | Pending Benchmark |
| R04 | READ | List all subjects with room and deck counts | — | — | — | — | Pending Benchmark |
| W04 | WRITE | Create subject - add new academic subject | — | — | — | — | Pending Benchmark |
| R05 | READ | Browse public study rooms with subject and member count | — | — | — | — | Pending Benchmark |
| R06 | READ | Room overview - subject, owner, members, doubts, and decks | — | — | — | — | Pending Benchmark |
| R07 | READ | Look up room by 8-char invite code for joining | — | — | — | — | Pending Benchmark |
| R08 | READ | List rooms joined by user with owner and member count | — | — | — | — | Pending Benchmark |
| R09 | READ | Room member roster with roles and earned points | — | — | — | — | Pending Benchmark |
| W05 | WRITE | Create study room - insert room record | — | — | — | — | Pending Benchmark |
| W06 | WRITE | Join study room - add user to room_members | — | — | — | — | Pending Benchmark |
| W07 | WRITE | Leave study room - remove membership | — | — | — | — | Pending Benchmark |
| W08 | WRITE | Update study room details - name, desc, visibility | — | — | — | — | Pending Benchmark |
| W09 | WRITE | Delete study room - cascades to members and doubts | — | — | — | — | Pending Benchmark |
| R10 | READ | Browse accessible flashcard decks with card counts | — | — | — | — | Pending Benchmark |
| R11 | READ | Get deck details by ID with subject and creator | — | — | — | — | Pending Benchmark |
| R12 | READ | List cards in a deck with optional source doubt context | — | — | — | — | Pending Benchmark |
| R13 | READ | Get single card by ID with deck and subject information | — | — | — | — | Pending Benchmark |
| W10 | WRITE | Create flashcard deck | — | — | — | — | Pending Benchmark |
| W11 | WRITE | Update deck metadata - title, desc, visibility | — | — | — | — | Pending Benchmark |
| W12 | WRITE | Delete deck - cascades to cards and progress | — | — | — | — | Pending Benchmark |
| W13 | WRITE | Create flashcard in deck | — | — | — | — | Pending Benchmark |
| W14 | WRITE | Create card from accepted doubt answer | — | — | — | — | Pending Benchmark |
| W15 | WRITE | Update flashcard front and back content | — | — | — | — | Pending Benchmark |
| W16 | WRITE | Delete flashcard - cascades to progress | — | — | — | — | Pending Benchmark |
| R14 | READ | Get cards due for review today (Leitner boxes 1-5) | — | — | — | — | Pending Benchmark |
| R15 | READ | Deck mastery breakdown - 5-box Leitner distribution | — | — | — | — | Pending Benchmark |
| R16 | READ | Get unreviewed cards in deck never reviewed by user | — | — | — | — | Pending Benchmark |
| W17 | WRITE | Record card review - upsert box and next due date | — | — | — | — | Pending Benchmark |
| W18 | WRITE | Reset deck progress for user on given deck | — | — | — | — | Pending Benchmark |
| R17 | READ | List doubts in study room with answer counts and accepted flag | — | — | — | — | Pending Benchmark |
| R18 | READ | Filter unanswered doubts in a room needing answers | — | — | — | — | Pending Benchmark |
| R19 | READ | Get doubt details with room, subject, and author | — | — | — | — | Pending Benchmark |
| R20 | READ | Search doubts across rooms by keyword | — | — | — | — | Pending Benchmark |
| W19 | WRITE | Post new doubt in study room | — | — | — | — | Pending Benchmark |
| W20 | WRITE | Update doubt title and body | — | — | — | — | Pending Benchmark |
| W21 | WRITE | Delete doubt - cascades to answers and points | — | — | — | — | Pending Benchmark |
| R21 | READ | List answers for a doubt with upvotes and user vote state | — | — | — | — | Pending Benchmark |
| R22 | READ | Get answer details for card conversion context | — | — | — | — | Pending Benchmark |
| W22 | WRITE | Post answer to a doubt | — | — | — | — | Pending Benchmark |
| W23 | WRITE | Update answer body text | — | — | — | — | Pending Benchmark |
| W24 | WRITE | Accept answer - mark as accepted solution | — | — | — | — | Pending Benchmark |
| W25 | WRITE | Unaccept answer - clear accepted status | — | — | — | — | Pending Benchmark |
| W26 | WRITE | Delete answer - cascades to upvotes and points | — | — | — | — | Pending Benchmark |
| W27 | WRITE | Upvote answer - cast upvote | — | — | — | — | Pending Benchmark |
| W28 | WRITE | Remove upvote from answer | — | — | — | — | Pending Benchmark |
| R23 | READ | Room weekly leaderboard - DENSE_RANK by points this week | — | — | — | — | Pending Benchmark |
| R24 | READ | Global cohort weekly leaderboard - top students this week | — | — | — | — | Pending Benchmark |
| R25 | READ | User points activity ledger with source context | — | — | — | — | Pending Benchmark |
| R26 | READ | Badges catalogue with user earned status | — | — | — | — | Pending Benchmark |
| W29 | WRITE | Award points for asking doubt (+2 pts) | — | — | — | — | Pending Benchmark |
| W30 | WRITE | Award points for posting answer (+5 pts) | — | — | — | — | Pending Benchmark |
| W31 | WRITE | Award points for answer upvoted (+3 pts) | — | — | — | — | Pending Benchmark |
| W32 | WRITE | Award points for accepted answer (+15 pts) | — | — | — | — | Pending Benchmark |
| W33 | WRITE | Award points for completed study session (+10 pts) | — | — | — | — | Pending Benchmark |
| W34 | WRITE | Award points for daily goal reached (+10 pts) | — | — | — | — | Pending Benchmark |
| W35 | WRITE | Award badge to user | — | — | — | — | Pending Benchmark |
| R27 | READ | User personal dashboard overview - stats and activity | — | — | — | — | Pending Benchmark |
| R28 | READ | Room engagement analytics - summary stats for room header | — | — | — | — | Pending Benchmark |
