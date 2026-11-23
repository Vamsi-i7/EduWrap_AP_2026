# EduWrap 2.0 – Query Execution Timings (CP4)
**Team T0055** | Section A | Rishihood University  
**Authors:** Chekka Chandra Mouli (Testing & Integration) & Jayanth Pranay Konada (Database)  
**Date:** November 23, 2026 | **PostgreSQL Version:** 18.0 (Postgres.app)  

Every query from `dbms/04_queries.sql` was executed **3 consecutive times** using `EXPLAIN (ANALYZE, BUFFERS)` in PostgreSQL against the seeded `eduwrap` schema. Write queries were safely executed inside `BEGIN ... ROLLBACK` blocks to prevent data drift between runs.
The raw execution plans for each run are preserved in [`dbms/plans/`](plans/).

| Query | Type | What it does | Run 1 (ms) | Run 2 (ms) | Run 3 (ms) | Average (ms) | Scan type |
|-------|------|--------------|-----------:|-----------:|-----------:|-------------:|-----------|
| R01 | READ | Login user by email - fetch credentials and settings | 0.021 | 0.021 | 0.022 | 0.021 | Index Scan using users_email_key on users |
| R02 | READ | User profile header - aggregate points, badges, rooms, decks | 0.342 | 0.299 | 0.263 | 0.301 | Index Scan using users_pkey on users | Seq Scan on points_events | Seq Scan on decks | Bitmap Heap Scan on user_badges | Bitmap Index Scan on user_badges_pkey | Bitmap Heap Scan on room_members | Bitmap Index Scan on room_members_pkey |
| R03 | READ | User settings - get current daily goal and account timestamp | 0.020 | 0.020 | 0.019 | 0.020 | Index Scan using users_pkey on users |
| W01 | WRITE | Register user - create new student account | 0.137 | 0.141 | 0.135 | 0.138 | — |
| W02 | WRITE | Update daily goal - adjust target cards per day | 0.134 | 0.116 | 0.105 | 0.118 | Index Scan using users_pkey on users |
| W03 | WRITE | Update profile name - change display name | 0.114 | 0.113 | 0.119 | 0.115 | Index Scan using users_pkey on users |
| R04 | READ | List all subjects with room and deck counts | 0.082 | 0.084 | 0.088 | 0.085 | Seq Scan on rooms | Seq Scan on decks | Seq Scan on subjects |
| W04 | WRITE | Create subject - add new academic subject | 0.093 | 0.083 | 0.084 | 0.087 | — |
| R05 | READ | Browse public study rooms with subject and member count | 0.084 | 0.079 | 0.074 | 0.079 | Seq Scan on rooms | Index Scan using subjects_pkey on subjects | Index Scan using users_pkey on users | Bitmap Heap Scan on room_members | Bitmap Index Scan on room_members_pkey |
| R06 | READ | Room overview - subject, owner, members, doubts, and decks | 0.111 | 0.104 | 0.104 | 0.106 | Index Scan using rooms_pkey on rooms | Index Scan using subjects_pkey on subjects | Index Scan using users_pkey on users | Seq Scan on decks | Seq Scan on doubts | Bitmap Heap Scan on room_members | Bitmap Index Scan on room_members_pkey |
| R07 | READ | Look up room by 8-char invite code for joining | 0.026 | 0.027 | 0.027 | 0.027 | Index Scan using rooms_invite_code_key on rooms | Index Scan using subjects_pkey on subjects | Index Scan using users_pkey on users |
| R08 | READ | List rooms joined by user with owner and member count | 0.099 | 0.098 | 0.107 | 0.101 | Seq Scan on rooms | Bitmap Heap Scan on room_members | Bitmap Index Scan on room_members_pkey | Index Scan using subjects_pkey on subjects | Index Scan using users_pkey on users | Index Only Scan using room_members_pkey on room_members |
| R09 | READ | Room member roster with roles and earned points | 0.096 | 0.110 | 0.093 | 0.100 | Index Scan using rooms_pkey on rooms | Seq Scan on points_events | Seq Scan on users | Bitmap Heap Scan on room_members | Bitmap Index Scan on room_members_pkey |
| W05 | WRITE | Create study room - insert room record | 0.407 | 0.514 | 0.421 | 0.447 | — |
| W06 | WRITE | Join study room - add user to room_members | 0.040 | 0.040 | 0.040 | 0.040 | — |
| W07 | WRITE | Leave study room - remove membership | 0.056 | 0.058 | 0.056 | 0.057 | Index Scan using room_members_pkey on room_members |
| W08 | WRITE | Update study room details - name, desc, visibility | 0.116 | 0.118 | 0.120 | 0.118 | Index Scan using rooms_pkey on rooms |
| W09 | WRITE | Delete study room - cascades to members and doubts | 0.321 | 0.325 | 0.306 | 0.317 | Index Scan using rooms_pkey on rooms |
| R10 | READ | Browse accessible flashcard decks with card counts | 0.144 | 0.133 | 0.138 | 0.138 | Seq Scan on cards | Seq Scan on decks | Bitmap Heap Scan on room_members | Bitmap Index Scan on room_members_pkey | Index Scan using subjects_pkey on subjects | Index Scan using users_pkey on users | Index Scan using rooms_pkey on rooms |
| R11 | READ | Get deck details by ID with subject and creator | 0.080 | 0.073 | 0.071 | 0.075 | Index Scan using decks_pkey on decks | Index Scan using subjects_pkey on subjects | Index Scan using users_pkey on users | Index Scan using rooms_pkey on rooms | Seq Scan on cards |
| R12 | READ | List cards in a deck with optional source doubt context | 0.056 | 0.054 | 0.055 | 0.055 | Index Scan using decks_pkey on decks | Seq Scan on answers | Seq Scan on cards | Index Scan using doubts_pkey on doubts |
| R13 | READ | Get single card by ID with deck and subject information | 0.041 | 0.039 | 0.037 | 0.039 | Index Scan using cards_pkey on cards | Index Scan using decks_pkey on decks | Index Scan using subjects_pkey on subjects | Index Scan using users_pkey on users |
| W10 | WRITE | Create flashcard deck | 0.523 | 0.508 | 0.532 | 0.521 | — |
| W11 | WRITE | Update deck metadata - title, desc, visibility | 0.118 | 0.112 | 0.122 | 0.117 | Index Scan using decks_pkey on decks |
| W12 | WRITE | Delete deck - cascades to cards and progress | 0.302 | 0.297 | 0.276 | 0.292 | Index Scan using decks_pkey on decks |
| W13 | WRITE | Create flashcard in deck | 0.326 | 0.292 | 0.328 | 0.315 | — |
| W14 | WRITE | Create card from accepted doubt answer | 0.397 | 0.405 | 0.385 | 0.396 | — |
| W15 | WRITE | Update flashcard front and back content | 0.103 | 0.101 | 0.103 | 0.102 | Index Scan using cards_pkey on cards |
| W16 | WRITE | Delete flashcard - cascades to progress | 0.174 | 0.228 | 0.208 | 0.203 | Index Scan using cards_pkey on cards |
| R14 | READ | Get cards due for review today (Leitner boxes 1-5) | 0.069 | 0.057 | 0.064 | 0.063 | Seq Scan on cards | Bitmap Heap Scan on card_progress | Bitmap Index Scan on card_progress_pkey | Index Scan using decks_pkey on decks | Index Scan using subjects_pkey on subjects |
| R15 | READ | Deck mastery breakdown - 5-box Leitner distribution | 0.050 | 0.063 | 0.065 | 0.059 | Index Scan using decks_pkey on decks | Seq Scan on cards | Bitmap Heap Scan on card_progress | Bitmap Index Scan on card_progress_pkey |
| R16 | READ | Get unreviewed cards in deck never reviewed by user | 0.043 | 0.049 | 0.041 | 0.044 | Seq Scan on cards | Bitmap Heap Scan on card_progress | Bitmap Index Scan on card_progress_pkey | Index Scan using decks_pkey on decks |
| W17 | WRITE | Record card review - upsert box and next due date | 0.113 | 0.114 | 0.134 | 0.120 | — |
| W18 | WRITE | Reset deck progress for user on given deck | 0.079 | 0.075 | 0.077 | 0.077 | Seq Scan on cards | Bitmap Heap Scan on card_progress | Bitmap Index Scan on card_progress_pkey |
| R17 | READ | List doubts in study room with answer counts and accepted flag | 0.071 | 0.067 | 0.069 | 0.069 | Seq Scan on users | Seq Scan on answers | Seq Scan on doubts |
| R18 | READ | Filter unanswered doubts in a room needing answers | 0.045 | 0.041 | 0.044 | 0.043 | Seq Scan on answers | Seq Scan on doubts | Index Scan using rooms_pkey on rooms | Index Scan using users_pkey on users |
| R19 | READ | Get doubt details with room, subject, and author | 0.036 | 0.044 | 0.037 | 0.039 | Index Scan using doubts_pkey on doubts | Index Scan using rooms_pkey on rooms | Index Scan using subjects_pkey on subjects | Index Scan using users_pkey on users |
| R20 | READ | Search doubts across rooms by keyword | 0.067 | 0.065 | 0.064 | 0.065 | Seq Scan on answers | Seq Scan on doubts | Index Scan using rooms_pkey on rooms | Index Scan using subjects_pkey on subjects | Index Scan using users_pkey on users |
| W19 | WRITE | Post new doubt in study room | 0.416 | 0.462 | 0.482 | 0.453 | — |
| W20 | WRITE | Update doubt title and body | 0.054 | 0.054 | 0.046 | 0.051 | Index Scan using doubts_pkey on doubts |
| W21 | WRITE | Delete doubt - cascades to answers and points | 0.563 | 0.504 | 0.503 | 0.523 | Index Scan using doubts_pkey on doubts |
| R21 | READ | List answers for a doubt with upvotes and user vote state | 0.096 | 0.080 | 0.081 | 0.086 | Seq Scan on answer_upvotes | Seq Scan on users | Seq Scan on answers | Index Only Scan using answer_upvotes_pkey on answer_upvotes |
| R22 | READ | Get answer details for card conversion context | 0.038 | 0.033 | 0.037 | 0.036 | Index Scan using answers_pkey on answers | Index Scan using doubts_pkey on doubts | Index Scan using rooms_pkey on rooms | Index Scan using users_pkey on users |
| W22 | WRITE | Post answer to a doubt | 0.389 | 0.376 | 0.358 | 0.374 | — |
| W23 | WRITE | Update answer body text | 0.049 | 0.048 | 0.046 | 0.048 | Index Scan using answers_pkey on answers |
| W24 | WRITE | Accept answer - mark as accepted solution | 0.093 | 0.095 | 0.094 | 0.094 | Index Scan using answers_pkey on answers |
| W25 | WRITE | Unaccept answer - clear accepted status | 0.109 | 0.106 | 0.100 | 0.105 | Index Scan using uq_one_accepted_answer on answers |
| W26 | WRITE | Delete answer - cascades to upvotes and points | 0.401 | 0.418 | 0.423 | 0.414 | Index Scan using answers_pkey on answers |
| W27 | WRITE | Upvote answer - cast upvote | 0.040 | 0.039 | 0.038 | 0.039 | — |
| W28 | WRITE | Remove upvote from answer | 0.234 | 0.246 | 0.250 | 0.243 | Index Scan using answer_upvotes_pkey on answer_upvotes |
| R23 | READ | Room weekly leaderboard - DENSE_RANK by points this week | 0.099 | 0.098 | 0.095 | 0.097 | Seq Scan on points_events | Seq Scan on users | Bitmap Heap Scan on room_members | Bitmap Index Scan on room_members_pkey |
| R24 | READ | Global cohort weekly leaderboard - top students this week | 0.067 | 0.066 | 0.065 | 0.066 | Seq Scan on points_events | Seq Scan on users |
| R25 | READ | User points activity ledger with source context | 0.089 | 0.072 | 0.069 | 0.077 | Seq Scan on users | Seq Scan on points_events | Index Scan using doubts_pkey on doubts | Index Scan using answers_pkey on answers |
| R26 | READ | Badges catalogue with user earned status | 0.050 | 0.050 | 0.054 | 0.051 | Seq Scan on badges | Bitmap Heap Scan on user_badges | Bitmap Index Scan on user_badges_pkey |
| W29 | WRITE | Award points for asking doubt (+2 pts) | 0.505 | 0.434 | 0.521 | 0.487 | — |
| W30 | WRITE | Award points for posting answer (+5 pts) | 0.485 | 0.530 | 0.486 | 0.500 | — |
| W31 | WRITE | Award points for answer upvoted (+3 pts) | 0.521 | 0.520 | 0.547 | 0.529 | — |
| W32 | WRITE | Award points for accepted answer (+15 pts) | 0.453 | 0.442 | 0.516 | 0.470 | — |
| W33 | WRITE | Award points for completed study session (+10 pts) | 0.385 | 0.374 | 0.371 | 0.377 | — |
| W34 | WRITE | Award points for daily goal reached (+10 pts) | 0.096 | 0.094 | 0.092 | 0.094 | — |
| W35 | WRITE | Award badge to user | 0.045 | 0.040 | 0.044 | 0.043 | — |
| R27 | READ | User personal dashboard overview - stats and activity | 0.197 | 0.208 | 0.221 | 0.209 | Index Scan using users_pkey on users | Seq Scan on points_events | Seq Scan on doubts | Seq Scan on answers | Bitmap Heap Scan on card_progress | Bitmap Index Scan on card_progress_pkey | Bitmap Heap Scan on room_members | Bitmap Index Scan on room_members_pkey |
| R28 | READ | Room engagement analytics - summary stats for room header | 0.142 | 0.155 | 0.126 | 0.141 | Index Scan using rooms_pkey on rooms | Seq Scan on cards | Seq Scan on decks | Seq Scan on answers | Seq Scan on doubts | Bitmap Heap Scan on room_members | Bitmap Index Scan on room_members_pkey |

## Execution Summary & Analysis

1. **Total Queries Evaluated:** 63 queries (28 `READ`, 35 `WRITE`), covering 100% of the operational workload defined in `04_queries.sql`.
2. **Latency Profile:**
   - **READ Workload:** Average execution time ranges between **0.019 ms** (simple PK lookup like `R03`) and **0.301 ms** (complex multi-table aggregation like `R02`). Overall READ mean latency: **~0.09 ms**.
   - **WRITE Workload:** Average execution time ranges between **0.040 ms** (`W06`) and **0.529 ms** (`W31`). Overall WRITE mean latency: **~0.25 ms**.
   - Sub-millisecond performance is achieved across all 63 queries in PostgreSQL 18.0.
3. **Buffer Management:**
   - Shared buffer cache hits (`Buffers: shared hit`) accounted for **100%** of data page accesses across all three execution runs, indicating zero disk I/O stalls after warm-up.
4. **Scan Method Distribution:**
   - **Index & Index-Only Scans:** Utilized for all single-entity lookups, unique constraint checks, and foreign-key joins (`users_pkey`, `users_email_key`, `rooms_invite_code_key`, `decks_pkey`, etc.).
   - **Bitmap Index Scans:** Leveraged for multi-row child joins (such as `room_members_pkey`, `user_badges_pkey`, `card_progress_pkey`) to efficiently construct heap block bitmap filters.
   - **Sequential Scans:** Selectively utilized by PostgreSQL query planner on small tables (e.g., `subjects`, `points_events`) where sequential scan cost is lower than random index lookups for small cardinality.
