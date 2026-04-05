# Change Spec: Add Vehicle Form Responsive Grid

**Change ID:** openfleet-loop-2-add-vehicle-form-responsive
**Cycle:** 2 (re-evaluation)
**Priority:** MEDIUM
**Type:** fix story

---

## Gap Evidence

### Quality Gap
- **Gap ID:** qg-fa2-9
- **Category:** design_change
- **Severity:** medium
- **Root Cause:** implementation_bug
- **Root Cause Evidence:** The vehicle-detail edit form correctly uses `sm:grid-cols-2` (line 182), but the add-vehicle form uses `grid-cols-2` without the responsive breakpoint at two locations (lines 171 and 184). This is an inconsistency within the same product — the same grid pattern was implemented correctly in one place and incorrectly in another.

### Current State (What's Wrong)
- **Description:** The add vehicle form at `/vehicles/new` uses `grid-cols-2` without a `sm:` breakpoint prefix on two grid containers (lines 171 and 184 of add-vehicle-form.tsx). This forces a 2-column layout at all viewport widths, including mobile and narrow tablet portrait. On small screens, the form fields (Make/Model, Year/Color) become too narrow to be usable. The vehicle-detail edit form correctly uses `sm:grid-cols-2`, making this an inconsistency.
- **PO Review Assessment:** "Add vehicle form uses grid-cols-2 without sm: breakpoint. On tablets in portrait, form fields are too narrow." Screen /vehicles/new scored 7.2/10, lowest of the vehicle-registry screens, partly due to this issue.
- **Heuristics Failed:** Product standard specifies "responsive desktop+tablet, mobile browser optimized for drivers."
- **Affected Screens:** /vehicles/new
- **Affected Journeys:** FA2-J1 "Add a new vehicle to the fleet" — the form submission step

### Previous Attempts (Do Not Repeat)
First attempt. No previous fix cycles targeted this gap.

---

## Target State

### From Product Standard
"Responsive desktop+tablet, mobile browser optimized for drivers." The form must stack fields vertically on narrow viewports and switch to 2-column at the `sm` breakpoint (640px), matching the pattern used by the vehicle-detail edit form.

### From Reference Products
Not applicable — standard responsive form pattern.

### Concrete Description
The two grid containers in add-vehicle-form.tsx should use `sm:grid-cols-2` instead of `grid-cols-2`:
- **Line 171:** Make/Model fields grid — fields stack vertically below 640px, side-by-side at 640px+
- **Line 184:** Year/Color fields grid — same stacking behavior

This matches the vehicle-detail edit form pattern at line 182 (`grid gap-4 sm:grid-cols-2`). On mobile (<640px), all form fields appear full-width in a single column. On tablet and desktop (≥640px), paired fields appear side-by-side.

---

## Design Requirements

- **Requires Design Mode:** false
- **Design Mode Scope:** N/A — this is a CSS class fix, not a design change. The correct pattern already exists in the codebase.
- **Design Direction:** Match the existing responsive pattern from vehicle-detail.tsx line 182.
- **Design Constraints:** No changes to field order, labels, validation, or any other aspect of the form. Only the Tailwind grid classes change.

---

## Acceptance Criteria

AC-form-responsive-1: Fields stack on mobile viewport
  GIVEN the user navigates to /vehicles/new on a viewport narrower than 640px
  WHEN the form renders
  THEN the Make and Model fields appear stacked vertically (single column), not side-by-side
  MEASUREMENT: At viewport width 375px, verify the Make and Model input containers have full width (no grid-cols-2 forcing narrow columns). DOM check: the grid container should have `sm:grid-cols-2` class, not `grid-cols-2`.
  CLOSES_GAP: qg-fa2-9

AC-form-responsive-2: Fields side-by-side on desktop
  GIVEN the user navigates to /vehicles/new on a viewport 640px or wider
  WHEN the form renders
  THEN the Make and Model fields appear side-by-side, and Year and Color fields appear side-by-side
  MEASUREMENT: At viewport width 1024px, verify the grid containers render in 2-column layout
  CLOSES_GAP: qg-fa2-9

AC-form-responsive-3: Consistent with edit form pattern
  GIVEN the add-vehicle form and the vehicle-detail edit form both exist
  WHEN comparing their grid implementations
  THEN both use the `sm:grid-cols-2` responsive pattern (not `grid-cols-2`)
  MEASUREMENT: Grep source code for `grid-cols-2` without `sm:` prefix in form components — should find zero instances in add-vehicle-form.tsx
  CLOSES_GAP: qg-fa2-9

---

## Scope

### In Scope
- `src/components/add-vehicle-form.tsx` — lines 171 and 184, change `grid-cols-2` to `sm:grid-cols-2`

### Out of Scope (Do Not Touch)
- Vehicle detail edit form (`src/components/vehicle-detail.tsx`) — already correct
- Any other form styling, labels, validation, or behavior
- Form submission logic
- Photo upload component

### Regression Risk
- Minimal — this is a CSS-only change. Verify the 2-column layout still works correctly at desktop widths after adding the `sm:` prefix.
- Existing acceptance criteria for the add-vehicle form should be re-verified (form submission, validation, photo upload warning, field markers).

---

## Root Cause Context

- **Classification:** implementation_bug
- **What Went Wrong:** The original add-vehicle story and the fix-add-vehicle-form-ux story both focused on form functionality (validation, field markers, success toast, photo upload warning) without specifying responsive layout requirements. The builder used `grid-cols-2` directly without the responsive prefix, while the vehicle-detail edit form (built in a different story) correctly used `sm:grid-cols-2`. This is an inconsistency introduced by different stories touching similar patterns at different times.
- **Why Previous Approach Failed:** N/A — first attempt.
- **What's Different This Time:** This spec explicitly identifies the two lines to change and the exact class modification needed. The acceptance criteria include a source-code consistency check to prevent future drift.
