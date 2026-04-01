# Changelog

All notable changes to OpenFleet will be documented in this file.

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
