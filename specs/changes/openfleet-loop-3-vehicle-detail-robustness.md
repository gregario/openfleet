# Change Spec: openfleet-loop-3-vehicle-detail-robustness

**Cycle:** 1
**Analysis Run:** 10
**Type:** deepen:improvements
**Grouped Gaps:** imp-put-json-trycatch, imp-detail-toast-close, imp-edit-client-validation
**Requires Design Mode:** false

---

## Gap Evidence

### Quality Gap 1: PUT Handler Crashes on Malformed JSON

- **Gap ID:** imp-put-json-trycatch
- **Category:** performance_improvement
- **Severity:** high
- **Root Cause:** implementation_bug
- **Root Cause Evidence:** QA AI code audit found that PUT /api/vehicles/[id] calls `request.json()` at line 82 without try/catch. If the request body is not valid JSON, this throws a SyntaxError and the handler returns an unhandled 500 instead of a structured 400. The POST handler in the same codebase already handles this correctly with try/catch, confirming the pattern was known but missed in the PUT handler.

### Current State (What's Wrong)

- **Description:** Sending a malformed JSON body to PUT /api/vehicles/[id] causes the handler to crash with an unhandled SyntaxError, returning a generic 500 Internal Server Error. This gives no actionable feedback to clients and pollutes server logs with unhandled exceptions. The POST /api/vehicles handler already wraps request.json() in try/catch and returns 400, making this an inconsistency.
- **QA Assessment:** "PUT /api/vehicles/[id] request.json() not in try/catch (unlike POST). Malformed JSON returns 500 instead of 400." (ai_code_audit, severity: high)
- **Heuristics Failed:** Error prevention (Nielsen #5), Consistency and standards (Nielsen #4)
- **Affected Screens:** S5-vehicle-detail
- **Affected Journeys:** FA2-J4 (Change vehicle status — edit save path)

### Quality Gap 2: Vehicle Detail Toasts Lack Close Button

- **Gap ID:** imp-detail-toast-close
- **Category:** interaction_improvement
- **Severity:** low
- **Root Cause:** missing_context
- **Root Cause Evidence:** vehicle-detail.tsx has inline success and error toasts that auto-dismiss after 5 seconds with no close button. The vehicle-created-toast.tsx component (from fix-add-vehicle-form-ux story) already implements a close button with × character and aria-label='Dismiss notification'. The pattern exists but was not applied to the vehicle-detail toasts because they were built earlier (fix-vehicle-edit story) before the close button pattern was established.

### Current State (What's Wrong)

- **Description:** The success and error toast notifications in vehicle-detail.tsx (lines 145-162) auto-dismiss after 5 seconds but provide no manual dismiss control. Users who want to dismiss immediately must wait. Users who need more time to read the error message cannot prevent auto-dismiss. This violates WCAG 2.2.1 (Timing Adjustable) and is inconsistent with the vehicle-created-toast which has a close button.
- **QA Assessment:** "vehicle-detail inline success/error toasts auto-dismiss at 5s with no close button" (a11y_review, severity: medium)
- **Heuristics Failed:** User control and freedom (Nielsen #3), Consistency and standards (Nielsen #4)
- **Affected Screens:** S5-vehicle-detail
- **Affected Journeys:** FA2-J4 (Change vehicle status — save feedback)

### Quality Gap 3: Edit Form Skips Client-Side Validation

- **Gap ID:** imp-edit-client-validation
- **Category:** interaction_improvement
- **Severity:** low
- **Root Cause:** missing_context
- **Root Cause Evidence:** The edit form in vehicle-detail.tsx sends data directly to the API via fetch without client-side validation. The add-vehicle-form.tsx already validates via Zod (createVehicleSchema.safeParse) before submission, showing field-level inline errors. The updateVehicleSchema already exists in src/lib/validators.ts (created during fix-vehicle-edit story) but is only used server-side in the PUT handler. The pattern for client-side pre-validation was established in the add form but not replicated in the edit form.

### Current State (What's Wrong)

- **Description:** When a user edits a vehicle and submits invalid data, the form sends the request to the server, which validates via Zod and returns a 400. The error appears as a generic error toast. By contrast, the add-vehicle-form validates client-side first and shows field-level inline errors below each invalid field. This inconsistency means edit form users get worse error feedback than add form users for the same types of validation failures.
- **PO Assessment:** "Edit form sends directly to API without client-side Zod pre-validation (unlike add form)" (po_vehicle_registry improvement item, severity: low)
- **Heuristics Failed:** Consistency and standards (Nielsen #4), Error prevention (Nielsen #5)
- **Affected Screens:** S5-vehicle-detail
- **Affected Journeys:** FA2-J4 (Change vehicle status — edit validation)

### Previous Attempts (Do Not Repeat)

First attempt for all three gaps.

---

## Target State

### From Product Standard

- `quality_standards.reliability.error_states_handled: true` — all error paths must return structured, actionable responses
- `quality_standards.accessibility.lighthouse_score: 90+` — WCAG 2.2.1 compliance for timed content
- `design_standards.voice_and_tone.practical` — "Every element should be useful or get out of the way" — toasts should be dismissible, validation should be immediate

### From Reference Products

No reference product comparison needed — these are consistency fixes aligning vehicle-detail with patterns already established elsewhere in the codebase (POST handler, vehicle-created-toast, add-vehicle-form).

### Concrete Description

After these fixes:

1. **PUT handler robustness:** Sending malformed JSON (not valid JSON syntax) to PUT /api/vehicles/[id] returns `{ "error": "Invalid JSON" }` with status 400. The handler never crashes with an unhandled SyntaxError. The pattern matches the POST handler exactly.

2. **Toast close buttons:** Both the success toast (green, role=status) and error toast (red, role=alert) in vehicle-detail.tsx include a close button (× character) on the right side. Clicking the button immediately dismisses the toast. The button has `aria-label="Dismiss notification"`. The 5-second auto-dismiss timer continues to work alongside the manual dismiss. The visual pattern matches vehicle-created-toast.tsx exactly.

3. **Client-side validation:** When the user clicks Save in edit mode, the form calls `updateVehicleSchema.safeParse(formData)` before sending the fetch request. If validation fails, field-level error messages appear below each invalid field (red text, same styling as add-vehicle-form). The fetch request is NOT sent. If validation passes, the form proceeds with the API call as before. The validation UX matches add-vehicle-form.tsx.

---

## Design Requirements

- **Requires Design Mode:** false
- **Design Mode Scope:** N/A — all three fixes follow existing patterns in the codebase. No new visual design needed.
- **Design Direction:** Match existing patterns: POST handler try/catch for gap 1, vehicle-created-toast close button for gap 2, add-vehicle-form validation display for gap 3.
- **Design Constraints:** Toast position (fixed right-4 top-4), toast colors (green-600 for success, red-50/red-700 for error), and auto-dismiss timing (5s) must remain unchanged. Only add the close button alongside existing behavior.

---

## Acceptance Criteria

AC-vd-robustness-1: PUT handler returns 400 for malformed JSON
  GIVEN an authenticated ADMIN user
  WHEN a PUT request is sent to /api/vehicles/[id] with a body that is not valid JSON (e.g., `{invalid`)
  THEN the response status is 400 and the body contains `{ "error": "Invalid JSON" }`
  MEASUREMENT: API test — send malformed body string, assert response.status === 400 and response body matches expected error shape
  CLOSES_GAP: imp-put-json-trycatch

AC-vd-robustness-2: PUT handler does not return 500 for malformed input
  GIVEN an authenticated ADMIN user
  WHEN a PUT request is sent to /api/vehicles/[id] with a body that is not valid JSON
  THEN the response status is NOT 500
  MEASUREMENT: API test — send malformed body, assert response.status !== 500
  CLOSES_GAP: imp-put-json-trycatch

AC-vd-robustness-3: Success toast has close button
  GIVEN the vehicle detail page is showing a success toast (after a successful save)
  WHEN the user clicks the close button (×) on the success toast
  THEN the toast is immediately dismissed
  MEASUREMENT: Component test — render vehicle-detail with toast state set, find button with aria-label="Dismiss notification" inside role=status element, click it, assert toast is no longer in the DOM
  CLOSES_GAP: imp-detail-toast-close

AC-vd-robustness-4: Error toast has close button
  GIVEN the vehicle detail page is showing an error toast (after a failed save)
  WHEN the user clicks the close button (×) on the error toast
  THEN the toast is immediately dismissed
  MEASUREMENT: Component test — render vehicle-detail with errorToast state set, find button with aria-label="Dismiss notification" inside role=alert element, click it, assert error toast is no longer in the DOM
  CLOSES_GAP: imp-detail-toast-close

AC-vd-robustness-5: Toast close button has correct aria-label
  GIVEN the vehicle detail page is showing any toast
  WHEN the toast renders
  THEN the close button has aria-label="Dismiss notification"
  MEASUREMENT: Component test — query button by aria-label within toast container, assert it exists
  CLOSES_GAP: imp-detail-toast-close

AC-vd-robustness-6: Edit form validates before API call
  GIVEN the user is in edit mode on vehicle detail
  WHEN the user clears the vehicle name field (required) and clicks Save
  THEN field-level error text appears below the name field and no API request is made
  MEASUREMENT: Component test — render edit mode, clear name input, click Save, assert error message visible below field, assert fetch was NOT called
  CLOSES_GAP: imp-edit-client-validation

AC-vd-robustness-7: Edit form shows field-level errors from Zod
  GIVEN the user is in edit mode on vehicle detail
  WHEN the user enters invalid data (e.g., year = "abc") and clicks Save
  THEN the Zod validation error for that field appears as red text below the input
  MEASUREMENT: Component test — render edit mode, set invalid value, click Save, assert error message text matches Zod error, assert text has red styling (text-red-*)
  CLOSES_GAP: imp-edit-client-validation

AC-vd-robustness-8: Valid edit form still submits to API
  GIVEN the user is in edit mode with all fields valid
  WHEN the user clicks Save
  THEN the form sends a PUT request to the API (client validation passes silently)
  MEASUREMENT: Component test — render edit mode with valid data, click Save, assert fetch was called with PUT method
  CLOSES_GAP: imp-edit-client-validation

---

## Scope

### In Scope

- `src/app/api/vehicles/[id]/route.ts` — wrap `request.json()` in try/catch in PUT handler
- `src/components/vehicle-detail.tsx` — add close buttons to both toast divs, add client-side Zod validation in handleSave
- `src/app/api/vehicles/[id]/route.test.ts` — add test for malformed JSON body
- `src/components/vehicle-detail.test.tsx` — add tests for toast close buttons and client-side validation

### Out of Scope (Do Not Touch)

- `src/components/add-vehicle-form.tsx` — already has correct patterns, no changes needed
- `src/components/vehicle-created-toast.tsx` — reference only, do not modify
- `src/app/api/vehicles/route.ts` — POST handler already correct, no changes needed
- `src/lib/validators.ts` — updateVehicleSchema already exists, no schema changes needed
- Any other API routes or components

### Regression Risk

- Changing handleSave to add validation before fetch could affect the success path — ensure valid submissions still work (AC-vd-robustness-8 covers this)
- Adding close buttons to toasts could affect layout if positioned incorrectly — keep within existing toast div, use flex layout
- Existing vehicle-detail.test.tsx tests for save success and error toasts must continue to pass

---

## Root Cause Context

- **Classification:** implementation_bug (gap 1), missing_context (gaps 2 and 3)
- **What Went Wrong:** The PUT handler was implemented in the fix-vehicle-edit story which focused on the edit form UI and Zod server-side validation. The try/catch for request.json() was missed because the POST handler pattern wasn't cross-referenced. Toast close buttons weren't added because vehicle-detail toasts were built before the vehicle-created-toast established the close button pattern. Client-side validation wasn't added because the edit form was built as a quick inline mode, while the add form had a dedicated form component with full validation UX.
- **Why Previous Approach Failed:** First attempt — no previous approach.
- **What's Different This Time:** All three fixes have clear existing patterns to follow in the same codebase. The PUT try/catch matches the POST handler. The toast close button matches vehicle-created-toast. The client validation matches add-vehicle-form. These are consistency fixes, not novel implementations.
