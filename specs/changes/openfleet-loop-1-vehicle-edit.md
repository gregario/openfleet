# Change Spec: openfleet-loop-1-vehicle-edit

**Cycle:** 1
**Analysis Run:** 8
**Type:** deepen:vehicle-edit-and-registry-polish
**Grouped Gaps:** qg-fa2-1
**Requires Design Mode:** false

---

## Gap Evidence

### Quality Gap: No Vehicle Edit UI (FA2-J4 Unimplemented)

- **Gap ID:** qg-fa2-1
- **Category:** flow_restructure
- **Severity:** critical
- **Root Cause:** missing_context
- **Root Cause Evidence:** FA2-J4 is a specified journey ("Owner edits vehicle status → active, in-shop, decommissioned") but the story decomposition created only 3 stories (vehicle-list, add-vehicle, vehicle-detail) covering FA2-J1, FA2-J2, and FA2-J3. FA2-J4 was never assigned a story. The builder built all 3 stories correctly. The decomposition phase missed a journey — a fundamental CRUD gap (Create/Read covered, Update missed).

### Current State (What's Wrong)

- **Description:** No UI exists to change vehicle status or edit any vehicle fields. The vehicle detail page is entirely read-only. Status is displayed as static text with no edit affordance. The decommissioned filter toggle on the vehicle list implies vehicles can be decommissioned, but there is no mechanism to set this status. Owner-operators who need to mark a van as "in-shop" for repairs or "decommissioned" for disposal cannot do so.
- **PO Review Assessment:** "COMPLETELY UNIMPLEMENTED. No edit vehicle UI, no status dropdown, no action menu. Status is read-only text everywhere. The decommissioned filter toggle implies vehicles can be decommissioned but there is no way to set this status."
- **PO Review Score:** FA2-J4 scored 3/10 ("raw")
- **Heuristics Failed:** User control and freedom (Nielsen #3), Match between system and real world (Nielsen #2)
- **Affected Screens:** S5-vehicle-detail
- **Affected Journeys:** FA2-J4 (Change vehicle status) — entire journey missing

### Previous Attempts (Do Not Repeat)

First attempt.

---

## Target State

### From Product Standard

The product standard design_standards specify:
- `three_click_rule`: "All key journeys reachable in 3 clicks or fewer" — FA2-J4 spec says 3 clicks
- `vehicle_status.system`: "Traffic light (green/orange/red)" — status changes must integrate with the existing traffic light system
- `voice_and_tone.practical`: "Every element should be useful or get out of the way" — the edit UI should be discoverable but not intrusive on the read view

### From Active Spec

FA2-J4: "Owner edits vehicle status → active, in-shop, decommissioned → decommissioned vehicles hidden from map/dashboard by default"

FA2 acceptance criteria relevant to this spec:
- "Decommissioned vehicles hidden from map and dashboard by default, visible via filter" (already implemented for display; needs the ability to SET the status)

### Concrete Description

After the fix, the vehicle detail page (S5-vehicle-detail) has full edit capability:

**Edit Button:** The vehicle detail header shows an "Edit" button (or pencil icon with label) in the top-right area, next to the back navigation. The button is always visible — no hidden menu discovery needed.

**Edit Mode:** Clicking "Edit" transforms the detail view into an edit form. The form reuses the same field layout as the add-vehicle form (make, model, year, VIN, license plate, color, current odometer, photo) with fields pre-populated from the current vehicle data. The form has "Save" and "Cancel" buttons. Cancel returns to the read-only view without changes.

**Status Dropdown:** A dedicated status control is prominent in the edit view (or accessible directly from the detail header without entering full edit mode). The dropdown shows three options: "Active", "In Shop", "Decommissioned". The current status is pre-selected. Changing status and saving triggers the same PUT endpoint.

**PUT Endpoint:** A new `PUT /api/vehicles/[id]` endpoint accepts the same fields as the POST create endpoint, plus the status field. Validates with the same Zod schema (minus required checks for fields not being changed). Returns the updated vehicle.

**Success Feedback:** After saving, the user sees a success toast: "Vehicle updated" (or "Status changed to In Shop" if only status was changed). The view returns to read-only mode with updated data.

**Decommissioned Integration:** When a vehicle is set to "decommissioned", it is immediately hidden from the dashboard map and fleet sidebar (existing client-side filter handles this). The vehicle list's "Show decommissioned" toggle continues to work as before. The vehicle detail page itself remains accessible via direct URL.

---

## Design Requirements

- **Requires Design Mode:** false
- **Design Mode Scope:** N/A
- **Design Direction:** The edit form should reuse the add-vehicle form's field layout and validation patterns. The add-vehicle form uses a single-column layout with Tailwind card styling, max-width constraint, and clear field grouping. The edit form should look like a sibling of the add form — same spacing, same field order, same validation errors. The status dropdown should use a native `<select>` element styled consistently with other form inputs. No custom dropdown component needed for 3 options.
- **Design Constraints:** The vehicle detail header layout (back button, vehicle name, traffic light indicator) must remain recognizable in edit mode. The tab navigation (Overview, Trips, etc.) should be hidden or disabled during editing to prevent confusion. Only the Overview tab content changes to the edit form.

---

## Acceptance Criteria

AC-vehicle-edit-1: Edit button visible on vehicle detail
  GIVEN the user is viewing a vehicle detail page (/vehicles/[id])
  WHEN the page loads
  THEN an "Edit" button (or equivalent edit affordance) is visible in the detail header area
  MEASUREMENT: DOM query for element with data-testid="vehicle-edit-button" or role="button" containing text "Edit"
  CLOSES_GAP: qg-fa2-1

AC-vehicle-edit-2: Edit mode shows pre-populated form
  GIVEN the user is viewing vehicle detail for a vehicle with make="Ford", model="Transit", year=2022
  WHEN the user clicks the Edit button
  THEN a form appears with all editable fields (make, model, year, VIN, license plate, color, odometer, status) pre-populated with the vehicle's current values
  MEASUREMENT: DOM query for form element containing input fields with values matching the vehicle's stored data; data-testid="vehicle-edit-form" present
  CLOSES_GAP: qg-fa2-1

AC-vehicle-edit-3: Status can be changed to any valid value
  GIVEN the user is in edit mode for a vehicle with status "active"
  WHEN the user changes the status dropdown to "In Shop" and clicks Save
  THEN the vehicle's status is updated to "in-shop" in the database and the detail view reflects the new status
  MEASUREMENT: After save, DOM query confirms status text shows "In Shop" (or equivalent); GET /api/vehicles/[id] returns status="in-shop"
  CLOSES_GAP: qg-fa2-1

AC-vehicle-edit-4: PUT endpoint persists vehicle updates
  GIVEN a valid vehicle ID and updated field values
  WHEN a PUT request is sent to /api/vehicles/[id] with updated data
  THEN the vehicle record is updated in the database and the response contains the full updated vehicle object
  MEASUREMENT: API test — PUT returns 200 with updated fields; subsequent GET returns same updated values
  CLOSES_GAP: qg-fa2-1

AC-vehicle-edit-5: Success feedback after save
  GIVEN the user has edited vehicle fields and clicked Save
  WHEN the save succeeds (PUT returns 200)
  THEN a transient success notification is visible (toast, banner, or inline message) confirming the update, and the view returns to read-only mode
  MEASUREMENT: DOM query for element with role="status" or data-testid="toast" containing success text; edit form is no longer visible
  CLOSES_GAP: qg-fa2-1

AC-vehicle-edit-6: Cancel discards changes
  GIVEN the user is in edit mode and has modified fields
  WHEN the user clicks Cancel
  THEN the view returns to read-only mode with the original (unmodified) vehicle data displayed
  MEASUREMENT: DOM query confirms data-testid="vehicle-edit-form" is absent; vehicle data displayed matches original values (no PUT request was made)
  CLOSES_GAP: qg-fa2-1

---

## Scope

### In Scope

- `src/components/vehicle-detail.tsx` — Add Edit button, edit mode state, edit form rendering
- `src/components/vehicle-edit-form.tsx` — New component (or inline in vehicle-detail) for the edit form, reusing add-vehicle field patterns
- `src/components/vehicle-detail.test.tsx` — Tests for edit mode, form population, save/cancel
- `src/app/api/vehicles/[id]/route.ts` — Add PUT handler for vehicle updates
- `src/app/api/vehicles/[id]/route.test.ts` — Tests for PUT endpoint
- `src/lib/validators.ts` — Add or extend vehicle update schema (partial version of create schema + status field)

### Out of Scope (Do Not Touch)

- `src/components/vehicle-list.tsx` — The list page does not get inline editing; all editing happens on the detail page
- `src/components/add-vehicle-form.tsx` — The add form itself is not modified; patterns are reused but the component is not shared (add and edit have different submit handlers, validation rules, and pre-population needs)
- `src/app/(admin)/dashboard/page.tsx` — Dashboard is not affected; decommissioned filtering already exists
- `src/components/vehicle-mini-map.tsx` — Mini-map is not affected by edit mode
- Bulk operations (edit multiple vehicles at once) — Out of scope for this milestone
- Vehicle deletion — Not specified in FA2-J4; decommission is the "soft delete" pattern

### Regression Risk

- Edit mode must not break tab navigation when not editing (tabs should work normally in read-only mode)
- The PUT endpoint must validate all fields with the same rigor as the POST endpoint (Zod schema)
- Changing status to "decommissioned" must not delete the vehicle or its associated data — only hide from default views
- The existing vehicle-list decommissioned filter toggle must continue to work after status changes
- All existing vehicle-detail tests must pass (read-only mode unchanged)

---

## Root Cause Context

- **Classification:** missing_context
- **What Went Wrong:** The story decomposition phase created 3 stories mapping to FA2-J1 (add), FA2-J2 (view detail), and FA2-J3 (check health). FA2-J4 (Change vehicle status) was omitted — a fundamental CRUD gap where Create and Read were covered but Update was missed. The builder built all 3 assigned stories correctly and completely. The gap is in decomposition, not implementation.
- **Why Previous Approach Failed:** N/A — first attempt. This journey was never built.
- **What's Different This Time:** This change spec explicitly adds the missing FA2-J4 journey as a fix story with 6 concrete acceptance criteria. The spec provides the PUT endpoint contract, form field list, status values, and success feedback requirements. The builder has no ambiguity about the edit UI's scope or behavior. The cross-cycle pattern has been logged: decomposition should cross-reference all user_journeys against generated stories.
