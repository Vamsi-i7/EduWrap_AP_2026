# EduWrap 2.0 – Design Specification (Light Theme)

**Version 2.0 · November 20, 2026**
Team T0055, Section A · AP capstone · companion to the Product Requirements Document (PRD)

This document defines how every page of EduWrap looks and behaves in the warm light theme. It contains no code. It is the reference for Phase 2 (UI/UX) and the input for building the React components in Phase 4.

Requirement IDs such as FR-Q5 refer to the PRD.

---

## 1. Design principles

1. **Bento, not clutter.** Every screen is a grid of rounded tiles. One tile answers one question.
2. **Warm and focused.** A soft cream and ivory light theme with deep espresso text and burnt amber highlights. The amber draws the eye to the one thing worth doing next.
3. **One primary action per tile.** At most one amber button is visible per tile, and rarely more than two per screen.
4. **Reuse over invent.** All pages are built from the same small set of components (section 5).
5. **Never blank.** Every list and tile has a loading, empty and error state.
6. **Explainable.** Every page maps to specific API calls and tables, so the team can explain it in the viva.

---

## 2. Visual foundation

### 2.1 Colour

The palette follows a 60-30-10 split.

| Share | Role | Colour | Hex |
|---|---|---|---|
| 60% | Cream & Ivory, the main surface family | Cream 200 (outer frame & left rail) | `#EFE6D5` |
| | | Cream 100 (page canvas) | `#F7F2E8` |
| | | **Ivory 50 (base tile surface)** | **`#FDFBF7`** |
| | | Cream 150 (raised tile, hover, inputs, tags) | `#F2EAE0` |
| | | Sand 300 (borders and dividers) | `#E2D6C5` |
| 30% | Espresso, text and dark accents | **Espresso 900 (primary text, headings, icons)** | **`#2C2016`** |
| | | Espresso 700 (secondary text) | `#5E4B3B` |
| | | Espresso 500 (muted text, placeholders, captions) | `#8C7664` |
| 10% | Burnt amber, accent and glow | **Amber 500 (buttons, ring, active states)** | **`#C8792C`** |
| | | Amber 400 (hover) | `#DB8B3B` |
| | | Amber 600 (pressed) | `#A8641F` |
| | | Amber glow (shadow colour, 25% opacity) | `rgba(200,121,44,0.25)` |

**Semantic colours** (used sparingly, always with an icon or label, never colour alone)

| Meaning | Hex | Use |
|---|---|---|
| Success | `#2E7D32` (text) / `#E8F5E9` (tint) | Known card, saved, accepted answer |
| Error | `#C62828` (text) / `#FFEBEE` (tint) | Validation errors, failed requests |
| Warning | `#B26A00` (text) / `#FFF3E0` (tint) | Expiring session, destructive confirmations |

**Contrast rules** (approximate values, to be verified in the browser during build)

- Espresso 900 on Ivory 50: about 14.8 to 1. Use for headings and primary body text.
- Espresso 700 on Ivory 50: about 7.6 to 1. Use for secondary text.
- Espresso 500 on Ivory 50: about 4.5 to 1. Use for captions and muted metadata.
- Amber 500 on Ivory 50: about 3.2 to 1. **Never use amber for small body text.** Use Amber 600 (`#A8641F`, ~4.6 to 1) for text links/labels, and Amber 500 for the ring, large shapes, icons, borders, active indicators and glows.
- Text on amber buttons is Ivory 50 (`#FDFBF7`, ~3.2 to 1) or Espresso 900 (`#2C2016`, ~4.6 to 1) depending on button size; bold large labels (`16 px+` bold) pass AA on `#C8792C` with `#FDFBF7` white/ivory text as shown in the dashboard preview.

### 2.2 Typography

One family: **Inter** (system sans-serif as fallback).

| Style | Size / weight | Use |
|---|---|---|
| Display | 48 px / 700 | Landing hero only |
| H1 | 32 px / 700 | Page titles |
| H2 | 24 px / 600 | Tile titles, section titles |
| H3 | 20 px / 600 | Card titles, modal titles |
| Body | 16 px / 400 | Main text |
| Small | 14 px / 400 | Secondary text, table rows |
| Caption | 12 px / 500 | Tags, hints, timestamps |

Line height 1.5 for body, 1.2 for headings. Numbers in stat tiles use tabular figures.

### 2.3 Spacing, shape and depth

- **Spacing scale:** 4 px base (4, 8, 12, 16, 24, 32, 48).
- **Outer frame:** the whole app sits inside a rounded frame (radius 32 px, Cream 100 fill with a thin Sand 300 border).
- **Tiles:** radius 24 px, Ivory 50 fill (`#FDFBF7`), 1 px Sand 300 border (`#E2D6C5`), 16 px gap between tiles, 20 to 24 px inner padding.
- **Pills:** fully rounded (buttons, tags, filter chips, search bar).
- **Inputs:** radius 14 px, Cream 150 fill (`#F2EAE0`), 1 px Sand 300 border.
- **Glow:** a soft amber shadow (blur 24 to 36 px, 25% opacity) behind the daily-goal ring, the primary button on hover, and the number-one leaderboard tile. Nothing else glows.
- **Elevation:** crisp 1 px Sand 300 borders and subtle tonal shifts between Cream 200 (rail), Cream 100 (canvas), and Ivory 50 (tiles), paired with a whisper-soft ambient shadow (`0 2px 8px rgba(44,32,22,0.03)`).

### 2.4 Icons

A single set of 24 px outline icons in Espresso 900 / 700, drawn as inline SVG (no icon library, per the dependency rule). Needed icons: home, rooms (users), decks (layers), doubts (message), leaderboard (trophy), bell, plus, search, flame, check, upvote arrow, bookmark, flip, close, edit, trash, lock, globe, copy, logout, chevrons.

### 2.5 Motion

| Interaction | Behaviour |
|---|---|
| Hover on button or tile | 150 ms ease, slight warm tint shift, glow on primary buttons |
| Card flip in practice | 400 ms, rotation on the vertical axis |
| Ring fill | 800 ms ease-out on load |
| Modal and drawer | 200 ms fade and slide |
| Toast | slides in from the bottom right, 3 s, then fades |
| Streak or goal reached | one soft glow pulse, 1 s |

All motion is disabled or reduced when the user has reduced-motion enabled.

---

## 3. Layout system

### 3.1 App shell

```
+--------------------------------------------------------------+
| outer frame (Cream 100 / Cream 200 rail)                     |
| +----+  +----------------------------------------------+     |
| | RAIL|  | Page header: title ........ search  bell  me |     |
| |     |  +----------------------------------------------+     |
| | me  |  |                                              |     |
| | Home|  |            bento grid of tiles               |     |
| | Room|  |                                              |     |
| | Deck|  |                                              |     |
| | Doub|  |                                              |     |
| | Lead|  |                                              |     |
| |     |  |                                              |     |
| | out |  |                                              |     |
| +----+  +----------------------------------------------+     |
+--------------------------------------------------------------+
```

- **Left rail** (72 px wide, Cream 200 `#EFE6D5` fill): avatar at the top (opens Profile), five icon buttons (Home, Rooms, Decks, Doubts, Leaderboard), logout at the bottom. Each icon shows a label tooltip on hover. The active item sits inside an Ivory 50 rounded square with an Amber 500 left indicator bar and amber-tinted icon.
- **Page header:** page title on the left in Espresso 900. On the right a pill search bar (Cream 150 fill), a notification bell (with an amber unread dot), and a small avatar. Page-level actions (for example New deck) sit in the header as pills.
- **Content area:** a 12-column grid with 16 px gaps on a Cream 100 (`#F7F2E8`) canvas.

### 3.2 Breakpoints

| Width | Layout |
|---|---|
| 1280 px and above | Full 12-column bento grid, left rail |
| 768 to 1279 px | 8-column grid, left rail stays, tiles reflow to two per row |
| Below 768 px | Single column, rail becomes a **bottom tab bar** with five icons, header shrinks to title and bell |

### 3.3 Page types

| Type | Used by | Shell |
|---|---|---|
| Public | Landing, Login, Register | No rail, top navbar |
| Setup | Onboarding | No rail, centred tile |
| App | Everything inside the product | Full app shell |
| Focus | Practice session | No rail, no header, one centred card |
| System | 404, 403, error | Minimal, centred tile |

---

## 4. Site map and routes

| Route | Page | Access |
|---|---|---|
| `/` | Landing | Public |
| `/login` | Login | Public |
| `/register` | Register | Public |
| `/onboarding` | Onboarding (steps 1 and 2) | Logged in, first visit |
| `/home` | Home (dashboard) | Student |
| `/rooms` | Rooms (My rooms, Discover) | Student |
| `/rooms/:id` | Room page (Overview, Doubts, Decks, Leaderboard tabs) | Members |
| `/decks` | Decks list | Student |
| `/decks/new` | Create deck | Student |
| `/decks/:id` | Deck detail | Anyone who can see the deck |
| `/decks/:id/edit` | Edit deck | Deck owner |
| `/decks/:id/practice` | Practice session and summary | Anyone who can see the deck |
| `/doubts` | Doubts list (all my rooms) | Student |
| `/doubts/new` | Ask a doubt | Room members |
| `/doubts/:id` | Doubt detail | Room members |
| `/leaderboard` | Leaderboard | Student |
| `/profile` | Profile | Student |
| `*` | Not found | Anyone |

Overlays (not routes): Create room modal, Join by code modal, Save as card modal, Edit profile modal, Delete confirmations, Notifications drawer.

---

## 5. Component library

Every page is assembled from these. Build them once, reuse everywhere.

| Component | Description |
|---|---|
| **Tile** | The base container. Ivory 50 (`#FDFBF7`), 1 px Sand 300 border, radius 24, optional title row (H3 left, action right), optional glow. Variants: default (Ivory 50), tinted (Cream 150 `#F2EAE0`), contrast (Espresso 900 fill with Cream 100 text, used sparingly for one highlight tile or flashcard back) |
| **Button** | Pill. Primary: Amber 500 fill, Ivory 50 bold text, soft glow on hover. Secondary: Cream 150 fill or transparent with Sand 300 border and Espresso 900 text. Ghost: Espresso 700 text only. Destructive: Error colour outline. Sizes: small, medium, large. Loading state shows a spinner and disables the button |
| **Tag** | Small pill for subject, visibility, status. Variants: neutral (Cream 150 `#F2EAE0` with Espresso 700 text), subject (Sand 300 outline), success (soft green tint `#E8F5E9` with `#2E7D32` text), accepted |
| **Input, Textarea, Select** | Cream 150 fill (`#F2EAE0`), 1 px Sand 300 border, Espresso 900 text, label above, helper text below, error text in Error colour with an icon. Character counter on long fields |
| **Search bar** | Pill input in Cream 150 with a search icon, clears with an x |
| **Filter chips** | Row of pills, inactive in Cream 150, one active (Espresso 900 fill with Ivory 50 text, or Amber 500 fill) |
| **Tabs** | Underline style inside a tile or page header, active tab in Espresso 900 with an Amber 500 underline |
| **Avatar** | Circle showing initials on a Cream 200 fill with Espresso 900 text. Avatar stack for member groups (overlap 8 px, "+N" at the end) |
| **Progress ring** | SVG ring, Cream 200 track (`#EFE6D5`), Amber 500 stroke with soft amber glow, centre slot for content |
| **Bar chart** | SVG bars for seven days. Today in Amber 500, other days Sand 300 (`#E2D6C5`), dashed line in Espresso 500 for the goal |
| **Stat tile** | Large number (H1, tabular, Espresso 900), label (caption, Espresso 500), optional delta |
| **List row** | Used for doubts, members, cards, activity. Left slot (avatar or icon), main text and meta, right slot (count or action). Hover tints to Cream 150 |
| **Flashcard** | 560 by 340 px (full width on mobile), Ivory 50 front with Sand 300 border, Cream 200 (`#EFE6D5`) or warm amber-tinted back with Espresso 900 text, flips on click |
| **Modal** | Centred Ivory 50 tile over a dimmed Espresso 900 backdrop (40% opacity), closes on Escape and backdrop click |
| **Drawer** | Right-side Ivory 50 panel with Sand 300 left border, used for notifications |
| **Toast** | Small pill at bottom right in Espresso 900 with Ivory 50 text (high contrast) or Ivory 50 with Sand 300 border, icon and message |
| **Skeleton** | Pulsing Cream 150 shapes matching the real layout |
| **Empty state** | Icon, one-line headline, one-line help text, one primary button |
| **Pagination** | Previous and next pills with page numbers |
| **Confirm dialog** | Modal with a clear destructive button and a Cancel |

---

## 6. Page specifications

For each page: purpose, layout, content and data source, actions, states, and responsive notes.

---

### 6.1 Landing page (`/`)

**Purpose:** explain EduWrap in 10 seconds and send visitors to Register.

**Layout (top to bottom)**

1. **Top navbar:** wordmark "EduWrap" in Espresso 900 on the left, links (Features, How it works) in the middle, Login (ghost) and Get started (primary) on the right. Sticks to the top, with a Cream 100 translucent blur background once scrolled.
2. **Hero:** a large Ivory 50 tile with the Display headline **Study together. Stay consistent.** and one line of support text: "Rooms, flashcards and a doubt board for your batch, with streaks that keep you going." Two buttons: Get started (primary), Log in (secondary). On the right, a decorative cluster of small bento tiles (a ring at 70%, a flashcard, a streak badge, a doubt row) with a warm amber glow behind them. These are static illustrations built from the real components, not screenshots.
3. **Stats strip:** a pill row with three live numbers: students, doubts answered, cards practised. Data from the stats endpoint (PostgreSQL counts and MongoDB session count). If the numbers are too small to look credible, hide them.
4. **Features:** a three-tile bento. Each tile has an icon, a title and two lines of text.
   - Shared decks: "Build flashcards once, revise together."
   - Doubt board: "Ask, answer, and mark what is right. Answers stay searchable."
   - Streaks and points: "A daily goal, a weekly leaderboard, and a reason to come back."
5. **How it works:** three numbered tiles in a row: Join a room, Ask and answer, Practise daily.
6. **Closing band:** a wide tile with "Your batch is already here." and a Get started button, with a soft amber glow.
7. **Footer:** wordmark, one line "Built as a capstone project at Rishihood University", and a copyright line.

**States:** none (static). Stats strip shows skeleton, then values, then is hidden on error.
**Responsive:** sections stack in one column, hero illustration moves below the text, navbar collapses to the wordmark plus a Get started button.

---

### 6.2 Register (`/register`)

**Purpose:** create an account (FR-A1).

**Layout:** two tiles side by side. Left: brand tile in Cream 200 with the wordmark, the tagline and an amber-glow ring illustration. Right: the Ivory 50 form tile.

**Form fields:** Full name, Email, Password (with show or hide toggle and a live hint "At least 8 characters"). Primary button **Create account**. Below: "Already have an account? Log in".

**Validation (inline, on blur and on submit)**

| Field | Rules and message |
|---|---|
| Name | Required, 2 to 60 characters |
| Email | Valid format. Duplicate returns "This email is already registered. Log in instead." |
| Password | At least 8 characters |

**Actions:** submit calls the register endpoint, then logs in and goes to `/onboarding`.
**States:** button loading, form error banner for server errors.
**Responsive:** the brand tile is hidden below 768 px, leaving only the form tile.

---

### 6.3 Login (`/login`)

**Purpose:** sign in (FR-A2).

**Layout:** same two-tile layout as Register.

**Fields:** Email, Password with show or hide. Button **Log in**. Link "New here? Create an account".

**Errors:** a single message for wrong credentials ("Email or password is incorrect"), without saying which one. Expired session redirects here with a banner: "Your session expired. Please log in again." After login, return to the page the user was trying to open, otherwise `/home`.

---

### 6.4 Onboarding (`/onboarding`)

**Purpose:** collect a daily goal and connect the user to a room within 60 seconds (FR-A4).

**Layout:** a single centred Ivory 50 tile (max width 640 px) with a step indicator (two dots) and a Skip link at the top right.

**Step 1: Set your daily goal.** Headline "How many cards a day?" Four large option pills: 10, 20, 30, 50, with the caption "You can change this any time". The default 20 is preselected. Button **Continue**.

**Step 2: Find your people.** Headline "Join a room". Three parts:
- A field **Have an invite code?** with a Join button.
- A short list of public rooms (up to 4) as list rows with a Join button each.
- A secondary button **Create a room instead**.
Button **Finish** goes to `/home`. If the user joined nothing, Home shows a prominent empty state for rooms.

**States:** loading skeleton for the room list, empty message "No public rooms yet. Be the first to create one."

---

### 6.5 Home / Dashboard (`/home`)

**Purpose:** show what to do today and how the user is doing (FR section 7.8).

**Layout** (desktop, 12 columns; matches the approved light theme dashboard preview)

```
+-----+---------------------------------+-------------------------------------+
|     |  A. DUE TODAY                   |  B. TODAY'S GOAL                    |
|     |                                 |                                     |
|  R  |   Big number: 14                |          .-----------------.          |
|  A  |   Cards due across 3 decks      |         /    amber ring      \        |
|  I  |   deck chips: DBMS, AP, Maths   |        |    ( flame 6 )      |       |
|  L  |                                 |         \   12 / 20 cards   /         |
|     |   [Start revision]  (primary)   |          '-----------------'          |
+-----+--------------+------------------+-------------------------------------+
|     | C. QUICK     | E. WEEKLY POINTS |  G. THIS WEEK                       |
|     |    ACTIONS   |    AND RANK      |  [Ivory 50 chart tile]              |
|     | (+ New Deck) |  240 pts         |  bars Mon..Sun, goal line           |
|     | (Ask a Doubt)|  #3 [trend]      |                                     |
|     +--------------+                  |  Recent activity:                   |
|     | D. MY ROOMS  +------------------+  Asha answered in 1 hour ago.       |
|     |  avatars     | F. [Ask a doubt] |  Ravi added 1 hour ago.             |
|     |  Room names  |    wide pill     |                                     |
+-----+--------------+------------------+-------------------------------------+
```

**Tile specifications**

| Tile | Content | Data source | Actions |
|---|---|---|---|
| **A. Due today** (large, top-left) | Heading "Due Today". Large number `14` beside "Cards due across 3 decks" and up to three Cream 150 deck chips (`DBMS`, `AP`, `Maths`). Wide primary button **Start revision** (starts a mixed session of due cards, FR-P5) | PostgreSQL `card_progress` joined with `cards` and `decks` | Start revision, click a deck chip |
| **B. Today's goal** (large, top-right) | Title "Today's goal". The progress ring (cards reviewed today divided by the goal) with a soft amber glow. Centre: flame icon and streak number (`6`), `12 / 20`, and `cards` below. When reached, the ring glows and shows "Goal reached" | MongoDB `daily_activity` for today and the streak, goal from `users` | None (read only) |
| **C. Quick actions** (small tile) | Title "Quick Actions" with two pill buttons: `+ New Deck` and `Ask a Doubt` in Cream 150 | None | Go to `/decks/new`, `/doubts/new` |
| **D. My rooms** (tile) | Up to three rooms, each with an avatar stack, room name, and subject tags (`AP`, `Maths`). "See all" link | PostgreSQL `rooms`, `room_members` | Open a room, See all |
| **E. Weekly points and rank** (tile) | Points this week (`240 pts` large), rank (`#3`) with a small trend badge | PostgreSQL `points_events` aggregation | Open leaderboard |
| **F. Primary call to action** (bottom-right wide pill) | One wide Amber 500 pill button below E and G. Shows **Ask a doubt** if the user has no recent activity, or **Continue where you left off** if a session was interrupted | None | Navigate |
| **G. This week** (wide bottom-right tile) | A seven-bar chart of cards reviewed per day (`Mon`..`Sun`, `Today` highlighted in Amber 500, others in Sand 300) with a dashed `Goal` line. Beside it, "Recent activity" showing the latest events from the user's rooms | Chart from MongoDB `daily_activity`, feed from MongoDB `activity_events` | Previous and next week, click an event to open it |

Additionally, a thin **My open doubts** list (up to three rows with answer counts) sits inside tile D's lower area or replaces F on small screens, so the page covers FR section 7.8 fully.

**States**

- **New user, no data:** tile A shows "Nothing due yet. Create your first deck", ring shows 0 / goal, tile D shows "Join or create a room", chart shows empty bars with the text "Your week starts here".
- **Loading:** each tile shows its own skeleton, so tiles can appear independently.
- **Error:** a failed tile shows "Could not load" and a Retry text button, without breaking the others.

**Responsive:** order on mobile is B, A, C, D, E, G, F in a single column.

---

### 6.6 Rooms (`/rooms`)

**Purpose:** see and join rooms (FR-R1 to FR-R3).

**Header:** title **Rooms**, buttons **Join with code** (secondary) and **Create room** (primary).

**Tabs:** **My rooms** and **Discover**.

**My rooms:** a grid of Ivory 50 room tiles (three per row on desktop). Each tile: room name (H3), subject tag, visibility icon (globe or lock), member avatar stack with count, "N open doubts", and an Owner tag when relevant. Click opens the room.

**Discover:** a search bar and subject filter chips above a grid of public rooms. Each tile shows the same info plus a **Join** button (changes to "Joined" for rooms the user is already in). Pagination of 12.

**Create room modal:** fields Name (3 to 50), Description (up to 200 with counter), Subject (select), Visibility (two selectable cards: Public "Anyone can find and join", Private "Only people with the code"). Button **Create room**. On success, go to the new room page and show the invite code in a toast.

**Join with code modal:** one input of eight characters, auto-uppercased. Errors: "Code not found", "You are already in this room".

**States:** empty My rooms: icon, "You are not in any room yet", buttons Discover rooms and Create room. Empty Discover: "No rooms match your search".

---

### 6.7 Room page (`/rooms/:id`)

**Purpose:** the collaboration hub (FR-R5, FR-R6).

**Header tile (full width):** room name (H1), subject tag, visibility tag, description, avatar stack with count. Right side: the invite code with a copy button (members only), **Leave room** (ghost) for members, or **Edit** and **Delete room** for the owner.

**Tabs:** Overview, Doubts, Decks, Leaderboard.

**Overview tab**

```
+------------------------------+----------------------+
| Room stats (3 stat tiles)    | Members              |
| doubts | answered | decks    | list rows with role  |
+------------------------------+ owner can Remove     |
| Recent activity feed         |                      |
+------------------------------+----------------------+
```

- Stat tiles: total doubts, percentage answered, decks shared this week.
- Activity feed: list rows from MongoDB `activity_events` filtered by room, newest first, 10 items with a "Load more" button.
- Members: list rows (avatar, name, joined date, Owner tag). The owner sees a Remove button on each other member, with a confirmation.

**Doubts tab:** the same list as `/doubts` but fixed to this room, with filters (All, Unanswered, Answered, Mine), a search bar and an **Ask a doubt** primary button (the room is preselected).

**Decks tab:** a grid of decks with visibility room in this room, plus a button **Share a deck** (opens a picker of the user's own decks and sets them to this room's visibility). Deck tiles are the same as in `/decks`.

**Leaderboard tab:** see 6.16, scoped to this room.

**States:** a non-member opening the link sees the 403 page with a **Join this room** button for public rooms or **Enter invite code** for private ones. After the owner removes a member, that member sees the same 403 page.

---

### 6.8 Decks list (`/decks`)

**Purpose:** browse, search and create decks (FR-D1, FR-D4).

**Header:** title **Decks**, primary button **New deck**.

**Controls row:** search bar, filter chips **All, Mine, Room, Public**, and a subject select.

**Grid:** Ivory 50 deck tiles (four per row on large screens). Each tile has:
- Title (H3, two lines maximum)
- Subject tag and a visibility icon
- "24 cards"
- Owner avatar and name
- If the user has practised it: a thin segmented bar showing box distribution and "6 due" in a warm amber-tinted pill.
- A small **Practise** button appears on hover and is always visible on touch devices.

**Pagination:** 12 per page.

**States:** empty "No decks yet. Create your first deck" with a primary button. Search with no results "No decks match 'xyz'" with a Clear search button.

---

### 6.9 Create or edit deck (`/decks/new`, `/decks/:id/edit`)

**Purpose:** create and configure a deck (FR-D1, FR-D2).

**Layout:** two tiles. Left, **Deck details**: Title, Description, Subject, Visibility as three selectable cards (Private "Only you", Room "Members of one room", Public "All students"). Choosing Room reveals a Room select that lists only rooms the user belongs to. Right, **Cards** (shown after the deck exists; on `/decks/new` this tile shows a hint "Add cards after saving").

**Buttons:** **Save deck** (primary), Cancel. After creating, redirect to the deck detail page with an "Add your first card" inline form already open.

**Validation:** title required (3 to 80), room required when visibility is Room.

**Edit mode extras:** a Delete deck button at the bottom, with a confirm dialog "This also deletes its 24 cards and everyone's progress on them."

---

### 6.10 Deck detail (`/decks/:id`)

**Purpose:** view a deck, manage its cards, start practice (FR-D2, FR-D3).

**Layout**

```
+------------------------------------------------------+
| Header tile: title, description, tags, owner         |
| [Start practice] (primary)  [Clone] [Edit] [Delete]  |
+----------------+----------------+--------------------+
| Stat: cards    | Stat: due      | Your mastery       |
| 24             | 6 today        | segmented 5 boxes  |
+----------------+----------------+--------------------+
| Cards list (tile, full width)                        |
| # | Front | Back | Box | (edit / delete for owner)   |
+------------------------------------------------------+
```

- **Start practice** goes to the practice page. Disabled with a tooltip if the deck has no cards.
- **Clone** (Stretch) appears for decks the viewer does not own.
- **Edit** and **Delete** appear for the owner only.
- **Your mastery:** a five-segment bar, one segment per Leitner box, with counts. Box 5 is Amber 500, lower boxes progressively lighter shades of Sand and Cream.
- **Cards list:** each row shows the number, front text (truncated), back text (truncated), and the viewer's current box as a small tag. Owners see edit and delete icons and an **Add card** row at the top that expands inline (two textareas, Save and Cancel).

**States:** empty deck shows "No cards yet" with an inline Add card form for the owner, or "The owner has not added any cards" for others. A deck the viewer cannot see returns the 403 page.

---

### 6.11 Practice session (`/decks/:id/practice`)

**Purpose:** distraction-free revision (FR-P1 to FR-P4).

**Page type:** Focus. Cream 100 canvas, no rail and no header.

**Layout**

```
+------------------------------------------------------+
|  [x]   DBMS Basics                         7 / 20    |
|  ==================--------------  progress bar      |
|                                                      |
|            +--------------------------+              |
|            |                          |              |
|            |        FRONT TEXT        |              |
|            |     (click to flip)      |              |
|            |                          |              |
|            +--------------------------+              |
|                                                      |
|        [ Missed  (1) ]     [ Known  (2) ]            |
|              Space = flip   1 = missed   2 = known   |
+------------------------------------------------------+
```

- The progress bar is Amber 500 on a Cream 200 track.
- The flashcard shows the front first (Ivory 50 fill, Sand 300 border, Espresso 900 text). Clicking it or pressing Space flips to the back (Cream 200 `#EFE6D5` fill with Espresso 900 text to clearly distinguish front vs. back).
- **Known** (primary) and **Missed** (secondary) buttons appear only after flipping. Keys 1 and 2 are shortcuts.
- Close (x) asks for confirmation: "Leave this session? Your answers so far will be saved." Answered cards are submitted even if the session is left early.
- Session size: up to 20 cards, due cards first, then new cards.

**States:** loading skeleton of the card. If no cards are due, a pre-screen offers "Nothing is due. Review this deck anyway?" with a Start button.

---

### 6.12 Session summary (end of practice)

**Purpose:** show the result and reward progress (FR-P4, FR-G2, FR-G3).

**Layout:** a centred set of Ivory 50 tiles on the Focus page.

- **Result ring:** accuracy percentage in the centre of a ring, with a soft amber glow if accuracy is 80% or more.
- **Three stat tiles:** Known, Missed, Time taken.
- **Rewards tile:** points earned (for example "+10 session, +5 daily goal") and, when applicable, "Streak: 7 days" with a flame.
- **Next review tile:** "6 cards come back tomorrow".
- **Buttons:** **Practise again** (secondary), **Back to deck** (secondary), **Go home** (primary).

**States:** if saving fails, a warning tile "Your session could not be saved" with a Retry button. Answers are kept in memory until the save succeeds.

---

### 6.13 Doubts list (`/doubts`)

**Purpose:** the combined doubt board across the user's rooms (FR-Q2).

**Header:** title **Doubts**, primary button **Ask a doubt**.

**Controls:** search bar, filter chips (All, Unanswered, Answered, Mine), room select (All my rooms by default).

**List:** each row is a List row inside an Ivory 50 container with:
- Left: the asker's avatar
- Main: title (bold, Espresso 900, one line), first line of the body (Espresso 700), meta line with room tag, asker name and time ("2 h ago")
- Right: an answers count pill, and a green Accepted tag with a check if an answer was accepted

Unanswered doubts have a small Amber 500 dot.

**Pagination:** 10 per page.

**States:** empty "No doubts yet. Ask the first one" with a button. Empty search "Nothing found for 'xyz'". Users in no rooms see "Join a room to see its doubts".

---

### 6.14 Ask a doubt (`/doubts/new`)

**Purpose:** post a question (FR-Q1).

**Layout:** a single centred Ivory 50 tile.

**Fields:** Room (select, required, only the user's rooms; preselected when coming from a room), Title (10 to 150, counter), Details (up to 2000, counter, optional helper text "What have you tried?").

**Buttons:** **Post doubt** (primary), Cancel. On success, go to the new doubt page and show a toast.

**Edit mode** (from the doubt page) reuses this form with the room locked.

---

### 6.15 Doubt detail (`/doubts/:id`)

**Purpose:** read a question, answer it, vote, accept, and save knowledge (FR-Q3 to FR-Q8).

**Layout**

```
+----------------------------------------+--------------------+
| QUESTION TILE                          | Side tiles         |
| title (H1), room tag, asker, time      |  Asker card        |
| body                                   |  Room link         |
| [Edit] [Delete]  (author or room owner)|  "3 answers"       |
+----------------------------------------+  "Accepted: yes"   |
| ANSWERS (sorted: accepted, votes, new) |                    |
| +------------------------------------+ |                    |
| | [accepted tag]  answer text        | |                    |
| | avatar name time                   | |                    |
| | [^ 4]  [Save as card]  [Accept]    | |                    |
| +------------------------------------+ |                    |
|  ...                                   |                    |
+----------------------------------------+                    |
| YOUR ANSWER composer (textarea, counter, [Post answer])      |
+--------------------------------------------------------------+
```

**Answer tile elements**

- **Accepted** answer has a green/amber left accent border (`#2E7D32`), an Accepted tag and sits first.
- **Upvote** button shows the count. It is Amber 500 filled when the user has voted. It is disabled with a tooltip "You cannot upvote your own answer" on the user's own answers. Clicking again removes the vote.
- **Accept** button is visible to the asker only. On the current accepted answer it reads "Accepted" and clicking it removes acceptance.
- **Save as card** opens the modal below.
- **Edit and Delete** appear for the author, and Delete also for the room owner.

**Save as card modal:** shows a preview of the card (Front = doubt title, Back = answer text, both editable), a deck select listing decks the user owns, and an option **Create a new deck** that reveals a title field. Button **Save card**. Success toast with a link "Open deck".

**States:** no answers yet shows "No answers yet. Be the first to help." above the composer. A deleted or missing doubt shows the 404 page.

---

### 6.16 Leaderboard (`/leaderboard`)

**Purpose:** weekly ranking inside a room (FR-G4).

**Header:** title **Leaderboard**, a room select, and a caption with the week range ("Mon 9 Nov to Sun 15 Nov, IST"). The room page's Leaderboard tab uses the same content without the select.

**Layout**

- **Podium row:** three Ivory 50 tiles for ranks 1, 2 and 3. Rank 1 is larger, centred, with a soft amber glow, an Amber 500 top border, and a crown icon. Each shows avatar, name and points.
- **Ranking list:** rows for ranks 4 to 10 (rank, avatar, name, points, a small Amber 500 / Sand 300 bar proportional to points).
- **Your rank tile:** pinned at the bottom: "You are #7 with 85 points". If the user is in the top 10, their row is highlighted with an Amber 500 left border and a subtle warm Cream 150 tint.
- **How points work:** a collapsible tile that lists the points table from the PRD.

**States:** with no points this week, "No points yet this week. Practise or answer a doubt to get on the board." If the user belongs to no room, prompt to join one.

---

### 6.17 Notifications drawer

**Purpose:** show events needing attention (FR-N1, FR-N2).

**Trigger:** the bell in the page header, with an Amber 500 dot when unread items exist.

**Drawer content:** title **Notifications**, a **Mark all read** text button in Amber 600, and a list. Each item has an icon, a one-line message ("Ravi answered your doubt 'Why 3NF?'"), a relative time, and an Amber 500 dot if unread. Clicking an item marks it read and opens its link.

**Behaviour:** the unread count refreshes every 30 seconds in the background.
**States:** empty "You are all caught up".

---

### 6.18 Profile (`/profile`)

**Purpose:** personal stats and content (FR-A5, section 7.9).

**Layout**

```
+------------------------+-----------------------------------+
| Identity tile          | Stat tiles (2 x 2)                |
| avatar, name, email,   |  Streak | Total points            |
| joined date            |  Cards reviewed | Accepted answers|
| [Edit profile] [Logout]|                                   |
+------------------------+-----------------------------------+
| Daily goal tile: ring preview + change goal (10/20/30/50)  |
+------------------------------------------------------------+
| Badges tile (Stretch): earned badges lit, others dimmed    |
+------------------------------------------------------------+
| Tabs: My doubts | My answers | My decks   (list rows)      |
+------------------------------------------------------------+
```

**Edit profile modal:** name and daily goal. Email is shown but not editable. Button **Save changes**.

**States:** empty tabs show a friendly message with a link to create the first item.

---

### 6.19 System pages

| Page | When | Content |
|---|---|---|
| **404 Not found** | Unknown route or missing record | Centred Ivory 50 tile, a soft flashcard illustration, "We could not find that page", button **Go home** |
| **403 No access** | Opening a room, deck or doubt the user cannot see | "You do not have access to this", with **Join this room** or **Enter invite code** if relevant, and **Go home** |
| **Error** | Unexpected failure in the page | "Something went wrong", a Retry button, and a Go home link |
| **Session expired** | Token invalid mid-session | Redirect to Login with the banner described in 6.3 |

---

## 7. Global states and patterns

| Situation | Pattern |
|---|---|
| Loading a page or tile | Skeleton shapes in Cream 150 that match the final layout. No full-page spinners |
| Loading a button action | The button shows a spinner and is disabled |
| Empty list | Empty state component with one clear next action |
| Form error | Inline message under the field, and a summary banner for server errors |
| Success | Toast, with a link when useful |
| Destructive action | Confirm dialog naming exactly what will be deleted |
| Network failure | Tile-level Retry for reads, toast with Retry for writes |
| Long text | Truncate in lists, show in full on detail pages |
| Dates | Relative for under 7 days ("2 h ago"), otherwise "12 Nov 2026" |
| Numbers | Thousands separators, tabular figures in stat tiles |

---

## 8. Content and tone

Short, friendly, direct. Second person. No jargon in the UI.

| Place | Example copy |
|---|---|
| Hero headline | Study together. Stay consistent. |
| Empty decks | No decks yet. Create your first one and share it with your room. |
| Empty doubts | No doubts here yet. Ask the first one. |
| Goal reached | Goal reached. Nice work. |
| Streak | 6-day streak. Keep it going. |
| Delete confirm | This will permanently delete the deck and its 24 cards. |
| Error | Something went wrong. Please try again. |

Buttons are verbs: Create room, Post doubt, Start revision, Save card.

---

## 9. Accessibility

- Text contrast meets 4.5 to 1 (see 2.1). Amber 500 is never used for small text; Amber 600 (`#A8641F`) is used for small interactive text links.
- Every input has a visible label, and errors are announced next to the field.
- All interactive elements are reachable by keyboard with a visible focus ring (2 px Espresso 900 outline with an Amber 500 offset).
- Practice has full keyboard control (Space, 1, 2, Escape).
- Icons that carry meaning have text labels or accessible names. Status is never shown by colour alone (Accepted has a tag and a check icon).
- Modals trap focus and return it on close. The notification drawer is dismissible with Escape.
- Reduced motion is respected (section 2.5).
- Touch targets are at least 44 by 44 px on mobile.

---

## 10. Design-to-data map

This table connects every page to its data, so any screen can be traced during the viva.

| Page | PostgreSQL | MongoDB |
|---|---|---|
| Landing stats | users, doubts, answers counts | study_sessions count |
| Register, Login, Profile | users | daily_activity (streak, goal) |
| Home | card_progress, cards, decks, room_members, rooms, points_events, doubts | daily_activity, activity_events |
| Rooms | rooms, room_members, subjects | none |
| Room page | rooms, room_members, doubts, decks, points_events | activity_events |
| Decks, Deck detail | decks, cards, card_progress, subjects | none |
| Practice and summary | card_progress, points_events (one transaction) | study_sessions, daily_activity |
| Doubts, Doubt detail | doubts, answers, answer_upvotes, cards (save as card), points_events | activity_events, notifications |
| Leaderboard | points_events, room_members, users | none |
| Notifications | none | notifications |

---

## 11. Build order for the UI

Build in this order so every step produces a working, demonstrable screen.

1. Design tokens (colours, type, spacing) and the Tile, Button, Input, Tag components.
2. App shell (rail, header, bottom bar) and routing with protected pages.
3. Landing, Register, Login.
4. Onboarding.
5. Rooms list, create and join modals, room page shell.
6. Decks list, create or edit, deck detail.
7. Practice session and summary.
8. Doubts list, ask, doubt detail, save as card.
9. Home dashboard (needs data from the earlier steps).
10. Growth layer: streak and goal ring, leaderboard, notifications drawer, activity feeds.
11. Profile, system pages, final polish, empty and error states.

---

## 12. Open design questions

1. **Logo:** a simple wordmark in Espresso 900 with an Amber 500 dot is assumed. A custom mark can be added later.
2. **Invite code visibility:** this spec shows the code to all members so they can invite others. If only the owner should see it, the room header changes.
3. **Landing statistics:** shown only if the demo data makes them look credible. Otherwise replace with a product preview.
4. **PRD update:** the PRD still describes a white and indigo design system; update it to match this warm cream, ivory, espresso, and burnt amber light theme.