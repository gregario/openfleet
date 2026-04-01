# Change Spec: openfleet-loop-1-dashboard-ux-states

**Cycle:** 1
**Type:** deepen:S3-fleet-dashboard
**Grouped Gaps:** gap-loading-skeleton, gap-error-boundary, gap-empty-state
**Requires Design Mode:** false

---

## Gap Evidence

### Quality Gap 1: Loading Skeleton

- **Gap ID:** gap-loading-skeleton
- **Category:** interaction_improvement
- **Severity:** medium
- **Root Cause:** missing_context
- **Root Cause Evidence:** Product standard requires `loading_states_handled: true`. No map-core story AC specified loading states. The builder implemented what was specified. A different builder would make the same omission.

### Current State (What's Wrong)

- **Description:** When the dashboard loads, the map container area is blank/empty while MapLibre initializes and fetches tiles. There is no visual feedback that the map is loading. The user sees a white gap where the map should be.
- **PO Review Assessment:** "Visibility of system status: No loading indicator during map tile fetch"
- **Heuristics Failed:** Visibility of system status (Nielsen #1)
- **Affected Screens:** S3-fleet-dashboard
- **Affected Journeys:** FA1-J1 (View live fleet map) — first impression on app load

### Previous Attempts (Do Not Repeat)

First attempt.

---

### Quality Gap 2: Error Boundary

- **Gap ID:** gap-error-boundary
- **Category:** interaction_improvement
- **Severity:** medium
- **Root Cause:** missing_context
- **Root Cause Evidence:** Product standard requires `error_states_handled: true`. No map-core story AC specified error boundaries. The ErrorBoundary component exists in shared UI (foundation) but was not wired into FleetMap.

### Current State (What's Wrong)

- **Description:** If FleetMap throws an error (WebGL unsupported, tile load failure, MapLibre initialization error), the entire dashboard crashes with a React white screen. There is no recovery mechanism — the user must reload the page.
- **PO Review Assessment:** "Error prevention: No error boundary for map component failures"
- **Heuristics Failed:** Error prevention (Nielsen #5), Help users recognize/recover from errors (Nielsen #9)
- **Affected Screens:** S3-fleet-dashboard
- **Affected Journeys:** FA1-J1 (View live fleet map) — complete failure on error

### Previous Attempts (Do Not Repeat)

First attempt.

---

### Quality Gap 3: Empty State

- **Gap ID:** gap-empty-state
- **Category:** content_change
- **Severity:** medium
- **Root Cause:** missing_context
- **Root Cause Evidence:** Product standard requires `empty_states_handled: true`. No map-core story AC specified empty state behavior. The EmptyState component exists in shared UI (foundation) but was not wired into the dashboard map flow.

### Current State (What's Wrong)

- **Description:** When no vehicles exist in the system (fresh install, or all decommissioned), the map renders with zero markers and no explanation. The user sees an empty map with no guidance on what to do next. This is especially bad for first-time users doing `docker compose up` before adding vehicles.
- **PO Review Assessment:** "Help and documentation: No empty state guidance for zero vehicles"
- **Heuristics Failed:** Help and documentation (Nielsen #10)
- **Affected Screens:** S3-fleet-dashboard
- **Affected Journeys:** FA1-J1 (View live fleet map) — confusing empty experience

### Previous Attempts (Do Not Repeat)

First attempt.

---

## Target State

### From Product Standard

The product standard (`quality_standards.reliability`) requires:
- `loading_states_handled: true` — Every async operation must show a loading indicator
- `error_states_handled: true` — Every component that can fail must have error recovery
- `empty_states_handled: true` — Every list/collection must handle the zero-item case

These are binary requirements: present or not present. No threshold — they either exist or they don't.

### From Reference Products

No pairwise reference comparison was run for this cycle (first cycle, baseline). The vision positions OpenFleet as "Nextcloud for fleet management" — Nextcloud handles all three states (loading spinners, error pages with retry, empty folder guidance). This is table-stakes UX.

### Concrete Description

After the fix, the S3-fleet-dashboard handles all three states:

**Loading state:** When DashboardMap mounts, before the FleetMap component and MapLibre have initialized, the user sees a loading skeleton in the map container area. The skeleton matches the map container's dimensions and uses a pulsing animation (CSS `animate-pulse` or similar) to indicate activity. The skeleton disappears when the map fires its `load` event and real content renders. The sidebar placeholder continues to show alongside the skeleton.

**Error state:** If FleetMap throws any error during initialization or runtime (WebGL not available, tile server unreachable, JavaScript error), an ErrorBoundary catches it. Instead of a white screen, the user sees a centered error message: "Unable to load map" with a brief explanation and a "Try again" button that resets the error boundary. The sidebar and page header remain functional — only the map area shows the error state.

**Empty state:** When the vehicles array is empty (no active vehicles in the database, or no vehicles with position data), instead of rendering an empty map, the dashboard shows the EmptyState component with:
- Title: "No vehicles to display"
- Description: "Add vehicles to see them on the map."
- Action: Link to the vehicles page (href: "/vehicles")

The empty state check happens in DashboardMap before passing data to FleetMap. If vehicles exist but none have positions, the map still renders (vehicles may not have reported yet) — the empty state only triggers when there are zero vehicles total.

---

## Design Requirements

- **Requires Design Mode:** false
- **Design Mode Scope:** N/A
- **Design Direction:** All three states use existing foundation components (ErrorBoundary, EmptyState) and standard Tailwind utility classes (animate-pulse for skeleton). No new visual design needed — these are functional states using established patterns.
- **Design Constraints:** The map container dimensions (70% width in the two-column layout) must not change. The sidebar layout must not be affected. The loading skeleton must occupy the same space as the map to prevent layout shift.

---

## Acceptance Criteria

### Loading Skeleton

AC-dash-ux-1: Map loading skeleton visible during initialization
  GIVEN the dashboard page is loading
  WHEN DashboardMap mounts but FleetMap has not yet fired the MapLibre 'load' event
  THEN a pulsing skeleton placeholder is visible in the map container area
  MEASUREMENT: DOM query for element with data-testid="map-loading-skeleton" and CSS class containing "animate-pulse"
  HEURISTIC: Visibility of system status (Nielsen #1)
  CLOSES_GAP: gap-loading-skeleton

AC-dash-ux-2: Loading skeleton disappears when map loads
  GIVEN the map loading skeleton is visible
  WHEN MapLibre fires its 'load' event (tiles fetched, map rendered)
  THEN the skeleton is removed and the live map is visible
  MEASUREMENT: DOM query confirms data-testid="map-loading-skeleton" is absent and data-testid="fleet-map" is present
  HEURISTIC: Visibility of system status (Nielsen #1)
  CLOSES_GAP: gap-loading-skeleton

### Error Boundary

AC-dash-ux-3: Error boundary catches FleetMap failures
  GIVEN FleetMap throws an error during initialization or runtime
  WHEN the error propagates to the ErrorBoundary wrapper
  THEN the map area shows an error message with text "Unable to load map" and a "Try again" button
  MEASUREMENT: DOM query for data-testid="map-error-state" containing expected text and a button element
  HEURISTIC: Help users recognize/recover from errors (Nielsen #9)
  CLOSES_GAP: gap-error-boundary

AC-dash-ux-4: Error boundary retry resets the map
  GIVEN the map error state is displayed
  WHEN the user clicks the "Try again" button
  THEN the ErrorBoundary resets and FleetMap attempts to re-initialize
  MEASUREMENT: After click, data-testid="map-error-state" is absent; either map-loading-skeleton or fleet-map is present
  HEURISTIC: Error prevention (Nielsen #5)
  CLOSES_GAP: gap-error-boundary

AC-dash-ux-5: Sidebar remains functional during map error
  GIVEN FleetMap has thrown an error
  WHEN the error boundary displays the error state
  THEN the sidebar and page header remain visible and functional (not replaced by error UI)
  MEASUREMENT: DOM query confirms sidebar element (data-testid="fleet-sidebar" or equivalent) is present alongside the error state
  HEURISTIC: Error prevention (Nielsen #5)
  CLOSES_GAP: gap-error-boundary

### Empty State

AC-dash-ux-6: Empty state shown when no vehicles exist
  GIVEN zero active vehicles exist in the database
  WHEN the dashboard page loads
  THEN the map area shows the EmptyState component with title "No vehicles to display", description text, and a link to /vehicles
  MEASUREMENT: DOM query for data-testid="map-empty-state" with expected title text and an anchor with href="/vehicles"
  HEURISTIC: Help and documentation (Nielsen #10)
  CLOSES_GAP: gap-empty-state

AC-dash-ux-7: Map renders normally when vehicles exist but have no positions
  GIVEN vehicles exist in the database but none have position data yet
  WHEN the dashboard page loads
  THEN the map renders normally (FleetMap with zero markers) — the empty state is NOT shown
  MEASUREMENT: DOM query confirms data-testid="fleet-map" is present and data-testid="map-empty-state" is absent
  HEURISTIC: N/A (regression guard)
  CLOSES_GAP: gap-empty-state

---

## Scope

### In Scope

- `src/components/dashboard-map.tsx` — Add loading state management, empty state check, wrap FleetMap in ErrorBoundary
- `src/components/dashboard-map.test.tsx` — Tests for loading, error, and empty states
- `src/app/(admin)/dashboard/page.tsx` — Pass vehicle count or empty flag to DashboardMap if needed for empty state detection

### Out of Scope (Do Not Touch)

- `src/components/fleet-map.tsx` — The map component itself does not change; states are handled by its parent DashboardMap
- `src/components/error-boundary.tsx` — The existing ErrorBoundary component is used as-is
- `src/components/empty-state.tsx` — The existing EmptyState component is used as-is
- Sidebar content (placeholder) — Not part of this change
- Map clustering, popup, persistence, or real-time update logic — No changes

### Regression Risk

- Adding a loading skeleton wrapper must not prevent FleetMap from receiving its props or initializing MapLibre correctly
- The ErrorBoundary must not swallow errors that should propagate (e.g., data fetch errors in the server component)
- The empty state check (vehicles.length === 0) must use the correct array — the initialVehicles prop, not the real-time merged array — to avoid flash of empty state before SSE delivers updates
- Existing test suites for fleet-map.test.tsx, dashboard-map.test.tsx must continue to pass

---

## Root Cause Context

- **Classification:** missing_context
- **What Went Wrong:** The product standard defines reliability requirements (loading, error, empty states handled) as cross-cutting concerns. However, the story decomposition phase generated acceptance criteria only for functional features (map rendering, real-time updates, popups, persistence). No story AC referenced the product standard's reliability requirements. The builder implemented exactly what was specified — the gap is in specification, not implementation.
- **Why Previous Approach Failed:** N/A — first attempt for all 3 gaps.
- **What's Different This Time:** This change spec explicitly references each product standard requirement, provides concrete acceptance criteria with measurement methods, specifies which existing foundation components to use (ErrorBoundary, EmptyState), and defines the exact data-testid attributes for automated verification. The builder has no ambiguity about what to build. Additionally, the cross-cycle pattern has been logged: future story decomposition should cross-reference product_standard.quality_standards.reliability against affected screens.
