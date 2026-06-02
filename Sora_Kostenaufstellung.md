# Kostenaufstellung: Softwareentwicklung Sora

> **Hinweis:** Es wurde ein exemplarischer Stundensatz von **45.00 €** angenommen. Dieser kann im Dokument nach Bedarf angepasst werden.

## Übersicht
| Monat / Zeitraum | Aufwand (Stunden) | Stundensatz | Kosten (Netto) |
|---|---|---|---|
| 2026-04 | 98.12 h | 45.00 € | **4,415.35 €** |
| 2026-05 | 4.00 h | 45.00 € | **180.00 €** |
| 2026-06 | 2.00 h | 45.00 € | **90.00 €** |
| **Gesamt** | **104.12 h** | | **4,685.35 €** |

---

## Detaillierter Leistungsnachweis (nach Monaten)

### Leistungszeitraum: 2026-06
**Berechnete Stunden:** 2.00 h

**Erbrachte Leistungen:**
- 01.06.2026 - fix: use authFetch for all API calls to prevent session expiry breaking subworkspaces

### Leistungszeitraum: 2026-05
**Berechnete Stunden:** 4.00 h

**Erbrachte Leistungen:**
- 05.05.2026 - Merge pull request #4 from YoussefHalitou/fix/socket-session-persistence
- 05.05.2026 - fix: auto-refresh JWT on socket reconnect to prevent offline state

### Leistungszeitraum: 2026-04
**Berechnete Stunden:** 98.12 h

**Erbrachte Leistungen:**
- 29.04.2026 - fix: migration glob to match .js files in production Docker build
- 29.04.2026 - fix: remove local .env during Docker build so API calls use relative /api path
- 29.04.2026 - Merge pull request #3 from YoussefHalitou/feat/csv-timesheet-import
- 29.04.2026 - chore: add vercel frontend url to CORS_ORIGIN
- 29.04.2026 - fix: replace app.get('*') with app.use() to fix express 5 crash
- 29.04.2026 - Merge pull request #2 from YoussefHalitou/feat/csv-timesheet-import
- 29.04.2026 - chore: fix deployment issues for Fly.io and Vercel
- 27.04.2026 - feat: add CSV bulk import for timesheet module
- 27.04.2026 - fix: resolve workspace collaboration permissions and typing jitter
- 27.04.2026 - fix(mindmap): replace hardcoded dark mode colors with theme variables for light mode support
- 27.04.2026 - feat(notes): add collapsible sidebar toggle
- 27.04.2026 - fix(mindmap): widen sidebar to 320px, add collapse toggle, fix footer overflow
- 27.04.2026 - feat(mindmap): add 5 new creation methods
- 27.04.2026 - feat(mindmap): add duplicate mind map and node copy/paste functionality
- 27.04.2026 - style: update Cortex logos to brain icon and email templates
- 27.04.2026 - feat: complete Cortex rebrand and add user name change
- 27.04.2026 - fix: use API_URL for gdpr endpoints in UserSettingsModal to prevent 404s
- 27.04.2026 - feat: email verification, password change & forgot/reset password
- 27.04.2026 - polish: fix unstyled helper containers across task detail, board, and layout modals
- 27.04.2026 - feat: upgrade Notizen to rich text editor & add mindmap folder structure
- 26.04.2026 - fix(mobile): hide sidebar, show bottom nav, clean header, responsive dashboard
- 26.04.2026 - fix(mindmap): improve toolbar color contrast for better readability
- 26.04.2026 - feat(mindmap): redesign toolbar with premium UI
- 26.04.2026 - fix: resolve 7 enterprise-level mindmap bugs + add 13 integration tests
- 26.04.2026 - chore: mark enterprise features as complete in TODO
- 26.04.2026 - feat: implement enterprise features (GDPR, Soft Delete, Cron, Custom Fields, Feature Flags)
- 26.04.2026 - feat: implement contextual onboarding and feature discoverability tooltips
- 26.04.2026 - fix(e2e): stabilize kanban board tests by completely bypassing react closures
- 26.04.2026 - feat: improve keyboard navigation and accessibility
- 25.04.2026 - chore(testing): P1 testing infrastructure + socket event tests + coverage baseline
- 25.04.2026 - fix(security): close workspace auto-join loophole — require invite for access
- 25.04.2026 - refactor: security hardening, architecture decomposition, and test expansion
- 24.04.2026 - chore: add Fly.io deployment config with persistent volume
- 24.04.2026 - feat(mindmap): fix critical bugs + add context menu, toolbar controls, and polish
- 24.04.2026 - fix(mindmap): switch node input to textarea and fix handle clipping on diamond nodes
- 24.04.2026 - feat(mindmap): implement auto-assigned hierarchical shapes
- 24.04.2026 - feat(mindmap): add keyboard workflow and restore minimap/zoom UI
- 24.04.2026 - fix(mindmap): increase z-index of nodes so lines don't overflow them
- 24.04.2026 - fix(mindmap): remove overflow hidden from node so handles are visible
- 24.04.2026 - fix(mindmap): fix canvas double-click barrier and improve handle visibility
- 24.04.2026 - feat: enhance mindmap with multiple maps, entity linking, and hierarchies
- 24.04.2026 - fix: use CSS Module class names for overdue stat card on Dashboard
- 24.04.2026 - feat: add global toast system with queue, auto-dismiss, and accessibility
- 23.04.2026 - Merge pull request #1 from YoussefHalitou/feature/notes-hierarchy
- 23.04.2026 - fix(notes): correctly reset editing state on save by matching user.id
- 23.04.2026 - feat: hierarchical notes with folders, nested tree, and drag-and-drop
- 23.04.2026 - fix: auto-select note after creation, fallback empty title to Untitled
- 23.04.2026 - feat: add Notes & Narratives tab for collaborative writing
- 23.04.2026 - fix: sidebar collapse toggle hidden by overflow
- 22.04.2026 - feat: add workspace-level Timesheet (Zeiterfassung) view
- 22.04.2026 - fix: parent workspace navigation and active state in sidebar tree
- 22.04.2026 - fix: deduplicate columns by title in multi-workspace merge
- 22.04.2026 - feat: multi-workspace selection for board, gantt & dashboard
- 22.04.2026 - feat: add subworkspaces — hierarchical workspace tree
- 21.04.2026 - fix(client): resolve failing tests and fix header dropdown z-index
- 19.04.2026 - feat: implement threaded comments
- 19.04.2026 - test: complete frontend component test coverage with vitest
- 19.04.2026 - test: complete playwright E2E test suites for milestone B4
- 19.04.2026 - test: implement workspace, task queries and lifecycle integration tests
- 19.04.2026 - test: vitest setup with auth, invites, and attachments integration suites
- 19.04.2026 - fix: enforce touch-action none for fluid gantt bar touch dragging
- 19.04.2026 - fix: landing page workspace creation form mobile layout
- 19.04.2026 - fix: make tiptap toolbar scrollable on mobile
- 19.04.2026 - fix: add missing auth headers to api calls
- 18.04.2026 - feat: quick wins + milestone 4 mobile hardening
- 18.04.2026 - feat(i18n): Complete Milestone 3 German Localization & Fix backend auth startup
- 17.04.2026 - feat: M3 i18n setup and handlers.ts split
- 17.04.2026 - feat(css): modularize monolithic index.css into 7 CSS Modules
- 17.04.2026 - feat(server): complete B6 Zod validation on all REST routes
- 17.04.2026 - feat(server): complete B2 structured logging
- 17.04.2026 - docs: update enterprise readiness todo list
- 17.04.2026 - refactor: backend query domains, frontend task detail breakdown, and resolve TS compilation errors
- 17.04.2026 - chore(milestone-1): fix cors, localhost fallbacks, and add error boundary
- 17.04.2026 - docs: add enterprise audit, roadmap, todo list & valuation analysis
- 16.04.2026 - feat: Phase 3 — Core features (PWA, notifications, invites, @mentions, onboarding, Gantt, analytics)
- 16.04.2026 - feat: Phase 2 UX & functional upgrades
- 16.04.2026 - feat: complete UI polish and responsive mobile layout architecture
- 16.04.2026 - chore: untrack database temporary files from git
- 16.04.2026 - feat: open link sharing - auto-join workspace via link as editor
- 16.04.2026 - fix: resolve double /api prefix in auth endpoint URL
- 16.04.2026 - feat: implement remaining TODO items
- 16.04.2026 - feat: RBAC enforcement, TipTap rich editor, and admin role management
- 16.04.2026 - chore: sync local db wal file
- 16.04.2026 - fix: correct label-color-dot string interpolation in SortableColumn
- 16.04.2026 - fix: correct corrupted string interpolation in SortableColumn
- 16.04.2026 - refactor: implement phase 1 & 2 structural refactoring, zustand, umzug, and css modules
- 16.04.2026 - feat: integrate HTML Gantt templates as Workspace templates
- 16.04.2026 - fix: enable scroll on landing page
- 16.04.2026 - feat: tier 9-12 technical debt cleanup
- 16.04.2026 - feat: complete round 5 - live cursors, markdown support, covers and UI polish
- 16.04.2026 - feat: complete Round 4 implementations (dependencies, archiving, estimates, dnd-kit)
- 16.04.2026 - feat: complete Round 3 implementation (Gantt drag/zoom, Markdown, Label management, Start Date)
- 16.04.2026 - feat: collaborative enhancements - presence, subtasks, activity feed, themes & more
- 15.04.2026 - feat: add real-time collaborative project management app
