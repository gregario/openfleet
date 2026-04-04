# Change Spec: Vehicle Edit Save Error Feedback

**Change ID:** openfleet-loop-2-vehicle-edit-error-feedback
**Cycle:** 2 (re-evaluation)
**Priority:** HIGH
**Type:** fix story

---

## Gap Evidence

### Quality Gap
- **Gap ID:** qg-fa2-8
- **Category:** interaction_improvement
- **Severity:** high
- **Root Cause:** implementation_bug
- **Root Cause Evidence:** handleSave in vehicle-detail.tsx (line 95-125) has a success path (`if (res.ok)`) with toast and state update, but no else clause and no catch handler for network errors. The `finally` block clears saving state without user feedback when the request fails. The analyzing phase confirmed this follows the cross-cycle pattern "Interaction feedback gaps recurring — error paths missed when success paths implemented" (frequency 3).

### Current State (What's Wrong)
- **Description:** When a user edits a vehicle and the PUT /api/vehicles/[id] request fails (server error, network error, validation error), the form silently clears its saving state. The user sees the spinner stop but receives no indication that their changes were not saved. The form exits edit mode (or stays in an ambiguous state), potentially leading the user to believe the save succeeded. This violates the product standard's "error/empty/loading states all handled" requirement.
- **PO Review Assessment:** "Vehicle edit save failure is completely silent. When PUT /api/vehicles/[id] fails, the form clears saving state with no error message." Journey FA2-J4 scored 7.5/10 ("functional") primarily due to this gap and missing decommission confirmation.
- **Heuristics Failed:** None loaded (library_heuristics empty). Product standard requires: "Zero console errors, error/empty/loading states all handled."
- **Affected Screens:** /vehicles/[id] (S5-vehicle-detail)
- **Affected Journeys:** FA2-J4 "Change vehicle status" — step where user saves edited vehicle data

### Previous Attempts (Do Not Repeat)
First attempt. No previous fix cycles targeted this gap.

---

## Target State

### From Product Standard
The product standard specifies: "error/empty/loading states all handled" and "Zero console errors." The edit save flow must handle all three states (loading = saving spinner, success = toast + exit edit mode, error = error toast + remain in edit mode).

### From Reference Products
Not applicable — no pairwise comparison flagged for this specific interaction. General fleet management reference: any edit-save flow should provide immediate, visible feedback on failure.

### Concrete Description
When the user clicks "Save" and the PUT request fails for any reason (HTTP 4xx, 5xx, or network error):

1. **Error toast appears** with text "Could not save changes. Please try again." in a red/destructive color scheme (red-50 background, red-700 text, matching the existing amber warning pattern but in red).
2. **Toast has `role="alert"`** for screen reader announcement.
3. **Toast auto-dismisses after 5 seconds** (matching the existing success toast timing).
4. **Form remains in edit mode** — the user's unsaved changes are preserved in the form fields so they can retry without re-entering data.
5. **Save button re-enables** (saving state clears) so the user can retry.
6. The existing success path remains unchanged: on success, toast "Vehicle Name saved", exit edit mode, update vehicle state.

---

## Design Requirements

- **Requires Design Mode:** false
- **Design Mode Scope:** N/A — the change reuses the existing inline toast pattern with a color variation (red instead of green). No new components or layout changes needed.
- **Design Direction:** Reuse the existing toast pattern in vehicle-detail.tsx. The success toast uses the inline `toast` state variable displayed below the header. The error toast should use the same mechanism with `role="alert"` and red/destructive styling (`border-red-200 bg-red-50 text-red-700`). This is a one-line-of-rendering addition.
- **Design Constraints:** The save success toast pattern must remain unchanged. No modifications to the edit form layout or the header bar.

---

## Acceptance Criteria

AC-edit-error-1: Error toast on save failure
  GIVEN the user is in edit mode on the vehicle detail page
  WHEN the user clicks Save and the PUT /api/vehicles/[id] request returns a non-2xx status code
  THEN a toast with text "Could not save changes. Please try again." appears with red/destructive styling
  MEASUREMENT: DOM query for element with role="alert" containing the error text after a failed PUT request
  CLOSES_GAP: qg-fa2-8

AC-edit-error-2: Form remains in edit mode on failure
  GIVEN the user is in edit mode with modified field values
  WHEN the PUT request fails
  THEN the form remains in edit mode with the user's entered values preserved
  MEASUREMENT: After failed save, verify editing state is true and form fields retain the values the user entered (not reset to original vehicle data)
  CLOSES_GAP: qg-fa2-8

AC-edit-error-3: Save button re-enables after failure
  GIVEN the user clicked Save and the request is in-flight (button disabled, spinner showing)
  WHEN the PUT request fails
  THEN the Save button becomes enabled again (saving state is false)
  MEASUREMENT: DOM query for the Save button's disabled attribute — should be false after error
  CLOSES_GAP: qg-fa2-8

AC-edit-error-4: Error toast auto-dismisses
  GIVEN an error toast is visible
  WHEN 5 seconds have elapsed
  THEN the toast disappears
  MEASUREMENT: After triggering error toast, wait 5s and verify the role="alert" element is removed from DOM
  CLOSES_GAP: qg-fa2-8

AC-edit-error-5: Network error handled
  GIVEN the user is in edit mode
  WHEN the user clicks Save and the fetch request throws a network error (e.g., offline)
  THEN the same error toast appears and the form remains in edit mode
  MEASUREMENT: Mock fetch to throw TypeError, verify role="alert" element appears with error text
  CLOSES_GAP: qg-fa2-8

---

## Scope

### In Scope
- `src/components/vehicle-detail.tsx` — handleSave function error handling, error toast rendering
- `src/components/vehicle-detail.test.tsx` — test cases for save failure scenarios

### Out of Scope (Do Not Touch)
- Add vehicle form (`src/components/add-vehicle-form.tsx`) — separate change spec
- Vehicle list page — not affected
- Success toast behavior — must remain unchanged
- PUT API route implementation — the server endpoint is not the issue; the client-side error handling is
- Any other tabs or components within vehicle-detail

### Regression Risk
- Ensure the success path still works after adding the error path (success toast, exit edit mode, vehicle state update)
- The `finally` block currently handles `setSaving(false)` — if restructured to try/catch/finally, verify saving state is still cleared in all paths

---

## Root Cause Context

- **Classification:** implementation_bug
- **What Went Wrong:** The original fix-vehicle-edit story specified "success toast" but did not specify error handling. The builder implemented the success path faithfully (factory decision: "Inline toast in vehicle-detail.tsx" describes success toast, no mention of error handling). The `handleSave` function uses a `try { if (res.ok) { ... } } finally { setSaving(false) }` pattern that handles the happy path and clears loading state, but the non-ok response and the catch path have no user-facing feedback. This follows the cross-cycle pattern "Interaction feedback gaps recurring — error paths missed when success paths implemented."
- **Why Previous Approach Failed:** N/A — first attempt at fixing this specific gap.
- **What's Different This Time:** This spec explicitly specifies the error path behavior, the exact toast text, styling approach, and form state preservation. The acceptance criteria include both HTTP error and network error scenarios. The builder cannot miss the error path because it is the primary focus of this spec.
