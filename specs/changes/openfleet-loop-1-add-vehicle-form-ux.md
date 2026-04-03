# Change Spec: openfleet-loop-1-add-vehicle-form-ux

**Cycle:** 1
**Analysis Run:** 8
**Type:** deepen:vehicle-edit-and-registry-polish
**Grouped Gaps:** qg-fa2-3, qg-fa2-4, qg-fa2-7
**Requires Design Mode:** false

---

## Gap Evidence

### Quality Gap 1: No Success Feedback After Adding Vehicle

- **Gap ID:** qg-fa2-3
- **Category:** interaction_improvement
- **Severity:** medium
- **Root Cause:** spec_ambiguity
- **Root Cause Evidence:** The FA2-J1 journey says "enters make, model, year... → saves." The word "saves" implies persistence but doesn't specify user feedback on success. The builder implemented router.push('/vehicles') after successful POST, which is correct behavior but lacks user confirmation. This matches the cross-cycle pattern from dashboard-features: specs describe actions but not feedback patterns.

### Current State (What's Wrong)

- **Description:** After successfully adding a vehicle, the user is silently redirected to the vehicle list. There is no toast, banner, or any visual confirmation that the vehicle was created. The user must scan the list to find the new entry and confirm it exists. For an owner-operator who just typed in a VIN and license plate, the lack of feedback creates uncertainty.
- **PO Review Assessment:** "No success toast after creation (silent redirect)." FA2-J1 scored 7/10.
- **Heuristics Failed:** Visibility of system status (Nielsen #1) — user doesn't know the save succeeded.
- **Affected Screens:** /vehicles/new (action), S4-vehicle-list (redirect target)
- **Affected Journeys:** FA2-J1 (Add a vehicle)

### Previous Attempts (Do Not Repeat)

First attempt.

---

### Quality Gap 2: Photo Upload Failure Silently Swallowed

- **Gap ID:** qg-fa2-4
- **Category:** interaction_improvement
- **Severity:** medium
- **Root Cause:** implementation_bug
- **Root Cause Evidence:** The add-vehicle form catches upload errors but doesn't surface them to the user. The vehicle is saved without a photo and the user is redirected to the list with no indication the upload failed. Error handling for partial failures is a basic engineering practice that doesn't need spec-level instructions.

### Current State (What's Wrong)

- **Description:** If the photo upload fails (network error, file too large, server error) but the vehicle creation succeeds, the vehicle is saved without a photo and the user is redirected to the vehicle list. No warning, no error message, no indication that the photo wasn't saved. The user believes their photo was attached when it wasn't.
- **PO Review Assessment:** "Photo upload failure silently swallowed. Vehicle created without photo, no warning."
- **Heuristics Failed:** Help users recognize, diagnose, and recover from errors (Nielsen #9), Visibility of system status (Nielsen #1)
- **Affected Screens:** /vehicles/new
- **Affected Journeys:** FA2-J1 (Add a vehicle)

### Previous Attempts (Do Not Repeat)

First attempt.

---

### Quality Gap 3: Required Fields Not Visually Distinguished

- **Gap ID:** qg-fa2-7
- **Category:** interaction_improvement
- **Severity:** low
- **Root Cause:** implementation_bug
- **Root Cause Evidence:** Distinguishing required from optional form fields is a standard UX pattern (WAI-ARIA form guidance recommends asterisk or "(optional)" suffix). The Zod validation schema defines which fields are required. The builder simply didn't add visual indicators — a basic form design pattern that doesn't need spec-level instructions.

### Current State (What's Wrong)

- **Description:** The add-vehicle form has required fields (make, model, year, VIN, license plate, odometer) and optional fields (photo, color, notes) but all look identical. The user can't tell which fields they must fill out until they submit and get a validation error. Especially frustrating for fields like VIN which an owner might skip if they think it's optional.
- **PO Review Assessment:** "Required vs optional fields not visually distinguished." Screen /vehicles/new scored 7.4/10.
- **Heuristics Failed:** Error prevention (Nielsen #5) — user can't tell what's required before submitting. Help and documentation (Nielsen #10) — no visual guide.
- **Affected Screens:** /vehicles/new
- **Affected Journeys:** FA2-J1 (Add a vehicle)

### Previous Attempts (Do Not Repeat)

First attempt.

---

## Target State

### From Product Standard

- `voice_and_tone.practical`: "Every element should be useful or get out of the way" — success feedback confirms the action was useful. Upload error warnings prevent silent data loss. Required field markers prevent form submission errors.
- `voice_and_tone.gut_check`: "Would a plumber with 8 vans know exactly what this means?" — a plumber filling out a form needs to know which fields are mandatory before they start typing.
- `quality_standards.reliability.error_states_handled: true` — upload failures must be surfaced, not swallowed.

### From Active Spec

FA2-J1: "Owner clicks Add Vehicle → enters make, model, year, VIN, license plate, color, current odometer, photo → saves"

The journey ends with "saves" — the success toast completes the feedback loop. The photo is listed as a field — upload failure should be communicated.

### Concrete Description

After the fix, the add-vehicle flow has complete feedback:

**Success Toast:** After successful vehicle creation, when the user is redirected to the vehicle list page, a transient success toast appears at the top of the page: "[Vehicle Name] added to your fleet" (e.g., "Ford Transit added to your fleet"). The toast auto-dismisses after 5 seconds. It uses a green/success color scheme. Implementation: pass a URL search parameter (e.g., `?created=Ford+Transit`) that the vehicle list page reads, displays as a toast, and clears from the URL.

**Photo Upload Warning:** If photo upload fails but vehicle creation succeeds, the form shows an inline warning before redirect: "Vehicle saved, but the photo could not be uploaded. You can add a photo later from the vehicle detail page." The warning is displayed as a yellow/amber alert banner within the form area. The user can click "Go to vehicle list" to proceed. The vehicle is saved — the warning is non-blocking informational feedback about the partial failure.

**Required Field Markers:** Required fields (make, model, year, VIN, license plate, odometer) show a red asterisk (*) after their label text. A legend at the top of the form reads "* Required". Optional fields (photo, color, notes) show "(optional)" in muted text after their label. This dual marking system ensures maximum clarity per WAI-ARIA best practices.

---

## Design Requirements

- **Requires Design Mode:** false
- **Design Mode Scope:** N/A
- **Design Direction:** Toast: fixed-position at top-right or top-center, green bg (bg-green-50 border-green-200 text-green-800), icon + text, fade-out animation. Upload warning: inline within the form area (not a toast), amber bg (bg-amber-50 border-amber-200 text-amber-800), warning icon, descriptive text, dismiss button. Required markers: red asterisk (text-red-500) immediately after label text, "(optional)" in text-gray-400 after label text. Legend "* Required" at form top in text-sm text-gray-500.
- **Design Constraints:** The toast must not overlap the admin sidebar navigation. The upload warning must not shift the form layout — it should appear below the photo upload field area. Required markers must not change field width or form layout.

---

## Acceptance Criteria

### Success Toast

AC-form-ux-1: Success toast shown after vehicle creation
  GIVEN the user has filled out the add-vehicle form with valid data
  WHEN the form is submitted and the vehicle is created successfully
  THEN after redirect to the vehicle list, a success toast is visible containing the vehicle's name and the word "added" (e.g., "Ford Transit added to your fleet")
  MEASUREMENT: DOM query on /vehicles page for element with role="status" or data-testid="success-toast" containing expected text; URL contains a created parameter or equivalent state
  HEURISTIC: Visibility of system status (Nielsen #1)
  CLOSES_GAP: qg-fa2-3

AC-form-ux-2: Success toast auto-dismisses
  GIVEN a success toast is visible on the vehicle list page
  WHEN 5 seconds have elapsed
  THEN the toast is no longer visible (removed from DOM or hidden)
  MEASUREMENT: After 5000ms timeout, DOM query for data-testid="success-toast" returns null or element has display:none/opacity:0
  HEURISTIC: Aesthetic and minimalist design (Nielsen #8)
  CLOSES_GAP: qg-fa2-3

### Photo Upload Warning

AC-form-ux-3: Warning shown when photo upload fails
  GIVEN the user submits the add-vehicle form with a photo attached
  WHEN the vehicle creation succeeds but the photo upload fails (network error, server error)
  THEN an inline warning is displayed within the form area stating that the vehicle was saved but the photo could not be uploaded
  MEASUREMENT: DOM query for element with role="alert" or data-testid="upload-warning" containing text about photo upload failure and vehicle being saved
  HEURISTIC: Help users recognize, diagnose, and recover from errors (Nielsen #9)
  CLOSES_GAP: qg-fa2-4

AC-form-ux-4: Vehicle saved despite photo upload failure
  GIVEN photo upload fails during vehicle creation
  WHEN the warning is displayed
  THEN the vehicle exists in the database (verifiable via API) with photoUrl as null
  MEASUREMENT: GET /api/vehicles returns the newly created vehicle with all fields saved correctly except photoUrl which is null
  CLOSES_GAP: qg-fa2-4

### Required Field Markers

AC-form-ux-5: Required fields marked with asterisk
  GIVEN the add-vehicle form page (/vehicles/new) loads
  WHEN the user views the form
  THEN all required fields (make, model, year, VIN, license plate, odometer) have a visible asterisk (*) indicator adjacent to their label
  MEASUREMENT: DOM query for label elements associated with required inputs; each label contains an element with text content "*" or aria-hidden="true" asterisk; minimum 6 required fields marked
  HEURISTIC: Error prevention (Nielsen #5)
  CLOSES_GAP: qg-fa2-7

AC-form-ux-6: Optional fields marked with "(optional)"
  GIVEN the add-vehicle form page loads
  WHEN the user views the form
  THEN optional fields (photo, color) have "(optional)" text displayed near their label
  MEASUREMENT: DOM query for label elements associated with optional inputs; each contains text "(optional)" in a muted/lighter style (text-gray-400 or similar)
  CLOSES_GAP: qg-fa2-7

AC-form-ux-7: Required legend shown at form top
  GIVEN the add-vehicle form page loads
  WHEN the user views the form
  THEN a legend "* Required" (or equivalent) is visible near the top of the form, before the first field
  MEASUREMENT: DOM query for element containing "Required" text that appears before the first form field in DOM order
  CLOSES_GAP: qg-fa2-7

---

## Scope

### In Scope

- `src/components/add-vehicle-form.tsx` — Add required/optional markers to field labels, add photo upload error handling with inline warning
- `src/components/add-vehicle-form.test.tsx` — Tests for required markers, optional labels, upload error warning
- `src/app/(admin)/vehicles/page.tsx` — Read URL search param for success toast, render toast component
- `src/app/(admin)/vehicles/new/page.tsx` — May need to pass created vehicle name in redirect URL
- `src/components/vehicle-list.tsx` — Render success toast based on search params (if toast is list-level)

### Out of Scope (Do Not Touch)

- `src/app/api/vehicles/route.ts` — POST endpoint behavior is correct; no changes needed
- `src/app/api/uploads/route.ts` — Upload endpoint is correct; the issue is client-side error surfacing
- `src/lib/validators.ts` — Zod schema already defines required/optional correctly
- Vehicle edit form (from Spec 1) — That spec handles its own success feedback
- Form validation error messages — Existing Zod-driven validation errors are working correctly
- Toast library selection — Keep it lightweight; no external toast library needed for these use cases

### Regression Risk

- Adding required markers must not break existing form validation flow (Zod errors should still display inline)
- The URL search param for success toast must be cleaned from the URL after display to prevent stale toasts on page refresh
- The photo upload warning must not prevent the user from navigating away — it's informational, not blocking
- All existing add-vehicle-form tests must continue to pass
- Redirect behavior (router.push to /vehicles) must still work with the added search param

---

## Root Cause Context

- **Classification:** Mixed — spec_ambiguity (qg-fa2-3), implementation_bug (qg-fa2-4), implementation_bug (qg-fa2-7)
- **What Went Wrong:** Three UX gaps in the add-vehicle form flow: (1) The spec says "saves" but doesn't specify success feedback — matching the cross-cycle pattern where specs describe actions but not feedback patterns. The builder implemented a working redirect but no confirmation. (2) The form's error handling catches upload failures but swallows them silently — the vehicle is saved without a photo and the user doesn't know. (3) Required vs optional fields are distinguished in the Zod schema but not visually in the form — a basic form UX pattern that was missed.
- **Why Previous Approach Failed:** N/A — all first attempts.
- **What's Different This Time:** This spec explicitly defines the success feedback mechanism (URL param-based toast on redirect), the upload error warning behavior (inline non-blocking alert), and the required/optional visual pattern (asterisk + legend + optional suffix). Each requirement has specific DOM-query acceptance criteria. The cross-cycle pattern (spec under-specifies feedback) has been logged for future decomposition phases.
