# Change Spec: openfleet-loop-1-photo-and-list-polish

**Cycle:** 1
**Analysis Run:** 8
**Type:** deepen:vehicle-edit-and-registry-polish
**Grouped Gaps:** qg-fa2-2, qg-fa2-5, qg-fa2-6
**Requires Design Mode:** false

---

## Gap Evidence

### Quality Gap 1: Vehicle Photo Not Displayed

- **Gap ID:** qg-fa2-2
- **Category:** design_change
- **Severity:** high
- **Root Cause:** implementation_bug
- **Root Cause Evidence:** The add-vehicle form accepts photo upload and stores photoUrl in the database. The GET /api/vehicles/[id] route fetches photoUrl and maps it to camelCase. The VehicleDetail component receives the data but never renders the photo. The "Search Before Building" audit listed photo as part of vehicle-detail scope. The spec says "Vehicle photo upload supported" — upload works, but display was missed. A broken feature promise: data is collected but never shown.

### Current State (What's Wrong)

- **Description:** Vehicle photos are uploaded during add-vehicle and stored in the database (photoUrl field). The API returns photoUrl in vehicle responses. But neither the vehicle detail page nor the vehicle list renders the photo anywhere. The user uploads a photo of their van and never sees it again.
- **PO Review Assessment:** "Vehicle photo fetched but never rendered" (detail page). "Vehicle photo upload supported" journey scored 7/10 with this as a gap.
- **Heuristics Failed:** Consistency and standards (Nielsen #4) — upload implies display. Visibility of system status (Nielsen #1) — user doesn't know their photo was saved.
- **Affected Screens:** S5-vehicle-detail, S4-vehicle-list
- **Affected Journeys:** FA2-J2 (View vehicle detail)

### Previous Attempts (Do Not Repeat)

First attempt.

---

### Quality Gap 2: Traffic Light Color-Only in List

- **Gap ID:** qg-fa2-5
- **Category:** design_change
- **Severity:** medium
- **Root Cause:** design_choice
- **Root Cause Evidence:** The dashboard already has an accessible TrafficLight component (role=status, descriptive aria-labels). The "Search Before Building" audit explicitly identified "REUSE (TrafficLight component)" as available. The builder chose a minimal 8x8px dot representation for the list view instead of reusing the existing component. This breaks the accessibility contract established by the dashboard's traffic light implementation.

### Current State (What's Wrong)

- **Description:** The vehicle list shows status as an 8x8px colored dot with no text label, tooltip, or aria-label. Color-blind users cannot distinguish green from red. Screen reader users get no status information. The dashboard's TrafficLight component has full accessibility (role=status, descriptive aria-labels) but was not reused here.
- **PO Review Assessment:** "No tooltip on list dots (color-only), no fleet health summary count." Journey FA2-J3 scored 7/10.
- **Heuristics Failed:** Accessibility (WCAG 1.4.1 — Use of Color), Consistency and standards (Nielsen #4) — dashboard uses accessible TrafficLight, list uses inaccessible dot.
- **Affected Screens:** S4-vehicle-list
- **Affected Journeys:** FA2-J3 (Check vehicle health at a glance)

### Previous Attempts (Do Not Repeat)

First attempt.

---

### Quality Gap 3: No Fleet Health Summary

- **Gap ID:** qg-fa2-6
- **Category:** content_change
- **Severity:** medium
- **Root Cause:** spec_ambiguity
- **Root Cause Evidence:** The FA2 spec says "Vehicle list supports search, sort, filter" and "shows traffic light indicator per row" but has no mention of a summary bar or aggregate health view. The dashboard (FA1-J3) has a vehicle count grid (Total/OK/Attention/Overdue), but FA2 has no equivalent. The PO correctly identifies this gap: a plumber with 8 vans wants to glance at fleet health without scanning rows.

### Current State (What's Wrong)

- **Description:** The vehicle list page shows individual vehicle rows with status dots but no aggregate view. An owner with 15 vehicles must visually scan every row to understand fleet health. The dashboard has a 4-column vehicle count grid, but the vehicle list page has no equivalent summary.
- **PO Review Assessment:** "No fleet health summary count." Screen /vehicles scored 7.8/10 with density at 7.
- **Heuristics Failed:** Recognition rather than recall (Nielsen #6) — owner must mentally aggregate status by scanning rows.
- **Affected Screens:** S4-vehicle-list
- **Affected Journeys:** FA2-J3 (Check vehicle health at a glance)

### Previous Attempts (Do Not Repeat)

First attempt.

---

## Target State

### From Product Standard

- `voice_and_tone.practical`: "Every element should be useful or get out of the way" — the photo, when uploaded, must be visible. The summary bar gives instant fleet health without scanning.
- `voice_and_tone.gut_check`: "Would a plumber with 8 vans know exactly what this means?" — color-only dots fail this test for color-blind users.
- `vehicle_status.system`: "Traffic light (green/orange/red)" — the list must use the same accessible traffic light pattern as the dashboard.

### From Active Spec

FA2-J2: "Owner opens vehicle from list or map → sees tabbed view" — the detail view should show the vehicle's photo as part of the overview.
FA2-J3: "Overview tab shows traffic light indicator" — the list should show accessible traffic light indicators consistent with the detail view.
FA2 AC: "Vehicle photo upload supported" — upload without display is an incomplete feature.

### From Reference Products

The vision positions OpenFleet as "Nextcloud for fleet management." Fleet management SaaS products (Fleetio, Verizon Connect) universally show vehicle photos in both list thumbnails and detail headers. A vehicle registry without photos feels like a spreadsheet, not a fleet management tool.

### Concrete Description

After the fix:

**Vehicle Detail Photo:** The vehicle detail header shows the vehicle photo prominently. If photoUrl exists, render it as a rounded image (~120x120px or proportional) in the header area, left of the vehicle name and status. Use Next.js `<Image>` for optimization (lazy loading, responsive sizing). If photoUrl is null/empty, show a placeholder: a colored circle with the vehicle's initial letter (e.g., "F" for "Ford Transit"), using the traffic light status color as the background.

**Vehicle List Thumbnail:** Each row in the vehicle list table shows a small thumbnail (~40x40px) in the first column (before the vehicle name). If photoUrl exists, show the photo. If not, show the same initial-letter placeholder. This gives the list a visual identity beyond text rows.

**Accessible Traffic Light:** Replace the 8x8px color-only dot in the vehicle list with the existing TrafficLight component from the dashboard (or a compact variant). Requirements: (1) role="status" on the indicator, (2) aria-label with descriptive text ("All clear", "Requires attention", "Overdue"), (3) visible tooltip on hover showing the same text, (4) minimum 16x16px hit target. Color is supplemented by text, not the sole indicator.

**Fleet Health Summary Bar:** A compact summary bar appears above the vehicle table, below the page header: "8 vehicles — 5 all clear, 2 need attention, 1 overdue". Each count uses the corresponding traffic light color. The summary updates dynamically when filters change (e.g., when "Show decommissioned" is toggled, decommissioned count appears). If all vehicles are "all clear", the bar says "8 vehicles — all clear" in green.

---

## Design Requirements

- **Requires Design Mode:** false
- **Design Mode Scope:** N/A
- **Design Direction:** Photo in detail header: left-aligned, rounded corners (rounded-lg), object-cover to handle aspect ratios. Placeholder: colored circle using Tailwind bg-green-500/bg-amber-500/bg-red-500 matching traffic light, white text, font-semibold. List thumbnail: rounded-full, 40x40px, same placeholder pattern. Summary bar: horizontal flex layout, text-sm, muted text color for labels, bold colored counts. Place between the page header ("Vehicles" + "Add Vehicle" button) and the search/filter bar.
- **Design Constraints:** The vehicle list table column widths must accommodate the new thumbnail column without horizontal overflow on tablet (min-width: 768px). The summary bar must not push the table below the fold — keep it to a single line.

---

## Acceptance Criteria

### Photo Display

AC-photo-list-1: Vehicle photo displayed on detail page
  GIVEN a vehicle exists with a photoUrl stored in the database
  WHEN the user navigates to that vehicle's detail page (/vehicles/[id])
  THEN the vehicle photo is rendered in the detail header area as a visible image
  MEASUREMENT: DOM query for img element within data-testid="vehicle-detail-header" with src containing the photoUrl value
  CLOSES_GAP: qg-fa2-2

AC-photo-list-2: Photo placeholder shown when no photo exists
  GIVEN a vehicle exists with no photoUrl (null or empty)
  WHEN the user navigates to that vehicle's detail page
  THEN a placeholder element is shown (colored circle with vehicle initial letter) instead of a broken image
  MEASUREMENT: DOM query for data-testid="vehicle-photo-placeholder" within the detail header; no broken img elements (img elements without valid src or with onerror)
  CLOSES_GAP: qg-fa2-2

AC-photo-list-3: Vehicle thumbnail shown in list rows
  GIVEN vehicles exist in the database, some with photos and some without
  WHEN the vehicle list page (/vehicles) loads
  THEN each row shows a thumbnail (photo or placeholder) in the first visual column
  MEASUREMENT: DOM query for data-testid="vehicle-thumbnail" elements; count matches number of vehicle rows; each contains either an img or a placeholder element
  CLOSES_GAP: qg-fa2-2

### Accessible Traffic Light

AC-photo-list-4: Traffic light in list has text alternative
  GIVEN the vehicle list page is loaded with vehicles of different statuses
  WHEN the user inspects the status indicator for any vehicle row
  THEN the indicator has role="status" and an aria-label with descriptive text (one of: "All clear", "Requires attention", "Overdue")
  MEASUREMENT: DOM query for elements with role="status" within vehicle list rows; each has a non-empty aria-label matching one of the three expected values
  HEURISTIC: WCAG 1.4.1 — Use of Color
  CLOSES_GAP: qg-fa2-5

AC-photo-list-5: Traffic light shows tooltip on hover
  GIVEN the vehicle list page is loaded
  WHEN the user hovers over a traffic light indicator in any row
  THEN a tooltip (title attribute or visible tooltip element) appears with the status text
  MEASUREMENT: DOM query for title attribute on the status indicator element, or aria-describedby pointing to a tooltip element with matching text
  HEURISTIC: WCAG 1.4.1 — Use of Color
  CLOSES_GAP: qg-fa2-5

### Fleet Health Summary

AC-photo-list-6: Fleet health summary bar displayed above table
  GIVEN the vehicle list page loads with vehicles of mixed statuses (e.g., 5 green, 2 orange, 1 red)
  WHEN the page renders
  THEN a summary bar is visible above the vehicle table showing total count and per-status breakdown (e.g., "8 vehicles — 5 all clear, 2 need attention, 1 overdue")
  MEASUREMENT: DOM query for data-testid="fleet-health-summary" containing text with vehicle count and status breakdown; element is positioned before the table element in DOM order
  CLOSES_GAP: qg-fa2-6

AC-photo-list-7: Summary bar updates when filters change
  GIVEN the vehicle list has the "Show decommissioned" filter toggled off (default)
  WHEN the user toggles "Show decommissioned" on
  THEN the summary bar updates to include decommissioned vehicles in the total count and shows a decommissioned count
  MEASUREMENT: Text content of data-testid="fleet-health-summary" changes after toggle; total count increases to include decommissioned vehicles
  CLOSES_GAP: qg-fa2-6

---

## Scope

### In Scope

- `src/components/vehicle-detail.tsx` — Add photo display in header area, placeholder logic
- `src/components/vehicle-detail.test.tsx` — Tests for photo rendering and placeholder
- `src/components/vehicle-list.tsx` — Add thumbnail column, replace color dot with accessible TrafficLight, add fleet health summary bar
- `src/components/vehicle-list.test.tsx` — Tests for thumbnail, accessible status, summary bar
- `src/app/(admin)/vehicles/page.tsx` — May need to pass additional data to vehicle list for summary computation

### Out of Scope (Do Not Touch)

- `src/components/add-vehicle-form.tsx` — Photo upload flow is working correctly; no changes needed
- `src/app/api/uploads/route.ts` — Upload API is working; no changes needed
- `src/app/api/vehicles/route.ts` — GET endpoint already returns photoUrl; no changes needed
- `src/app/api/vehicles/[id]/route.ts` — GET already returns photoUrl; no changes needed
- `src/components/vehicle-mini-map.tsx` — Mini-map is not affected
- Dashboard traffic light component — Reuse its pattern but don't modify the original
- Photo cropping, resizing, or editing — Out of scope for this milestone

### Regression Risk

- Adding a thumbnail column to the vehicle list table may affect column widths and responsive behavior at 768px breakpoint — verify table doesn't overflow
- Replacing the 8x8px dot with a larger accessible indicator may affect row height — verify list density remains acceptable
- The fleet health summary bar must use the same filtering logic as the table (respect "Show decommissioned" toggle) to avoid count mismatches
- Existing vehicle-list tests (search, sort, filter, decommissioned toggle) must continue to pass
- Existing vehicle-detail tests (tab switching, traffic light, mini-map) must continue to pass

---

## Root Cause Context

- **Classification:** Mixed — implementation_bug (qg-fa2-2), design_choice (qg-fa2-5), spec_ambiguity (qg-fa2-6)
- **What Went Wrong:** Three distinct issues on the same screens: (1) Photo was uploaded and stored but never rendered — the VehicleDetail component receives photoUrl but has no img element for it. Classic "write without read" bug. (2) The builder chose a minimal 8x8px dot for the list view traffic light despite the "Search Before Building" audit identifying the accessible TrafficLight component as a REUSE candidate. Compact representation was prioritized over accessibility. (3) The spec defines per-row traffic lights but doesn't mention an aggregate summary view. The dashboard has a summary grid (FA1-J3) but the spec didn't carry this pattern to the vehicle list.
- **Why Previous Approach Failed:** N/A — all first attempts.
- **What's Different This Time:** This spec explicitly requires photo rendering in both detail and list views with a defined placeholder pattern. It mandates reuse of the accessible TrafficLight pattern with specific ARIA attributes. It defines the fleet health summary bar format with dynamic filter integration. Each requirement has a measurable acceptance criterion with DOM-query verification.
