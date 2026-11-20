const bcrypt = require('bcryptjs');
const db = require('../src/config/db');
const { connectMongo, getCollection } = require('../src/config/mongo');

async function runSeed() {
  console.log('🌱 Starting EduWrap 2.0 Database Seed & Reset...');

  // 1. Connect Mongo
  try {
    await connectMongo();
  } catch (err) {
    console.warn('⚠️ MongoDB connection note:', err.message);
  }

  // 2. Clean PostgreSQL tables
  console.log('🧹 Cleaning PostgreSQL eduwrap schema tables...');
  await db.query(`
    TRUNCATE TABLE 
      daily_activity,
      user_badges,
      badges,
      points_events,
      card_progress,
      cards,
      decks,
      answer_upvotes,
      answers,
      doubts,
      room_members,
      rooms,
      subjects,
      users
    RESTART IDENTITY CASCADE;
  `);

  // 3. Insert Subjects
  console.log('📚 Seeding Subjects...');
  const subRes = await db.query(`
    INSERT INTO subjects (name) VALUES
      ('Database Systems'),
      ('Algorithms & Data Structures'),
      ('Computer Architecture'),
      ('Operating Systems Internal'),
      ('Machine Learning Systems')
    RETURNING subject_id, name;
  `);
  const subjects = {};
  subRes.rows.forEach(r => { subjects[r.name] = r.subject_id; });

  // 4. Insert Badges
  console.log('🏅 Seeding Badges...');
  const badgeRes = await db.query(`
    INSERT INTO badges (name, description) VALUES
      ('First Answer', 'Post your first answer to a doubt'),
      ('7-Day Streak', 'Maintain a study streak for 7 consecutive days'),
      ('Helper', 'Have 5 answers marked as accepted'),
      ('Century', 'Review 100 cards')
    RETURNING badge_id, name;
  `);
  const badges = {};
  badgeRes.rows.forEach(r => { badges[r.name] = r.badge_id; });

  // 5. Insert Demo Users (password: password123)
  console.log('👥 Seeding Demo Users...');
  const passwordHash = await bcrypt.hash('password123', 10);
  const userSql = `
    INSERT INTO users (name, email, password_hash, daily_goal) VALUES
      ('Vamsi Krishna', 'vamsi@eduwrap.io', $1, 20),
      ('Shreya Das', 'shreya@eduwrap.io', $1, 30),
      ('Aryan Sharma', 'aryan@eduwrap.io', $1, 20),
      ('Diya Patel', 'diya@eduwrap.io', $1, 10),
      ('Kabir Mehta', 'kabir@eduwrap.io', $1, 50),
      ('EduWrap Team', 'team@eduwrap.io', $1, 20)
    RETURNING user_id, name, email;
  `;
  const usersRes = await db.query(userSql, [passwordHash]);
  const users = usersRes.rows;
  const vamsi = users[0];
  const shreya = users[1];
  const aryan = users[2];
  const diya = users[3];
  const kabir = users[4];
  const eduwrapTeam = users[5];

  // 6. Insert Study Rooms
  console.log('🏛️ Seeding Study Rooms...');
  const roomSql = `
    INSERT INTO rooms (name, description, subject_id, visibility, invite_code, owner_id) VALUES
      ('DBMS Masters (Section A)', 'Core database theory, normalization, storage engines and transactions.', $1, 'public', 'DBMS2026', $2),
      ('OS & Concurrency Lab', 'Kernel design, virtual memory, threads, synchronization primitives.', $3, 'public', 'OSLAB001', $4),
      ('DSA Hardcore Practice', 'Algorithms, dynamic programming, graph theory and problem solving.', $5, 'public', 'DSA2026X', $6),
      ('ML & AI Systems Group', 'Deep learning architectures, GPU acceleration, and inference optimization.', $7, 'private', 'MLAI2026', $8)
    RETURNING room_id, name;
  `;
  const roomsRes = await db.query(roomSql, [
    subjects['Database Systems'], vamsi.user_id,
    subjects['Operating Systems Internal'], shreya.user_id,
    subjects['Algorithms & Data Structures'], aryan.user_id,
    subjects['Machine Learning Systems'], diya.user_id
  ]);
  const dbmsRoom = roomsRes.rows[0];
  const osRoom = roomsRes.rows[1];
  const dsaRoom = roomsRes.rows[2];
  const mlRoom = roomsRes.rows[3];

  // 7. Insert Room Members
  console.log('🤝 Seeding Room Memberships...');
  for (const u of users) {
    // everyone joins DBMS and OS
    await db.query(`INSERT INTO room_members (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
      dbmsRoom.room_id, u.user_id
    ]);
    await db.query(`INSERT INTO room_members (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
      osRoom.room_id, u.user_id
    ]);
  }
  // Aryan, Diya, Vamsi in DSA
  for (const u of [aryan, diya, vamsi]) {
    await db.query(`INSERT INTO room_members (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
      dsaRoom.room_id, u.user_id
    ]);
  }
  // Diya, Kabir, Vamsi in ML
  for (const u of [diya, kabir, vamsi]) {
    await db.query(`INSERT INTO room_members (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
      mlRoom.room_id, u.user_id
    ]);
  }

  // 8. Insert Decks & Cards
  console.log('🗂️ Seeding Decks & Flashcards...');
  const deckNorm = (await db.query(`
    INSERT INTO decks (title, description, subject_id, visibility, owner_id, room_id)
    VALUES ('Relational Normalization & ACID', 'Master 1NF, 2NF, 3NF, BCNF, and transaction anomalies.', $1, 'room', $2, $3)
    RETURNING deck_id, title;
  `, [subjects['Database Systems'], vamsi.user_id, dbmsRoom.room_id])).rows[0];

  const deckIndex = (await db.query(`
    INSERT INTO decks (title, description, subject_id, visibility, owner_id, room_id)
    VALUES ('Indexing & B-Trees', 'Storage layouts, secondary indexes, B+ Tree leaf pointers and covering index.', $1, 'room', $2, $3)
    RETURNING deck_id, title;
  `, [subjects['Database Systems'], vamsi.user_id, dbmsRoom.room_id])).rows[0];

  const deckVM = (await db.query(`
    INSERT INTO decks (title, description, subject_id, visibility, owner_id, room_id)
    VALUES ('Virtual Memory & Paging', 'Paging, TLB, page replacement algorithms, and multi-level page tables.', $1, 'room', $2, $3)
    RETURNING deck_id, title;
  `, [subjects['Operating Systems Internal'], shreya.user_id, osRoom.room_id])).rows[0];

  const deckDP = (await db.query(`
    INSERT INTO decks (title, description, subject_id, visibility, owner_id, room_id)
    VALUES ('Dynamic Programming Patterns', '0/1 Knapsack, LCS, memoization templates, and tabulation.', $1, 'room', $2, $3)
    RETURNING deck_id, title;
  `, [subjects['Algorithms & Data Structures'], aryan.user_id, dsaRoom.room_id])).rows[0];

  // Cards for Normalization
  const cardsNorm = [
    { front: 'What is First Normal Form (1NF)?', back: 'A relation where every attribute contains only atomic (indivisible) values, and there are no repeating groups.' },
    { front: 'What is Second Normal Form (2NF)?', back: 'Relation in 1NF where every non-prime attribute is fully functionally dependent on the entire candidate key (no partial dependencies).' },
    { front: 'What defines Third Normal Form (3NF)?', back: 'Relation in 2NF where for every non-trivial FD X -> A, either X is a superkey OR A is a prime attribute (no transitive dependencies).' },
    { front: 'What defines Boyce-Codd Normal Form (BCNF)?', back: 'For every non-trivial functional dependency X -> A, X MUST be a superkey. Eliminates all anomalies from functional dependencies.' },
    { front: 'What does the ACID I (Isolation) guarantee?', back: 'Concurrent transactions execute as if they were running serially without interfering with each other.' }
  ];
  for (const c of cardsNorm) {
    const cardRes = await db.query(`INSERT INTO cards (deck_id, front, back) VALUES ($1, $2, $3) RETURNING card_id`, [deckNorm.deck_id, c.front, c.back]);
    // Seed card progress for Vamsi (Box 3 and 4)
    await db.query(`
      INSERT INTO card_progress (user_id, card_id, box, due_date, last_reviewed)
      VALUES ($1, $2, 3, CURRENT_DATE + 3, now())
    `, [vamsi.user_id, cardRes.rows[0].card_id]);
  }

  // Cards for Indexing
  const cardsIndex = [
    { front: 'Why are B+ Trees preferred over B-Trees for database indexes?', back: 'All keys and data records are stored in leaf nodes, keeping interior nodes small (higher fanout) and allowing sequential range scans via leaf node pointers.' },
    { front: 'What is a Covering Index?', back: 'An index that contains all columns required by a query, allowing the database engine to return data directly from the index without reading table heap blocks.' },
    { front: 'What is a clustered index in PostgreSQL?', back: 'An index whose ordering matches the physical storage order on disk (created via CLUSTER table USING index_name). Note that Postgres does not auto-maintain clustering on subsequent inserts.' }
  ];
  for (const c of cardsIndex) {
    const cardRes = await db.query(`INSERT INTO cards (deck_id, front, back) VALUES ($1, $2, $3) RETURNING card_id`, [deckIndex.deck_id, c.front, c.back]);
    // Seed card progress for Vamsi (Box 1 due today)
    await db.query(`
      INSERT INTO card_progress (user_id, card_id, box, due_date, last_reviewed)
      VALUES ($1, $2, 1, CURRENT_DATE, now() - interval '1 day')
    `, [vamsi.user_id, cardRes.rows[0].card_id]);
  }

  // Cards for VM & Paging
  const cardsVM = [
    { front: 'What is a Translation Lookaside Buffer (TLB)?', back: 'A high-speed hardware cache inside the CPU that stores recent virtual-to-physical page number translations to avoid walking multi-level page tables on every memory access.' },
    { front: 'What is Page Thrashing in OS?', back: 'A severe performance degradation where the OS spends more time swapping pages into and out of memory than executing processes, caused when working sets exceed physical RAM.' }
  ];
  for (const c of cardsVM) {
    await db.query(`INSERT INTO cards (deck_id, front, back) VALUES ($1, $2, $3)`, [deckVM.deck_id, c.front, c.back]);
  }

  // 8b. Public Starter Decks for Onboarding (owned by EduWrap Team)
  console.log('🌟 Seeding Public Starter Decks for Onboarding...');
  const starterDBMS = (await db.query(`
    INSERT INTO decks (title, description, subject_id, visibility, owner_id, room_id)
    VALUES ('DBMS & SQL Quickstart (Starter)', 'Essential starter cards for normalization (1NF-BCNF), ACID properties, and SQL Joins.', $1, 'public', $2, NULL)
    RETURNING deck_id, title;
  `, [subjects['Database Systems'], eduwrapTeam.user_id])).rows[0];

  const starterCardsDBMS = [
    { front: 'What is 1NF (First Normal Form)?', back: 'All attribute values are atomic (indivisible) and there are no repeating groups or multi-valued fields.' },
    { front: 'What is 2NF (Second Normal Form)?', back: 'Table is in 1NF and every non-prime attribute is fully functionally dependent on the primary key (no partial dependencies).' },
    { front: 'What is 3NF (Third Normal Form)?', back: 'Table is in 2NF and no non-prime attribute depends transitively on the primary key (no non-key to non-key dependencies).' },
    { front: 'What is BCNF (Boyce-Codd Normal Form)?', back: 'For every non-trivial functional dependency X -> Y, X must be a superkey.' },
    { front: 'Difference between INNER JOIN and LEFT JOIN?', back: 'INNER JOIN returns only matching rows from both tables. LEFT JOIN returns all rows from the left table and matched rows from the right table (or NULLs).' }
  ];
  for (const c of starterCardsDBMS) {
    await db.query(`INSERT INTO cards (deck_id, front, back) VALUES ($1, $2, $3)`, [starterDBMS.deck_id, c.front, c.back]);
  }

  const starterDSA = (await db.query(`
    INSERT INTO decks (title, description, subject_id, visibility, owner_id, room_id)
    VALUES ('Data Structures Fundamentals (Starter)', 'Quick recall on time complexity, heaps, binary search trees, and graphs.', $1, 'public', $2, NULL)
    RETURNING deck_id, title;
  `, [subjects['Algorithms & Data Structures'], eduwrapTeam.user_id])).rows[0];

  const starterCardsDSA = [
    { front: 'What is the average and worst-case time complexity of QuickSort?', back: 'Average: O(N log N). Worst: O(N^2) when poor pivots are chosen consistently.' },
    { front: 'What defines a Min-Heap?', back: 'A complete binary tree where the key at the root is less than or equal to the keys of its children.' },
    { front: 'What is the difference between BFS and DFS traversal?', back: 'BFS explores vertices level by level using a Queue (O(V+E)). DFS explores as deep as possible before backtracking using a Stack / Recursion.' }
  ];
  for (const c of starterCardsDSA) {
    await db.query(`INSERT INTO cards (deck_id, front, back) VALUES ($1, $2, $3)`, [starterDSA.deck_id, c.front, c.back]);
  }

  const starterOS = (await db.query(`
    INSERT INTO decks (title, description, subject_id, visibility, owner_id, room_id)
    VALUES ('Operating Systems Core (Starter)', 'Processes, threads, deadlock conditions, and page replacement basics.', $1, 'public', $2, NULL)
    RETURNING deck_id, title;
  `, [subjects['Operating Systems Internal'], eduwrapTeam.user_id])).rows[0];

  const starterCardsOS = [
    { front: 'What are the 4 Coffman conditions required for Deadlock?', back: '1. Mutual Exclusion\n2. Hold and Wait\n3. No Preemption\n4. Circular Wait' },
    { front: 'What is the difference between a Process and a Thread?', back: 'A process has its own independent address space and resources. A thread shares memory (heap, code, global data) with other threads of the same process.' },
    { front: 'What is the purpose of the LRU page replacement algorithm?', back: 'Replaces the page in physical memory that has not been referenced for the longest period of time.' }
  ];
  for (const c of starterCardsOS) {
    await db.query(`INSERT INTO cards (deck_id, front, back) VALUES ($1, $2, $3)`, [starterOS.deck_id, c.front, c.back]);
  }

  // 9. Insert Doubts & Answers
  console.log('💬 Seeding Doubts, Answers & Upvotes...');
  const doubt1 = await db.query(`
    INSERT INTO doubts (room_id, author_id, title, body)
    VALUES ($1, $2, 'Why does BCNF eliminate all redundancy based on FDs while 3NF does not?', 'In our DBMS lecture, the professor mentioned 3NF preserves dependencies but can still have redundancy if prime attributes are on the RHS. Can someone give a concrete real-world schema showing this anomaly?')
    RETURNING doubt_id;
  `, [dbmsRoom.room_id, aryan.user_id]);
  const d1Id = doubt1.rows[0].doubt_id;

  const ans1 = await db.query(`
    INSERT INTO answers (doubt_id, author_id, body, is_accepted)
    VALUES ($1, $2, 'Consider the schema R(Student, Course, Teacher) where:\n1. (Student, Course) -> Teacher\n2. Teacher -> Course\n\nKeys are (Student, Course) and (Student, Teacher). Both Student, Course, and Teacher are prime attributes!\n\nUnder 3NF: For Teacher -> Course, Course is a prime attribute, so this dependency is allowed in 3NF even though Teacher is NOT a superkey!\n\nAnomaly: If Teacher "Dr. Rao" teaches "DBMS", we repeat (Dr. Rao, DBMS) for every single student taking the course. If no students are enrolled, we cannot record that Dr. Rao teaches DBMS (Insert anomaly). BCNF forbids this because Teacher is not a superkey, forcing decomposition into (Student, Teacher) and (Teacher, Course).', true)
    RETURNING answer_id;
  `, [d1Id, vamsi.user_id]);
  const a1Id = ans1.rows[0].answer_id;

  // Upvotes for Answer 1
  for (const u of [aryan, shreya, diya, kabir]) {
    await db.query(`INSERT INTO answer_upvotes (answer_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [a1Id, u.user_id]);
  }

  const doubt2 = await db.query(`
    INSERT INTO doubts (room_id, author_id, title, body)
    VALUES ($1, $2, 'How does Write-Ahead Logging (WAL) ensure durability during sudden power loss?', 'If dirty pages are still in shared buffers during a crash, how does the engine safely replay state from disk?')
    RETURNING doubt_id;
  `, [dbmsRoom.room_id, diya.user_id]);
  const d2Id = doubt2.rows[0].doubt_id;

  const ans2 = await db.query(`
    INSERT INTO answers (doubt_id, author_id, body, is_accepted)
    VALUES ($1, $2, 'Postgres ensures that before ANY dirty data page is written to disk or a transaction commit completes, the corresponding WAL record describing the mutation is synchronously flushed to persistent disk (fsync).\n\nDuring recovery after a crash, Postgres begins at the latest Checkpoint record in WAL, then performs REDO to bring all data blocks up to date by reapplying log records using Log Sequence Numbers (LSN). Every page on disk has a page_lsn; if the WAL record LSN is greater, the change is replayed.', true)
    RETURNING answer_id;
  `, [d2Id, shreya.user_id]);
  const a2Id = ans2.rows[0].answer_id;

  for (const u of [diya, vamsi, aryan]) {
    await db.query(`INSERT INTO answer_upvotes (answer_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [a2Id, u.user_id]);
  }

  // 10. Seed Daily Activity & Streaks (Last 7 Days)
  console.log('📅 Seeding 7-Day Habit Activity & Streaks...');
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    // Vamsi has met goal all 7 days (7-day streak!)
    await db.query(`
      INSERT INTO daily_activity (user_id, activity_date, cards_reviewed, answers_posted, sessions_count)
      VALUES ($1, $2, $3, $4, $5)
    `, [vamsi.user_id, dateStr, 22 + (i * 2), i === 0 ? 1 : 0, 2]);

    // Shreya 7 days
    await db.query(`
      INSERT INTO daily_activity (user_id, activity_date, cards_reviewed, answers_posted, sessions_count)
      VALUES ($1, $2, $3, $4, $5)
    `, [shreya.user_id, dateStr, 35, 1, 3]);

    // Aryan 4 days
    if (i <= 3) {
      await db.query(`
        INSERT INTO daily_activity (user_id, activity_date, cards_reviewed, answers_posted, sessions_count)
        VALUES ($1, $2, $3, $4, $5)
      `, [aryan.user_id, dateStr, 20, 0, 1]);
    }

    // Seed daily_goal points_events for Vamsi and Shreya
    await db.query(`
      INSERT INTO points_events (user_id, points, event_type, event_date)
      VALUES ($1, 10, 'daily_goal', $2)
      ON CONFLICT DO NOTHING
    `, [vamsi.user_id, dateStr]);

    await db.query(`
      INSERT INTO points_events (user_id, points, event_type, event_date)
      VALUES ($1, 10, 'daily_goal', $2)
      ON CONFLICT DO NOTHING
    `, [shreya.user_id, dateStr]);
  }

  // 11. Seed Points Events for Doubts & Answers
  console.log('⭐ Seeding Points Events...');
  // Aryan asked doubt 1 (+5)
  await db.query(`
    INSERT INTO points_events (user_id, points, event_type, doubt_id)
    VALUES ($1, 5, 'ask_doubt', $2)
  `, [aryan.user_id, d1Id]);

  // Vamsi posted answer 1 (+10)
  await db.query(`
    INSERT INTO points_events (user_id, points, event_type, answer_id)
    VALUES ($1, 10, 'post_answer', $2)
  `, [vamsi.user_id, a1Id]);

  // Vamsi answer 1 accepted (+15)
  await db.query(`
    INSERT INTO points_events (user_id, points, event_type, answer_id)
    VALUES ($1, 15, 'answer_accepted', $2)
  `, [vamsi.user_id, a1Id]);

  // Vamsi received upvotes from aryan, shreya, diya, kabir (+2 each)
  for (const voter of [aryan, shreya, diya, kabir]) {
    await db.query(`
      INSERT INTO points_events (user_id, points, event_type, answer_id, voter_id)
      VALUES ($1, 2, 'answer_upvoted', $2, $3)
    `, [vamsi.user_id, a1Id, voter.user_id]);
  }

  // Diya asked doubt 2 (+5)
  await db.query(`
    INSERT INTO points_events (user_id, points, event_type, doubt_id)
    VALUES ($1, 5, 'ask_doubt', $2)
  `, [diya.user_id, d2Id]);

  // Shreya posted answer 2 (+10)
  await db.query(`
    INSERT INTO points_events (user_id, points, event_type, answer_id)
    VALUES ($1, 10, 'post_answer', $2)
  `, [shreya.user_id, a2Id]);

  // Shreya answer 2 accepted (+15)
  await db.query(`
    INSERT INTO points_events (user_id, points, event_type, answer_id)
    VALUES ($1, 15, 'answer_accepted', $2)
  `, [shreya.user_id, a2Id]);

  // Shreya received upvotes (+2 each)
  for (const voter of [diya, vamsi, aryan]) {
    await db.query(`
      INSERT INTO points_events (user_id, points, event_type, answer_id, voter_id)
      VALUES ($1, 2, 'answer_upvoted', $2, $3)
    `, [shreya.user_id, a2Id, voter.user_id]);
  }

  // Session completed points for Vamsi & Shreya
  await db.query(`
    INSERT INTO points_events (user_id, points, event_type, session_ref)
    VALUES ($1, 5, 'session_completed', 'sess_demo_vamsi_001')
  `, [vamsi.user_id]);
  await db.query(`
    INSERT INTO points_events (user_id, points, event_type, session_ref)
    VALUES ($1, 5, 'session_completed', 'sess_demo_shreya_001')
  `, [shreya.user_id]);

  // 12. Award Badges
  console.log('🎖️ Awarding Badges to Demo Users...');
  await db.query(`
    INSERT INTO user_badges (user_id, badge_id) VALUES
      ($1, $2), ($1, $3), ($1, $4),
      ($5, $2), ($5, $3), ($5, $6)
    ON CONFLICT DO NOTHING;
  `, [
    vamsi.user_id, badges['First Answer'], badges['7-Day Streak'], badges['Century'],
    shreya.user_id, badges['Helper']
  ]);

  // 13. Seed MongoDB Collections
  console.log('🍃 Seeding MongoDB Collections (Notifications, Activity, Sessions)...');
  try {
    const notifCol = getCollection('notifications');
    const actCol = getCollection('activity_events');
    const sessCol = getCollection('study_sessions');

    if (notifCol && notifCol.insertMany) {
      await notifCol.insertMany([
        {
          recipient_id: vamsi.user_id,
          actor_id: aryan.user_id,
          actor_name: 'Aryan Sharma',
          type: 'answer_accepted',
          title: 'Solution Accepted! (+15 pts)',
          body: 'Aryan accepted your explanation on BCNF vs 3NF.',
          reference_id: d1Id,
          reference_type: 'doubt',
          is_read: false,
          created_at: new Date()
        },
        {
          recipient_id: vamsi.user_id,
          actor_id: shreya.user_id,
          actor_name: 'Shreya Das',
          type: 'upvote_received',
          title: 'Upvote Received (+2 pts)',
          body: 'Shreya upvoted your answer on Normalization.',
          reference_id: a1Id,
          reference_type: 'answer',
          is_read: false,
          created_at: new Date(Date.now() - 3600000)
        }
      ]);
    }

    if (actCol && actCol.insertMany) {
      await actCol.insertMany([
        {
          room_id: dbmsRoom.room_id,
          user_id: vamsi.user_id,
          user_name: 'Vamsi Krishna',
          action: 'answer_accepted',
          details: 'Accepted answer on "Why does BCNF eliminate all redundancy..." (+15 pts)',
          created_at: new Date()
        },
        {
          room_id: dbmsRoom.room_id,
          user_id: shreya.user_id,
          user_name: 'Shreya Das',
          action: 'answer_accepted',
          details: 'Accepted answer on "How does Write-Ahead Logging (WAL) ensure durability..." (+15 pts)',
          created_at: new Date(Date.now() - 7200000)
        },
        {
          room_id: dbmsRoom.room_id,
          user_id: aryan.user_id,
          user_name: 'Aryan Sharma',
          action: 'doubt_created',
          details: 'Asked a new question: "Why does BCNF eliminate all redundancy based on FDs while 3NF does not?"',
          created_at: new Date(Date.now() - 14400000)
        }
      ]);
    }

    if (sessCol && sessCol.insertMany) {
      await sessCol.insertMany([
        {
          user_id: vamsi.user_id,
          deck_id: deckNorm.deck_id,
          cards_reviewed: 5,
          correct_count: 5,
          duration_seconds: 140,
          created_at: new Date()
        }
      ]);
    }
  } catch (err) {
    console.warn('MongoDB seed warning:', err.message);
  }

  console.log('\n✅ Database seeding complete! Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 Demo User 1: vamsi@eduwrap.io (Password: password123)');
  console.log('👤 Demo User 2: shreya@eduwrap.io (Password: password123)');
  console.log('👤 Demo User 3: aryan@eduwrap.io (Password: password123)');
  console.log('🏛️ Rooms: DBMS Masters (DBMS2026), OS Lab (OSLAB001), DSA (DSA2026X)');
  console.log('🗂️ Decks: Relational Normalization & ACID, Indexing & B-Trees, etc.');
  console.log('💬 Doubts & Answers with accepted solutions and upvotes populated');
  console.log('📅 7-Day continuous practice habit streak and weekly leaderboard active');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(0);
}

runSeed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
