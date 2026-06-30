# PROMPT AND MASTER ROADMAP FOR IDE AGENT (GameMind AI v2.0)

**ROLE:** Primary Full-Stack Developer for GameMind AI
**OBJECTIVE:** Develop Version 2.0 (and future patches) based on this highly detailed architectural roadmap. You must follow these phases strictly to minimize bugs.

---

## 🚀 PHASE 1: Auto-Updater (Zero-Friction Updates)
*The user needs to distribute updates seamlessly without manually sending .exe files.*
- **Library:** The project already has `electron-updater` in `package.json`.
- **Implementation:**
  1. In `src/main/index.ts` (or an `auto-updater.ts` service), import `autoUpdater` from `electron-updater`.
  2. Call `autoUpdater.checkForUpdatesAndNotify()` on app startup.
  3. Add IPC channels (`updater:check`, `updater:download-progress`, `updater:ready`) to send events to the React frontend.
  4. Create a UI notification component (e.g., in `DashboardPage.tsx`) that shows "Update downloading... X%" and a button "Restart to Install".
- **Infrastructure:** The developer will host the `.exe` on **GitHub Releases**. Ensure `electron-builder.yml` has the `publish` configuration set to `github`.

---

## ☁️ PHASE 2: Cloud Backend & Friends System
*Transitioning from a strictly local app to a connected platform, while KEEPING the core app fully functional offline without an account.*
- **Provider:** **Supabase** (PostgreSQL + Auth).
- **CRITICAL REQUIREMENT 1:** Cloud registration MUST BE OPTIONAL. A user who only logs into Steam (without creating a GameMind account) must still be able to use the core app (Library, local AI recommendations, DNA) exactly as they do now.
- **CRITICAL REQUIREMENT 2 (Numeric User ID):** To make adding friends simple, every registered user must be assigned a unique random 6-digit numeric ID (e.g., `582914`) upon account creation. Users should be able to copy this code from their profile, send it to a friend, and use it to add them.
- **Implementation:**
  1. Setup `@supabase/supabase-js` client in `src/renderer` and `src/main`.
  2. **Auth:** Allow users to register a GameMind account (Email/Password). On successful registration, generate a unique 6-digit numeric ID for their profile.
  3. **UI/UX (The Friends Tab):**
     - Add a "Friends" tab to the Sidebar.
     - If an *unregistered* user clicks the "Friends" tab, they should see a beautiful "Gatekeeper" UI component stating: *"This feature is available only for registered users."* along with a prominent button: **"Create GameMind Account"**.
     - For registered users, show their own 6-digit code with a "Copy" button.
  4. **Database Schema (Supabase SQL):**
     - `users` table: 
       - `id` (UUID) REFERENCES auth.users(id) PRIMARY KEY,
       - `steam_id` (Text),
       - `username` (Text),
       - `numeric_id` (Integer) UNIQUE, -- 6-digit random code
       - `dna_summary` (JSONB),
       - `created_at` (Timestamp)
     - `friends` table: `user_id` (UUID), `friend_id` (UUID), `status` (pending/accepted).
  5. **Data Sync:** If (and only if) the user is logged into their GameMind Cloud account, syncing their Steam library will compress their "Player DNA" into a lightweight JSON and upload it to their `users.dna_summary` row in Supabase.

---

## 🤝 PHASE 3: Co-op Recommendations (Multiplayer AI)
*Analyzing two different players to find common ground, and managing friends via short codes.*
- **Implementation:**
  1. **Friends List & Adding Logic:**
     - In the "Friends" tab, add an input field: "Enter Friend's 6-digit ID".
     - When submitting, search the Supabase `users` table for a record matching the `numeric_id`. If found, create a entry in the `friends` table (status `pending` or directly `accepted` for simplicity).
     - Display the list of added friends.
  2. **Co-op Recommendations:** When clicking on an active friend, fetch their `dna_summary` from Supabase.
  3. AI Prompt Engineering: Construct a unified prompt containing *both* profiles.
     - *Example Context:* "User A likes FPS and Survival (Top games: Rust, CS:GO). User B likes RPGs and Co-op (Top games: Baldur's Gate, It Takes Two)."
     - *Task:* "Recommend 3 games they both own that support multiplayer, OR suggest 3 new games from the Steam store that perfectly bridge their interests."
  4. Cost Optimization: Only send aggregated genres and top 10 games per user, NOT their entire 500-game libraries.

---

## 🖥️ PHASE 4: AI Hardware Checker ("Will it run?")
*Cross-referencing PC specs with Steam game requirements.*
- **Library:** Add `systeminformation` to `package.json` (`npm i systeminformation`).
- **Implementation:**
  1. Create `src/main/services/hardware.service.ts`.
  2. Use `si.cpu()`, `si.graphics()`, and `si.mem()` to extract the exact PC specs (e.g., "Intel i5-12400F", "NVIDIA RTX 3060", "16GB RAM").
  3. Pass these specs to the AI provider alongside game recommendations.
  4. Prompt instruction: "If you recommend a game, evaluate if the provided PC specs can run it. Add a small badge or text: '✅ Runs on High' or '⚠️ Might struggle'."

---

## 🔍 PHASE 5: Semantic Game Search
*Natural language search for the user's library and beyond.*
- **Implementation:**
  1. Add a global search bar in the UI: "What do you want to play today?"
  2. User types: "I want a dark space game with survival elements."
  3. Send this query to the LLM. The LLM translates it into an array of Tags/Genres (e.g., `["Space", "Dark", "Survival", "Sci-fi"]`).
  4. Filter the local SQLite database (`games` table) by these tags and return instant results.

---

## 💎 PHASE 6: Premium AI Models & Monetization (Token Diet)
*Supporting Claude 3.5 Sonnet / GPT-4o while preventing API bankruptcy.*
- **Implementation:**
  1. **Token Diet Architecture:** Ensure the `ai.service.ts` heavily aggregates library data. Never send raw JSON of 1000 games. Send a summary: `Total Games: 1000. Top 5 Genres: X, Y, Z. Top 20 Most Played Games: ...`.
  2. **Caching:** Store AI responses in SQLite (`ai_cache` table) with a hash of the user's current library state. If the library hasn't changed, DO NOT call the API for the same question.
  3. **Monetization UI:** Build a "Premium" settings page. If a user unlocks premium, route their requests to the Anthropic/OpenAI API handlers instead of the free/local ones.

---

## 🎨 PHASE 7: UI/UX Redesign (Glassmorphism 2.0)
*Polish and visual upgrades.*
- **Implementation:**
  1. Increase blur effects (`backdrop-filter: blur(12px)`) on modals and sidebars.
  2. Implement `framer-motion` layout animations for list transitions (e.g., when filtering games).
  3. Ensure a highly premium, dark "gamer" aesthetic with subtle neon accents.

---
**IDE AGENT INSTRUCTIONS:**
When the user asks you to implement a phase from this document, read this file carefully, follow the exact implementation strategy, and always prioritize error handling and TypeScript safety. Do not break existing IPC functionality.
