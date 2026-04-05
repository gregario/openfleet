# Changelog

All notable changes to OpenFleet will be documented in this file.

## [Unreleased]

### Added — gps-trips milestone
- GPS ingestion REST API with batch support, session + API-key auth, rate limiting, snake_case column mapping
- Trip state machine: auto-open trips (>5km/h for 30s), auto-close trips (stationary >3min), haversine distance calculation, 200m minimum trip filter
- `POST /api/trips/sweep` endpoint for cron-driven closure of trips where vehicles stopped reporting
- GPS simulator Docker service: 3 speed profiles (urban/suburban/highway), configurable vehicle count + tick interval, API-key authenticated
- Trips list + polyline map detail view — per-vehicle Trips tab with duration/distance/status, `/trips/[id]` page with MapLibre polyline + start/end markers

### Added — maintenance milestone
- Service schedule CRUD with mileage-based, time-based, or dual triggers; status badges (OK / Due soon / Overdue)
- Alert generation from schedules — CRITICAL for overdue, WARNING for within-threshold, deduped across sweeps
- Dashboard alerts widget with severity-sorted list, dismiss action, 60s auto-refresh
- Maintenance record logging with cost tracking, vendor, notes, receipt photo upload; auto-resets schedule countdown and dismisses related alerts
- Service history per vehicle with aggregated total cost

### Added — driver-auth milestone
- First-admin setup flow at `/setup` when no admin exists (`GET/POST /api/setup`)
- Driver home page shows assigned vehicles from DriverAssignment table
- Driver CRUD: `/drivers` list with licence-expiry status badges, `/drivers/new` creation, `/drivers/[id]` detail with assignment history
- Driver-assignment controls: assign vehicle (Primary / Pool), end assignment; Primary auto-ends existing Primary on same vehicle
- Licence expiry alerts (CRITICAL if expired, WARNING within 30 days) rolled into the alerts generator
- Privacy notice modal on first driver login, blocking until acknowledged
- Driver shift toggle wired to `POST /api/privacy/shift`, tracking indicator derived from on_shift + tracking_enabled + schedule window
- Admin privacy controls per driver: tracking-enabled toggle, schedule HH:MM window, GDPR data export (JSON/CSV), GDPR hard-delete

### Added — inspections milestone
- Inspection template CRUD with per-vehicle-type targeting + configurable frequency (days)
- TemplateEditor: add/remove/reorder checklist items, archive (soft-delete preserves inspection history)
- Driver pre-trip inspection flow: select vehicle + checklist, PASS/FAIL/N-A per item, notes + photo on failure, overall notes, submit
- Inspection submissions are timestamped and immutable (no update endpoint); failed inspections auto-raise a CRITICAL alert
- Per-vehicle Inspections tab: compliance status card (Current / Due today / Due in Nd / Overdue), pass/fail stats, history table, compliance disclaimer

### Changed
- Schema: added User fields (tracking_enabled, on_shift, shift_ended_at, tracking_schedule_start, tracking_schedule_end), Vehicle.vehicle_type, InspectionTemplate.(vehicle_type, frequency_days)
- Removed runtime Prisma client from `src/lib/db.ts` — runtime is now 100% supabase-js (edge-compatible). Prisma remains for schema-push only.
- `/api/health` now uses supabase probe instead of Prisma `$queryRaw`

## [0.2.0] - 2026-04-01

### Added
- Live fleet map on the dashboard with color-coded vehicle markers by traffic light status (green/orange/red)
- Real-time vehicle position updates via Server-Sent Events with <5s latency
- Direction-of-travel arrows on moving vehicles for spatial awareness
- Vehicle marker clustering at low zoom levels to handle 50+ vehicles without clutter
- Click-to-inspect vehicle popups showing name, plate, driver, speed, motion state, and traffic light status
- Map view persistence — zoom level and center position remembered between sessions via localStorage
- Loading skeleton placeholder during map initialization
- Error boundary with retry around the map component for WebGL and tile failures
- Empty state display when no vehicles exist, with link to vehicle management
- Authentication on all data API routes (vehicles, positions, position stream)
- Rate limiting on position ingestion (100 req/min) and login (5 req/min) endpoints
- Foundation layer: PostgreSQL + PostGIS database, Prisma schema, session-based auth, shared UI shell, seed data

### Fixed
- SSE stream data envelope mismatch between server and client
- XSS vulnerability in vehicle popup HTML rendering — all user-controllable fields now escaped
- JSON parse crash on malformed SSE data — wrapped in try/catch with graceful recovery
- Login query now uses explicit column whitelist instead of select-all
- Dashboard positions query optimized — latest position denormalized onto vehicle row, eliminating full table scan
