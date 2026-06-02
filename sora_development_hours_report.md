# Sora Development Hours & Activity Report
This report outlines the estimated development hours along with the specific tasks (commits) accomplished on each day.
**Methodology:**
- 1 commit in a day = 2 hours estimated work.
- Multiple commits = Difference between first and last commit + 2 hours overhead (max 12 hours/day).

## ⏱️ Total Estimated Time
**Total Hours:** 104.12 hours

### Breakdown by Author
- **Youssef Halitou**: 97.78 hours
- **YoussefHalitou**: 6.34 hours

---

## 📅 Monday, Jun 01, 2026
### 🧑‍💻 Youssef Halitou - 2.00 hours
**Tasks Completed:**
- `[22:40:13]` fix: use authFetch for all API calls to prevent session expiry breaking subworkspaces

## 📅 Tuesday, May 05, 2026
### 🧑‍💻 Youssef Halitou - 2.00 hours
**Tasks Completed:**
- `[14:44:33]` fix: auto-refresh JWT on socket reconnect to prevent offline state

### 🧑‍💻 YoussefHalitou - 2.00 hours
**Tasks Completed:**
- `[14:46:02]` Merge pull request #4 from YoussefHalitou/fix/socket-session-persistence

## 📅 Wednesday, Apr 29, 2026
### 🧑‍💻 Youssef Halitou - 2.72 hours
**Tasks Completed:**
- `[13:42:59]` chore: fix deployment issues for Fly.io and Vercel
- `[13:54:44]` fix: replace app.get('*') with app.use() to fix express 5 crash
- `[14:01:33]` chore: add vercel frontend url to CORS_ORIGIN
- `[14:15:02]` fix: remove local .env during Docker build so API calls use relative /api path
- `[14:26:22]` fix: migration glob to match .js files in production Docker build

### 🧑‍💻 YoussefHalitou - 2.34 hours
**Tasks Completed:**
- `[13:45:22]` Merge pull request #2 from YoussefHalitou/feat/csv-timesheet-import
- `[14:05:41]` Merge pull request #3 from YoussefHalitou/feat/csv-timesheet-import

## 📅 Monday, Apr 27, 2026
### 🧑‍💻 Youssef Halitou - 12.00 hours
**Tasks Completed:**
- `[00:37:49]` feat: upgrade Notizen to rich text editor & add mindmap folder structure
- `[01:14:11]` polish: fix unstyled helper containers across task detail, board, and layout modals
- `[02:00:01]` feat: email verification, password change & forgot/reset password
- `[02:19:51]` fix: use API_URL for gdpr endpoints in UserSettingsModal to prevent 404s
- `[03:23:16]` feat: complete Cortex rebrand and add user name change
- `[03:28:04]` style: update Cortex logos to brain icon and email templates
- `[04:41:47]` feat(mindmap): add duplicate mind map and node copy/paste functionality
- `[05:05:06]` feat(mindmap): add 5 new creation methods
- `[05:15:08]` fix(mindmap): widen sidebar to 320px, add collapse toggle, fix footer overflow
- `[05:18:55]` feat(notes): add collapsible sidebar toggle
- `[21:57:13]` fix(mindmap): replace hardcoded dark mode colors with theme variables for light mode support
- `[22:18:46]` fix: resolve workspace collaboration permissions and typing jitter
- `[23:50:53]` feat: add CSV bulk import for timesheet module

## 📅 Sunday, Apr 26, 2026
### 🧑‍💻 Youssef Halitou - 12.00 hours
**Tasks Completed:**
- `[00:45:20]` feat: improve keyboard navigation and accessibility
- `[02:38:15]` fix(e2e): stabilize kanban board tests by completely bypassing react closures
- `[03:26:24]` feat: implement contextual onboarding and feature discoverability tooltips
- `[03:44:38]` feat: implement enterprise features (GDPR, Soft Delete, Cron, Custom Fields, Feature Flags)
- `[03:53:18]` chore: mark enterprise features as complete in TODO
- `[04:29:18]` fix: resolve 7 enterprise-level mindmap bugs + add 13 integration tests
- `[09:04:18]` feat(mindmap): redesign toolbar with premium UI
- `[09:32:35]` fix(mindmap): improve toolbar color contrast for better readability
- `[22:58:05]` fix(mobile): hide sidebar, show bottom nav, clean header, responsive dashboard

## 📅 Saturday, Apr 25, 2026
### 🧑‍💻 Youssef Halitou - 12.00 hours
**Tasks Completed:**
- `[04:57:21]` refactor: security hardening, architecture decomposition, and test expansion
- `[22:53:25]` fix(security): close workspace auto-join loophole — require invite for access
- `[23:25:31]` chore(testing): P1 testing infrastructure + socket event tests + coverage baseline

## 📅 Friday, Apr 24, 2026
### 🧑‍💻 Youssef Halitou - 5.65 hours
**Tasks Completed:**
- `[00:37:42]` feat: add global toast system with queue, auto-dismiss, and accessibility
- `[00:45:33]` fix: use CSS Module class names for overdue stat card on Dashboard
- `[01:50:36]` feat: enhance mindmap with multiple maps, entity linking, and hierarchies
- `[02:05:47]` fix(mindmap): fix canvas double-click barrier and improve handle visibility
- `[02:07:52]` fix(mindmap): remove overflow hidden from node so handles are visible
- `[02:11:10]` fix(mindmap): increase z-index of nodes so lines don't overflow them
- `[02:16:55]` feat(mindmap): add keyboard workflow and restore minimap/zoom UI
- `[02:23:46]` feat(mindmap): implement auto-assigned hierarchical shapes
- `[02:35:58]` fix(mindmap): switch node input to textarea and fix handle clipping on diamond nodes
- `[02:58:42]` feat(mindmap): fix critical bugs + add context menu, toolbar controls, and polish
- `[04:16:47]` chore: add Fly.io deployment config with persistent volume

## 📅 Thursday, Apr 23, 2026
### 🧑‍💻 Youssef Halitou - 3.84 hours
**Tasks Completed:**
- `[00:26:03]` fix: sidebar collapse toggle hidden by overflow
- `[01:04:25]` feat: add Notes & Narratives tab for collaborative writing
- `[01:28:49]` fix: auto-select note after creation, fallback empty title to Untitled
- `[01:52:50]` feat: hierarchical notes with folders, nested tree, and drag-and-drop
- `[02:16:16]` fix(notes): correctly reset editing state on save by matching user.id

### 🧑‍💻 YoussefHalitou - 2.00 hours
**Tasks Completed:**
- `[22:22:00]` Merge pull request #1 from YoussefHalitou/feature/notes-hierarchy

## 📅 Wednesday, Apr 22, 2026
### 🧑‍💻 Youssef Halitou - 12.00 hours
**Tasks Completed:**
- `[01:10:03]` feat: add subworkspaces — hierarchical workspace tree
- `[01:24:56]` feat: multi-workspace selection for board, gantt & dashboard
- `[01:35:13]` fix: deduplicate columns by title in multi-workspace merge
- `[01:52:56]` fix: parent workspace navigation and active state in sidebar tree
- `[22:45:31]` feat: add workspace-level Timesheet (Zeiterfassung) view

## 📅 Tuesday, Apr 21, 2026
### 🧑‍💻 Youssef Halitou - 2.00 hours
**Tasks Completed:**
- `[18:31:28]` fix(client): resolve failing tests and fix header dropdown z-index

## 📅 Sunday, Apr 19, 2026
### 🧑‍💻 Youssef Halitou - 5.64 hours
**Tasks Completed:**
- `[16:56:15]` fix: add missing auth headers to api calls
- `[17:23:56]` fix: make tiptap toolbar scrollable on mobile
- `[17:56:26]` fix: landing page workspace creation form mobile layout
- `[18:01:27]` fix: enforce touch-action none for fluid gantt bar touch dragging
- `[18:17:03]` test: vitest setup with auth, invites, and attachments integration suites
- `[18:51:42]` test: implement workspace, task queries and lifecycle integration tests
- `[19:10:42]` test: complete playwright E2E test suites for milestone B4
- `[19:27:50]` test: complete frontend component test coverage with vitest
- `[20:34:22]` feat: implement threaded comments

## 📅 Saturday, Apr 18, 2026
### 🧑‍💻 Youssef Halitou - 2.25 hours
**Tasks Completed:**
- `[05:46:18]` feat(i18n): Complete Milestone 3 German Localization & Fix backend auth startup
- `[06:01:16]` feat: quick wins + milestone 4 mobile hardening

## 📅 Friday, Apr 17, 2026
### 🧑‍💻 Youssef Halitou - 12.00 hours
**Tasks Completed:**
- `[07:24:16]` docs: add enterprise audit, roadmap, todo list & valuation analysis
- `[07:34:54]` chore(milestone-1): fix cors, localhost fallbacks, and add error boundary
- `[08:00:48]` refactor: backend query domains, frontend task detail breakdown, and resolve TS compilation errors
- `[17:32:04]` docs: update enterprise readiness todo list
- `[17:41:12]` feat(server): complete B2 structured logging
- `[17:47:53]` feat(server): complete B6 Zod validation on all REST routes
- `[20:06:05]` feat(css): modularize monolithic index.css into 7 CSS Modules
- `[20:29:44]` feat: M3 i18n setup and handlers.ts split

## 📅 Thursday, Apr 16, 2026
### 🧑‍💻 Youssef Halitou - 9.68 hours
**Tasks Completed:**
- `[00:02:36]` feat: collaborative enhancements - presence, subtasks, activity feed, themes & more
- `[00:23:06]` feat: complete Round 3 implementation (Gantt drag/zoom, Markdown, Label management, Start Date)
- `[00:39:02]` feat: complete Round 4 implementations (dependencies, archiving, estimates, dnd-kit)
- `[00:48:59]` feat: complete round 5 - live cursors, markdown support, covers and UI polish
- `[00:57:55]` feat: tier 9-12 technical debt cleanup
- `[01:44:09]` fix: enable scroll on landing page
- `[01:52:56]` feat: integrate HTML Gantt templates as Workspace templates
- `[02:30:00]` refactor: implement phase 1 & 2 structural refactoring, zustand, umzug, and css modules
- `[02:31:56]` fix: correct corrupted string interpolation in SortableColumn
- `[02:36:58]` fix: correct label-color-dot string interpolation in SortableColumn
- `[02:41:49]` chore: sync local db wal file
- `[03:36:20]` feat: RBAC enforcement, TipTap rich editor, and admin role management
- `[04:01:50]` feat: implement remaining TODO items
- `[04:21:09]` fix: resolve double /api prefix in auth endpoint URL
- `[04:51:20]` feat: open link sharing - auto-join workspace via link as editor
- `[04:55:47]` chore: untrack database temporary files from git
- `[06:16:04]` feat: complete UI polish and responsive mobile layout architecture
- `[07:26:08]` feat: Phase 2 UX & functional upgrades
- `[07:43:39]` feat: Phase 3 — Core features (PWA, notifications, invites, @mentions, onboarding, Gantt, analytics)

## 📅 Wednesday, Apr 15, 2026
### 🧑‍💻 Youssef Halitou - 2.00 hours
**Tasks Completed:**
- `[22:56:30]` feat: add real-time collaborative project management app
