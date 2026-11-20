# EduWrap 2.0 — Dual-Database Integration & Resilience Check
**Author:** Chekka Chandra Mouli (Mouli) — Testing, Integration & Documentation (Team T0055)  
**Deliverable:** Integration verification & MongoDB fault tolerance analysis

---

## 1. Dual-Database Responsibility Matrix

| Feature Domain | PostgreSQL Responsibility (Source of Truth) | MongoDB Responsibility (Event & Telemetry Layer) | Behavior if MongoDB is Offline |
|---|---|---|---|
| **User Onboarding** | Writes `users` row (`user_id`, `name`, `email`, `password_hash`, `daily_goal`). | Writes welcome event to `activity_events`. | ✅ Registration succeeds. User logs in normally. |
| **Study Rooms** | Writes `rooms` and `room_members`. Enforces invite codes and cascade deletes. | Appends room creation event to `activity_events`. | ✅ Room created; invite code generated; members join. |
| **Card Practice** | Updates `card_progress` (Leitner box & due date); writes `daily_activity` and `points_events`. | Writes full session document to `study_sessions` with embedded card results array. | ✅ Spaced repetition, streak, daily goal, and points all update accurately in PostgreSQL. |
| **Doubt Board** | Writes `doubts`, `answers`, and `answer_upvotes`. Enforces 1 accepted answer. | Appends notifications to `notifications` collection. | ✅ Doubts, answers, and upvotes persist. Notification queued in memory. |
| **Leaderboards** | Computes weekly rankings from `room_members` joined to `points_events`. | None (pure relational computation). | ✅ 100% unaffected. |

---

## 2. End-to-End Request Tracing (React → Express → PostgreSQL → MongoDB)

### Test Case INT-01: Submitting Card Practice Session
1. **Frontend Trigger (`PracticePage.jsx`):**
   - User reviews 5 flashcards (4 correct, 1 missed).
   - React sends payload:
     ```json
     {
       "deckId": 1,
       "sessionDurationSeconds": 145,
       "cardsReviewed": [
         { "cardId": 10, "isKnown": true },
         { "cardId": 11, "isKnown": true },
         { "cardId": 12, "isKnown": false },
         { "cardId": 13, "isKnown": true },
         { "cardId": 14, "isKnown": true }
       ]
     }
     ```
2. **Backend Processing (`practice.controller.js`):**
   - Auth middleware decodes JWT and sets `req.user.user_id = 1`.
   - Starts PostgreSQL transaction (`BEGIN`).
   - Executes 5 `card_progress` UPSERT queries updating Leitner boxes (Cards 10, 11, 13, 14 incremented; Card 12 reset to Box 1).
   - Increments `daily_activity.cards_reviewed += 5`.
   - Awards `session_completed` (+10 pts) in `points_events`.
   - Checks if user reached their daily goal (20 cards). If yes, records `daily_goal` (+10 pts) in `points_events`.
   - Commits transaction (`COMMIT`).
   - Passes session object to `getCollection('study_sessions').insertOne(doc)`.
3. **Storage Verification:**
   - **PostgreSQL:**
     ```sql
     SELECT box, due_date FROM card_progress WHERE user_id = 1 AND card_id = 12;
     -- Result: box = 1, due_date = tomorrow
     SELECT points, event_type FROM points_events WHERE user_id = 1 ORDER BY event_id DESC LIMIT 2;
     -- Result: 10 pts (session_completed)
     ```
   - **MongoDB:**
     ```javascript
     db.study_sessions.findOne({ user_id: 1, deck_id: 1 });
     // Result: document with cardsReviewed array (length: 5)
     ```

---

## 3. Resilience Verification: MongoDB Offline Fault Tolerance

A critical non-functional requirement for EduWrap 2.0 is that relational data integrity and core user habit loops **must not degrade** if the NoSQL service is temporarily unavailable or unreachable.

### Simulation Protocol
1. Stop or disconnect the local MongoDB daemon:
   ```bash
   # MongoDB unreachable simulation
   export MONGODB_URI="mongodb://localhost:27999/eduwrap_unreachable"
   ```
2. Start the Express backend:
   ```bash
   node server.js
   ```
3. Observe backend startup log:
   ```text
   [PostgreSQL] Connected to DB 'eduwrap' on schema 'eduwrap'
   [MongoDB] Not available; operating in memory-fallback mode: connect ECONNREFUSED
   [Server] EduWrap 2.0 Backend Server Running on Port 5001
   ```
4. Perform student actions:
   - User Registration (`POST /api/auth/register`) → **201 Created**
   - Card Practice (`POST /api/practice/session`) → **200 OK**
   - Post Doubt (`POST /api/doubts`) → **201 Created**
   - Upvote Answer (`POST /api/answers/1/upvote`) → **200 OK**
5. Verify PostgreSQL integrity:
   - `card_progress` has correct Leitner boxes and due dates.
   - `daily_activity` records card counts and streak correctly.
   - `points_events` records exact points (+10 for session, +2 for doubt, +3 for upvote).
   - `/api/leaderboard/cohort` reflects updated points.
6. **Result:** **PASSED**. PostgreSQL ACID guarantees keep student progress, streaks, and points 100% consistent even during NoSQL downtime.
