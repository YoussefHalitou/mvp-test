# Kostenaufstellung: Softwareentwicklung MVP

> **Hinweis:** Es wurde ein exemplarischer Stundensatz von **45.00 €** angenommen. Dieser kann im Dokument nach Bedarf angepasst werden.

## Übersicht
| Monat / Zeitraum | Aufwand (Stunden) | Stundensatz | Kosten (Netto) |
|---|---|---|---|
| 2025-08 | 7.48 h | 45.00 € | **336.80 €** |
| 2025-11 | 10.39 h | 45.00 € | **467.60 €** |
| 2025-12 | 2.00 h | 45.00 € | **90.00 €** |
| 2026-02 | 41.96 h | 45.00 € | **1,888.06 €** |
| 2026-03 | 101.86 h | 45.00 € | **4,583.91 €** |
| 2026-04 | 15.87 h | 45.00 € | **713.99 €** |
| 2026-05 | 6.07 h | 45.00 € | **272.99 €** |
| **Gesamt** | **185.63 h** | | **8,353.35 €** |

---

## Detaillierter Leistungsnachweis (nach Monaten)

### Leistungszeitraum: 2026-05
**Berechnete Stunden:** 6.07 h

**Erbrachte Leistungen:**
- 15.05.2026 - Merge pull request #25 from YoussefHalitou/fix/tracking-replace-and-planning-order
- 15.05.2026 - Fix tracking employee replacement and planning order
- 05.05.2026 - fix: cast break_minutes to number to fix build type error
- 05.05.2026 - fix: cast hours_estimated to number to fix build type error

### Leistungszeitraum: 2026-04
**Berechnete Stunden:** 15.87 h

**Erbrachte Leistungen:**
- 30.04.2026 - Merge pull request #23 from YoussefHalitou/feature/multi-stunden-pairs-and-modal-fix
- 30.04.2026 - feat: multi Stunden/Stundensatz pairs in KV/FP panel + modal close confirmation
- 23.04.2026 - feat(nachkalkulation): upgrade material input to support specific values
- 23.04.2026 - feat(nachkalkulation): allow manual addition of catalog materials to kv estimate
- 23.04.2026 - fix(tracking): include notes field in save payload for time pairs
- 23.04.2026 - fix(tracking): allow 0 in decimal number inputs by retaining string state until save
- 23.04.2026 - fix(tracking): restore empty value behavior for zero inputs while keeping decimal capability
- 23.04.2026 - Merge pull request #22 from YoussefHalitou/feature/nachkalkulation-kv-material-inputs
- 02.04.2026 - Merge pull request #21 from YoussefHalitou/feature/nachkalkulation-coloring-schema
- 02.04.2026 - feat: FP revenue logic — Festpreis values are the billing basis
- 02.04.2026 - refactor: rename Ist-Erlöse → Kalk. Erlöse (kalkulierte Erlöse)
- 02.04.2026 - fix: Kalk. Erlöse Summe shows istRevenue instead of mirroring Kunde column
- 02.04.2026 - feat: add Kalk. Marge (€ + %) KPI cards and PDF export rows for FP mode
- 02.04.2026 - feat: add KV estimation accuracy KPIs (KV-Wert, Abweichung, KV-Marge)
- 02.04.2026 - feat(nachkalkulation): add 7-layer coloring schema for visual profitability highlighting
- 02.04.2026 - feat(exports): apply coloring schema (Option B) to Standard Export and Auftragsnachkalkulation PDF
- 01.04.2026 - feat: add FP (Festpreis) values container and swap Kunde/Ist columns in export

### Leistungszeitraum: 2026-03
**Berechnete Stunden:** 101.86 h

**Erbrachte Leistungen:**
- 31.03.2026 - Merge pull request #16 from YoussefHalitou/fix-calculation-inputs-persistence
- 31.03.2026 - Merge pull request #17 from YoussefHalitou/fix-calculation-inputs-persistence
- 31.03.2026 - Merge pull request #18 from YoussefHalitou/fix-calculation-inputs-persistence
- 31.03.2026 - Merge pull request #20 from YoussefHalitou/feature/freigaben-delete
- 31.03.2026 - fix(calculation): correctly delete empty KV Werte from database
- 31.03.2026 - fix(calculation): persist Kundennummer, Angebotsnummer, and KV inputs properly across tab switches
- 31.03.2026 - style(calculation): rename Sonderkosten to Sonstige Kosten and reorder export items
- 31.03.2026 - feat(calculation): restructure Sonstige Kosten to BNK pattern, remove Erlöse Rechnungspositionen
- 31.03.2026 - feat(calculation): add Stunden/Stundensatz KV fields, remove Erlöse section, fix export formatting
- 31.03.2026 - feat(calculation): add Kunde formula in export, KV shows stunden value in Gesamt Std row
- 31.03.2026 - fix(export): prevent KV vorher summary block from splitting across pages
- 31.03.2026 - feat: add delete functionality to Freigaben entries
- 30.03.2026 - feat: Nachkalkulation tab - 8 UI/data modifications
- 30.03.2026 - feat: Fahrzeug table - BNK-style structure with Beschreibung/Menge/EK-VK
- 30.03.2026 - feat: Material - make VK/Einheit inline editable
- 30.03.2026 - feat: Export header - replace Sonstige Bemerkungen with KV/Kundennummer/Angebotsnummer
- 25.03.2026 - feat: add cross-out and replace employee features to Arbeitseinsätze
- 20.03.2026 - Merge pull request #14 from YoussefHalitou/feat/draggable-plan-cards-between-days
- 20.03.2026 - feat: make plan cards draggable between days in week/3-day views
- 19.03.2026 - Merge pull request #13 from YoussefHalitou/fix/planning-drag-drop-and-date-sync
- 19.03.2026 - fix: prevent syncProjectDate from overwriting plan dates via DB trigger
- 18.03.2026 - feat: add cross-out employee in Rückerfassung without replacement
- 18.03.2026 - feat: add cross-out (Streichen) employee in Rückerfassung without replacement
- 18.03.2026 - fix: improve replace/streichen dropdown visibility with portal positioning
- 18.03.2026 - fix: exclude replaced and crossed-out employees from Nachkalkulation
- 18.03.2026 - feat: add Arbeitseinsätze table to tracking export
- 18.03.2026 - feat: force Ersetzte Mitarbeiter table to separate page in export
- 18.03.2026 - Merge pull request #12 from YoussefHalitou/fix/nachkalkulation-exclude-replaced
- 17.03.2026 - feat: add export button to Rückerfassung tab (HTML/PDF)
- 17.03.2026 - feat: add Gesamtübersicht and Ersetzte Mitarbeiter tables to tracking export
- 17.03.2026 - fix: Startzeit/Uhrzeit save issues in Planning and Projects
- 16.03.2026 - Merge pull request #11 from YoussefHalitou/feat/employee-replacement-tracking
- 13.03.2026 - fix: reorder Dienstleistung inputs (Leistung→Lieferant), fix supplier-specific pricing, add Gesamtübersicht with Intern/Extern split
- 13.03.2026 - feat: employee replacement tracking in Rückerfassung
- 12.03.2026 - Merge pull request #9 from YoussefHalitou/feature/nachkalkulation-lis-kd-rates
- 12.03.2026 - Merge pull request #10 from YoussefHalitou/fix/multiday-nachkalkulation-per-date
- 12.03.2026 - feat: Nachkalkulation - LiS Std as costs, Kd Std as revenue with separate editable rates
- 12.03.2026 - feat: add project selection to Arbeitseinsatz + Nachkalkulation integration
- 12.03.2026 - fix: work assignment hours also count as Kd Std in Nachkalkulation
- 12.03.2026 - feat: add Entrümpelung to work types and allow free-text entry
- 12.03.2026 - feat: improve project dropdown with customer name + date, sorted by date
- 12.03.2026 - fix: multiday projects — per-date Nachkalkulation entries & date sync
- 11.03.2026 - fix(export): reposition Rabatt row and add Summe totals for LiS/Kunde/KV
- 11.03.2026 - feat: add Nachkalkulation approval workflow with Freigaben tab
- 11.03.2026 - fix: rewrite mobile Nachkalkulation to load data from correct project tables
- 11.03.2026 - feat: add mobile Freigaben (approvals) view
- 10.03.2026 - feat(nachkalkulation): add dynamic Kostenvoranschlag (KV) support
- 06.03.2026 - Merge pull request #8 from YoussefHalitou/feature/planning-and-projects-fix
- 06.03.2026 - feat(tracking): remove cost metrics from material/services and update sonderkosten to combobox
- 06.03.2026 - feat(calculation): switch order of lieferant and leistung in modal
- 06.03.2026 - feat(tracking): remove number input spinners globally and add onFocus selection to pause field feat(calculation): group projects by month with collapsible accordions and status dots
- 06.03.2026 - fix(tracking): remove default value of 1 for quantity in material and service panels so fields start empty
- 06.03.2026 - fix(calculation): remove default values of 0 and 1 from all add-cost modals so they start empty
- 06.03.2026 - fix(calculation): remove default 0/1 values from calculation table inputs for Material, Dienstleistungskosten, Rabatte, and Erlöse so fields render appropriately empty
- 06.03.2026 - fix(calculation): apply quantity reset fixes to modals, convert fahrzeug to datalist input, and add kosten/erlöse calcs to hvz bnk table ui
- 06.03.2026 - fix(calculation): resolve TypeError in Discounts/Rabatte by aligning frontend properties with the database schema (id, mode, description)
- 06.03.2026 - fix(calculation): upsert new free-text vehicles into t_vehicles to prevent foreign key 409 conflict when adding vehicle costs
- 06.03.2026 - fix(calculation): move LKW vehicle values from 'Land in Sicht' column to 'Kunde' column in PDF export HTML
- 06.03.2026 - feat: auto-format time input in tracking view
- 06.03.2026 - fix(planning): fix employee notes input state when date changes
- 06.03.2026 - fix(planning): timeline date switching not updating selected day
- 06.03.2026 - feat(projects): allow free text input for anrede and dienstleistungen in project creation/edit
- 06.03.2026 - fix(projects): sync types and prepare migration for dienstleistung_makro
- 06.03.2026 - feat(projects): add Dienstleistung (Makro) and Angebotsart to projects table
- 06.03.2026 - style(projects): optimize table layout to reduce crowding
- 06.03.2026 - fix(projects): ensure detail panel visibility by adjusting flex layout
- 05.03.2026 - feat: refactor cost panels and add Erlöse to Dienstleistungskosten
- 05.03.2026 - feat: add Sonderkosten panel to Rückerfassung (Tracking) mapped to Nachkalkulation
- 05.03.2026 - feat: make tracking cost panels collapsible and swap supplier-service select order
- 03.03.2026 - feat: Add per-employee LiS/Kd cost basis toggle in Nachkalkulation and fix PDF export rendering
- 03.03.2026 - feat: Add multi-project merge in Nachkalkulation and fix PDF export rendering
- 03.03.2026 - feat: reorderable calculation layout, hvz/bnk containers, and print fixes
- 03.03.2026 - feat: add dienstleistung (makro) and update angebotsart options
- 03.03.2026 - feat: implement dependent dropdowns for macro/micro services and update colors
- 03.03.2026 - Merge pull request #6 from YoussefHalitou/feature/export-besichtigung-tracking-fix
- 03.03.2026 - Merge pull request #7 from YoussefHalitou/feature/multi-project-nachkalkulation
- 02.03.2026 - feat: Add Besichtigung export for workers and fix Tracking deletion bug

### Leistungszeitraum: 2026-02
**Berechnete Stunden:** 41.96 h

**Erbrachte Leistungen:**
- 26.02.2026 - feat(mobile): implement responsive mobile ui with all 8 dash views
- 26.02.2026 - fix(mobile): switch to native body scrolling for proper sticky header stacking
- 26.02.2026 - Fix calculation and exports, add Dienstleistungen mapping
- 26.02.2026 - Fix PDF page breaking for Planning Exports
- 26.02.2026 - Merge pull request #3 from YoussefHalitou/feature/mobile-view
- 26.02.2026 - Merge pull request #4 from YoussefHalitou/feature/mobile-view
- 26.02.2026 - Merge pull request #5 from YoussefHalitou/fix/nachkalkulation-project-updates
- 25.02.2026 - feat: add Urlaubs-/Terminplaner (leave planner) to dashboard
- 25.02.2026 - feat: add time frame support for Termin and Schulung in leave planner
- 25.02.2026 - feat: add Dateien file manager, calendar events in cells, remove Word export
- 24.02.2026 - feat: migrate custom columns to Supabase + sidebar demo badge
- 24.02.2026 - feat: add Month and 3-Day calendar views to Einsatzplanung
- 24.02.2026 - feat(marketing): Add Extended KPI Dashboard with Date Range Filters
- 24.02.2026 - fix(marketing): Resolve day view navigation and improve tracking pickers
- 24.02.2026 - feat(marketing): Add user account management and logout to sidebar
- 24.02.2026 - fix(resources): resolve Next.js build type errors in ResourcesClient
- 24.02.2026 - fix(sidebar): clear has_session cookie on logout
- 24.02.2026 - fix(sidebar): clear has_session cookie on logout
- 24.02.2026 - feat(auth): switch registration to supabase, add vorname and nachname
- 24.02.2026 - Merge branch 'feature/sidebar-account-management'
- 24.02.2026 - fix(resources): fix employee creation by letting Supabase generate UUID
- 24.02.2026 - fix(planning): fix date navigation bug and employee notes input clearing
- 24.02.2026 - feat(tracking): allow manual addition of employee rows in tracking view
- 24.02.2026 - fix: resolve UTC offset date selection bug in tracking and planning clients
- 24.02.2026 - Merge pull request #1 from YoussefHalitou/feature/sidebar-account-management
- 24.02.2026 - Merge pull request #2 from YoussefHalitou/feature/sidebar-account-management
- 23.02.2026 - Update project files

### Leistungszeitraum: 2025-12
**Berechnete Stunden:** 2.00 h

**Erbrachte Leistungen:**
- 15.12.2025 - Initial commit: Medical chatbot application with frontend, backend, and deployment scripts

### Leistungszeitraum: 2025-11
**Berechnete Stunden:** 10.39 h

**Erbrachte Leistungen:**
- 21.11.2025 - Fix: Enable iframe embedding with CORS and CSP configuration
- 21.11.2025 - Update: Frontend configuration and styling changes
- 19.11.2025 - Initial commit: Medical Chatbot with ngrok setup and complete project files
- 19.11.2025 - Add medical-chatbot directory with complete project
- 19.11.2025 - Replace inline widget with iframe embed for chatbot

### Leistungszeitraum: 2025-08
**Berechnete Stunden:** 7.48 h

**Erbrachte Leistungen:**
- 06.08.2025 - Add topic-specific social media links for Radiesse, LaseMD, and Lipfiller treatments
- 06.08.2025 - Fix topic-specific social media links - add mandatory instructions for Radiesse, LaseMD, and Lipfiller
- 05.08.2025 - Update vielleicht index.html
- 05.08.2025 - Update index.html
- 05.08.2025 - newest Update index.html
- 05.08.2025 - Initial commit

