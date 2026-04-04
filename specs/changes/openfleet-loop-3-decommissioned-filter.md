# Change Spec: openfleet-loop-3-decommissioned-filter

**Cycle:** 1
**Analysis Run:** 10
**Type:** deepen:improvements
**Grouped Gaps:** imp-decommissioned-filter
**Requires Design Mode:** false

---

## Gap Evidence

### Quality Gap: Server-Side Filter Makes Client Toggle Non-Functional

- **Gap ID:** imp-decommissioned-filter
- **Category:** interaction_improvement
- **Severity:** medium
- **Root Cause:** missing_context
- **Root Cause Evidence:** GET /api/vehicles applies `.neq("status", "DECOMMISSIONED")` at line 16 of src/app/api/vehicles/route.ts, excluding all decommissioned vehicles server-side. The client VehicleList component (vehicle-list.tsx) has a "Show decommissioned" checkbox toggle that filters client-side, but since the API never returns decommissioned vehicles, the toggle has no effect. The AC says "Decommissioned vehicles hidden from map and dashboard by default, visible via filter" — "visible via filter" means the client-side toggle should be able to reveal them. The server-side exclusion was an incorrect interpretation of "hidden by default" as "never returned by API" rather than "returned but hidden in UI by default."

### Current State (What's Wrong)

- **Description:** The "Show decommissioned" checkbox on the vehicle list page does nothing. When checked, no additional vehicles appear because the API never returns vehicles with status DECOMMISSIONED. The client code correctly filters decommissioned vehicles out when the toggle is unchecked and includes them when checked — but the server already excluded them from the response. Owner-operators who decommission a vehicle can never see it again in the vehicle list, making the toggle a dead control.
- **QA Assessment:** "GET /api/vehicles excludes DECOMMISSIONED server-side (.neq filter), making client Show decommissioned toggle non-functional. AC says visible via filter." (functional_correctness, severity: medium)
- **PO Assessment:** "Decommissioned filter toggle present (though API-side filter issue noted as improvement item)" (po_vehicle_registry, FA2-J4)
- **Heuristics Failed:** User control and freedom (Nielsen #3)
- **Affected Screens:** S4-vehicle-list
- **Affected Journeys:** FA2-J4 (Change vehicle status — decommissioned visibility)

### Previous Attempts (Do Not Repeat)

First attempt.

---

## Target State

### From Product Standard

- `design_standards.vehicle_status.system`: "Traffic light (green/orange/red)" — decommissioned is a valid status that users set; they must be able to see those vehicles again
- `voice_and_tone.practical`: "Every element should be useful or get out of the way" — the toggle must actually work or be removed. Making it work is the correct fix per the AC.

### From Active Spec

FA2 acceptance criteria: "Decommissioned vehicles hidden from map and dashboard by default, visible via filter"

This means:
- The default view (toggle unchecked) hides decommissioned vehicles — this is working correctly in the client
- When the toggle is checked, decommissioned vehicles appear — this requires the API to return them

### Concrete Description

After this fix:

1. **GET /api/vehicles** returns ALL vehicles regardless of status, including DECOMMISSIONED. The `.neq("status", "DECOMMISSIONED")` filter is removed from the Supabase query.

2. **The client VehicleList** continues to work exactly as it does now: `showDecommissioned` defaults to `false`, filtering out DECOMMISSIONED vehicles. When the user checks the toggle, decommissioned vehicles appear in the list.

3. **The fleet health summary** counts include decommissioned vehicles when the toggle is active (this already works in the client code — `healthSummary` useMemo respects `showDecommissioned`).

4. **Other API consumers** (dashboard-map, fleet-sidebar) that call GET /api/vehicles will now receive decommissioned vehicles in the response. These consumers already handle status filtering: dashboard-map.tsx filters by status for map markers, fleet-sidebar handles the full list. Decommissioned vehicles should NOT appear on the map or in the sidebar alerts — verify that existing client-side filtering in these components excludes DECOMMISSIONED appropriately, or add client-side filtering if missing.

---

## Design Requirements

- **Requires Design Mode:** false
- **Design Mode Scope:** N/A — no visual changes. The toggle UI already exists and is correctly implemented.
- **Design Direction:** Remove server-side filter. The client-side filtering is already correct.
- **Design Constraints:** The "Show decommissioned" toggle must remain a checkbox (not change to a different control type). Default state must remain unchecked (decommissioned hidden by default per AC).

---

## Acceptance Criteria

AC-decom-filter-1: API returns decommissioned vehicles
  GIVEN an authenticated user
  WHEN GET /api/vehicles is called and there exist vehicles with status DECOMMISSIONED in the database
  THEN the response includes vehicles with status "DECOMMISSIONED"
  MEASUREMENT: API test — seed database with a DECOMMISSIONED vehicle, call GET /api/vehicles, assert response contains vehicle with status DECOMMISSIONED
  CLOSES_GAP: imp-decommissioned-filter

AC-decom-filter-2: Toggle reveals decommissioned vehicles
  GIVEN the vehicle list page is loaded with at least one DECOMMISSIONED vehicle in the data
  WHEN the "Show decommissioned" checkbox is unchecked (default)
  THEN decommissioned vehicles are NOT visible in the list
  MEASUREMENT: Component test — render VehicleList with a DECOMMISSIONED vehicle in props, assert vehicle not in rendered list when toggle is unchecked
  CLOSES_GAP: imp-decommissioned-filter

AC-decom-filter-3: Toggle shows decommissioned when checked
  GIVEN the vehicle list page with at least one DECOMMISSIONED vehicle
  WHEN the user checks the "Show decommissioned" checkbox
  THEN decommissioned vehicles appear in the list
  MEASUREMENT: Component test — render VehicleList with DECOMMISSIONED vehicle, check the toggle, assert vehicle appears in list
  CLOSES_GAP: imp-decommissioned-filter

AC-decom-filter-4: Health summary updates with toggle
  GIVEN the vehicle list with decommissioned vehicles
  WHEN the user toggles "Show decommissioned" on
  THEN the fleet health summary total count increases to include decommissioned vehicles
  MEASUREMENT: Component test — render VehicleList with mix of statuses, toggle on, assert summary total includes decommissioned count
  CLOSES_GAP: imp-decommissioned-filter

AC-decom-filter-5: Dashboard map excludes decommissioned
  GIVEN GET /api/vehicles now returns decommissioned vehicles
  WHEN the dashboard map renders vehicle markers
  THEN decommissioned vehicles do NOT appear as markers on the map
  MEASUREMENT: Component test or code review — verify dashboard-map.tsx filters out DECOMMISSIONED status vehicles before rendering markers, or add filter if missing
  CLOSES_GAP: imp-decommissioned-filter

---

## Scope

### In Scope

- `src/app/api/vehicles/route.ts` — remove `.neq("status", "DECOMMISSIONED")` from GET handler query
- `src/app/api/vehicles/route.test.ts` — update test to verify decommissioned vehicles are returned
- Verify `src/components/dashboard-map.tsx` filters decommissioned vehicles client-side (add filter if missing)
- Verify `src/components/fleet-sidebar.tsx` or `src/lib/alerts.ts` does not show alerts for decommissioned vehicles (should already be filtered by traffic light logic)

### Out of Scope (Do Not Touch)

- `src/components/vehicle-list.tsx` — client-side filtering already works correctly, no changes needed
- `src/components/vehicle-detail.tsx` — individual vehicle detail view is not affected
- `src/app/api/vehicles/[id]/route.ts` — single vehicle GET/PUT not affected (never had the filter)
- Any UI changes to the toggle control itself

### Regression Risk

- **Dashboard map markers:** Removing the server-side filter means the dashboard will receive decommissioned vehicles. If dashboard-map.tsx does not filter them client-side, decommissioned vehicles will appear as markers on the map. This MUST be verified.
- **Fleet sidebar alerts:** If alert generation includes decommissioned vehicles, stale alerts for decommissioned vehicles could appear. Verify alerts.ts filters by active status.
- **Existing vehicle-list.test.tsx:** Tests that mock the API response may need updating if they assume no DECOMMISSIONED vehicles in the response.

---

## Root Cause Context

- **Classification:** missing_context
- **What Went Wrong:** The AC "hidden by default, visible via filter" was ambiguous about where the filtering should occur. The story builder interpreted "hidden by default" as a server-side concern and added `.neq("status", "DECOMMISSIONED")` to the API query. Meanwhile, the VehicleList component was independently built with a client-side toggle that filters decommissioned vehicles. The two filtering layers conflict: server-side removes them permanently, making the client-side toggle a no-op.
- **Why Previous Approach Failed:** First attempt — no previous approach.
- **What's Different This Time:** The cross-cycle pattern analysis explicitly identified this as a server-side/client-side filtering mismatch. The fix is clear: remove the server-side filter and let the existing client-side toggle work. The analysis recommends future ACs specify whether "hidden by default" means server-side or client-side filtering.
