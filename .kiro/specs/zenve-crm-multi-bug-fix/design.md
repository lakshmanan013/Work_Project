# Zenve CRM Multi-Bug Fix — Bugfix Design

## Overview

The Zenve Zippy CRM dashboard contains nine bugs across four source files (`App.jsx`,
`Navbar.jsx`, `searchConfig.js`, and `data.js`). The bugs fall into three categories:

1. **Import path errors** — a case-sensitive module path and a missing CSS file cause crashes or build failures on case-sensitive file systems.
2. **Search column mismatches** — ten entries in `searchConfig.js` reference column names that do not exist in `TABLES_SEED`, so `Array.indexOf` returns `-1` and every search query silently returns no results.
3. **Column name typos in `data.js`** — nine column names in `TABLES_SEED` contain spelling errors (transposed letters, doubled letters, a wrong word, or a leading space), producing incorrect header labels and breaking search lookups.

The fix strategy is purely corrective: no logic changes, no new abstractions. Each change targets the exact character(s) at fault.

---

## Glossary

- **Bug_Condition (C)**: The set of inputs or render conditions that expose any of the nine defects.
- **Property (P)**: The desired outcome when C holds — the app builds, renders correct headers, and search returns matching rows.
- **Preservation**: All behaviors not directly touched by the nine fixes must continue to work unchanged.
- **`isBugCondition(input)`**: Pseudocode predicate that returns `true` when `input` matches one of the nine defect triggers.
- **`TABLES_SEED`**: The seed data object in `src/data.js` whose `columns` arrays drive table headers and search index lookup.
- **`SEARCH_CONFIG`**: The map in `src/searchConfig.js` whose `column` values are looked up via `Array.indexOf` against `TABLES_SEED[key].columns`.
- **`columnIndex`**: The result of `table.columns.indexOf(searchConfig.column)` in `App.jsx`; returns `-1` when the names do not match, causing the filter to be skipped.

---

## Bug Details

### Bug Condition

The nine bugs share a common shape: a string literal in source code does not match its expected counterpart elsewhere, causing either a module resolver failure, a silent search miss, or a wrong UI label.

**Formal Specification:**

```
FUNCTION isBugCondition(input)
  INPUT: input — one of:
           ImportDeclaration (App.jsx or Navbar.jsx),
           SearchConfigEntry  (searchConfig.js),
           ColumnDefinition   (data.js)
  OUTPUT: boolean

  IF input IS ImportDeclaration
    RETURN (input.path = "./components/sidebar.jsx"   // wrong case
            OR input.path = "./index.css")             // file does not exist
  END IF

  IF input IS SearchConfigEntry
    LET colName := SEARCH_CONFIG[input.tableKey].column
    LET cols    := TABLES_SEED[input.tableKey].columns
    RETURN cols.indexOf(colName) = -1                  // mismatch
  END IF

  IF input IS ColumnDefinition
    LET actual   := TABLES_SEED[input.tableKey].columns[input.index]
    LET expected := CORRECT_COLUMN_NAME[input.tableKey][input.index]
    RETURN actual ≠ expected                           // typo present
  END IF

  RETURN false
END FUNCTION
```

### Examples

| Bug # | Trigger | Actual (defective) | Expected (correct) |
|-------|---------|--------------------|-------------------|
| 1 | App.jsx import | `"./components/sidebar.jsx"` | `"./components/Sidebar.jsx"` |
| 2 | Navbar.jsx import | `import "./index.css"` | *(removed)* |
| 3a | searchConfig vaccinations.column | `"vaccine"` | `"vaccine_name"` |
| 3b | searchConfig services.column | `"name"` | `"title"` |
| 3c | searchConfig sellers.column | `"name"` | `"business_name"` |
| 3d | searchConfig orders.column | `"customer"` | `"order_number"` |
| 3e | searchConfig order_items.column | `"product"` | `"product_name"` |
| 3f | searchConfig gps_locations.column | `"entity"` | `"entity_type"` |
| 3g | searchConfig geocoding_cache.column | `"address"` | `"query"` |
| 3h | searchConfig executive_tasks.column | `"task"` | `"title"` |
| 3i | searchConfig executive_alerts.column | `"alert"` | `"title"` |
| 4a | data.js doctors columns | `"consultaion_fee"` | `"consultation_fee"` |
| 4b | data.js appointments columns | `"appointmnet_type"` | `"appointment_type"` |
| 4c | data.js appointments columns | `"consultaion_fee"` | `"consultation_fee"` |
| 4d | data.js availability_slots columns | `"consultaion_type"` | `"consultation_type"` |
| 4e | data.js consultations columns | `"consultaion_mode"` | `"consultation_mode"` |
| 4f | data.js sellers columns | `"is_actiive"` | `"is_active"` |
| 4g | data.js deliveries columns | `"eatimated_delivery"` | `"estimated_delivery"` |
| 4h | data.js commission_rules columns | `"effective_form"` | `"effective_from"` |
| 4i | data.js executive_tasks columns | `"piincode"` | `"pincode"` |
| 4j | data.js addresses columns | `" city"` (leading space) | `"city"` |

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- All tables not mentioned in the bug list must continue to display their columns and rows exactly as before.
- Search functionality for tables with already-correct `SEARCH_CONFIG` entries (`pet_parents`, `pets`, `doctors`, `clinics`, etc.) must continue to filter rows correctly.
- New-record modal, edit modal, delete confirmation, pagination, sidebar navigation, stats strip, and tab switching must all continue to work exactly as before.
- The visual structure, styling, and layout of every component must remain unchanged.

**Scope:**
All application inputs that do NOT involve the nine specific string literals corrected by this fix are completely unaffected. This includes:
- Mouse clicks on sidebar items, table rows, action buttons
- Keyboard navigation
- Form submissions (new record, edit record)
- Page navigation (previous / next)
- Tab switching (Data, Dashboard, etc.)

---

## Hypothesized Root Cause

1. **Copy-paste case error (Bug 1)**: The import for `Sidebar.jsx` was written with a lowercase `s`. On case-insensitive file systems (macOS, Windows) this resolves silently; on Linux/CI it fails with a module-not-found error.

2. **Leftover CSS import (Bug 2)**: `Navbar.jsx` was likely scaffolded from a template that included a local `index.css`. The CSS file was never created inside `components/`, leaving a dangling import that breaks the bundler.

3. **Column name drift in searchConfig (Bugs 3a–3i)**: `searchConfig.js` was written independently of `data.js` (or was updated when `data.js` column names changed) and the column aliases were never reconciled. The runtime consequence is `indexOf` returning `-1`, causing the filter predicate to be silently skipped so every search returns all rows unfiltered — or, with the guard `if (columnIndex === -1) return withIndex`, returns all rows rather than no rows.

4. **Typos introduced during data entry (Bugs 4a–4j)**: Column names in `TABLES_SEED` were typed manually. Common mistakes: missing letter (`consultaion` for `consultation`), transposed letters (`appointmnet`), doubled letter (`is_actiive`, `piincode`), wrong word (`effective_form`), missing letter at start (`eatimated`), and an accidental leading space (`" city"`).

---

## Correctness Properties

Property 1: Bug Condition — All Nine Defects Are Corrected

_For any_ input where the bug condition holds (`isBugCondition` returns `true`), the fixed codebase SHALL:
- Resolve all module imports without error on case-sensitive file systems,
- Return a `columnIndex ≥ 0` for every table that has a `SEARCH_CONFIG` entry, and
- Render every corrected column header with the exact intended spelling.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12**

Property 2: Preservation — All Unaffected Behaviors Remain Identical

_For any_ input where the bug condition does NOT hold (`isBugCondition` returns `false`), the fixed codebase SHALL produce exactly the same behavior as the original codebase, preserving all CRUD operations, pagination, search on already-correct tables, navigation, and rendering.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9**

---

## Fix Implementation

### Changes Required

**File: `src/App.jsx`**  
**Change**: Correct import path casing.

```diff
- import Sidebar from "./components/sidebar.jsx";
+ import Sidebar from "./components/Sidebar.jsx";
```

---

**File: `src/components/Navbar.jsx`**  
**Change**: Remove the non-existent CSS import.

```diff
- import "./index.css";
```

---

**File: `src/searchConfig.js`**  
**Change**: Align each `column` value with the actual column name in `TABLES_SEED`.

| Table key | Old `column` value | New `column` value |
|-----------|-------------------|-------------------|
| `vaccinations` | `"vaccine"` | `"vaccine_name"` |
| `addresses` | `"city"` | `"city"` *(unchanged — fixed by data.js leading-space fix)* |
| `services` | `"name"` | `"title"` |
| `sellers` | `"name"` | `"business_name"` |
| `orders` | `"customer"` | `"order_number"` |
| `order_items` | `"product"` | `"product_name"` |
| `gps_locations` | `"entity"` | `"entity_type"` |
| `geocoding_cache` | `"address"` | `"query"` |
| `executive_tasks` | `"task"` | `"title"` |
| `executive_alerts` | `"alert"` | `"title"` |

---

**File: `src/data.js`**  
**Change**: Correct all column name typos in `TABLES_SEED`.

| Table | Typo | Correction |
|-------|------|------------|
| `doctors` | `"consultaion_fee"` | `"consultation_fee"` |
| `appointments` | `"appointmnet_type"` | `"appointment_type"` |
| `appointments` | `"consultaion_fee"` | `"consultation_fee"` |
| `availability_slots` | `"consultaion_type"` | `"consultation_type"` |
| `consultations` | `"consultaion_mode"` | `"consultation_mode"` |
| `sellers` | `"is_actiive"` | `"is_active"` |
| `deliveries` | `"eatimated_delivery"` | `"estimated_delivery"` |
| `commission_rules` | `"effective_form"` | `"effective_from"` |
| `executive_tasks` | `"piincode"` | `"pincode"` |
| `addresses` | `" city"` (leading space) | `"city"` |

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate each bug on the unfixed code; then verify the fix works correctly and preserves existing behavior.

Because all bugs are pure string-literal corrections with no logic change, unit and integration tests are the primary vehicle. Property-based tests are used for the search column alignment property, which spans a large combinatorial input space (any search term × any affected table).

---

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Render each affected component / invoke each affected code path on the UNFIXED code and assert the expected (correct) behavior — the assertions will fail, confirming the bug.

**Test Cases**:
1. **Import resolution test**: Build the app on a case-sensitive file system; assert build succeeds (will fail on unfixed code — missing module error).
2. **CSS import test**: Bundle `Navbar.jsx`; assert no missing-file error (will fail on unfixed code).
3. **Search miss test**: For each of the 10 affected tables, perform a search for a value known to exist in the table; assert at least one row is returned (will fail on unfixed code — `indexOf` returns `-1`).
4. **Column header test**: Render each affected table; assert the corrected column name appears in the header (will fail on unfixed code — typo is shown).

**Expected Counterexamples**:
- Build failure: `Cannot find module './components/sidebar.jsx'`
- Build failure: `Cannot find module './index.css'`
- Search returns all rows unfiltered instead of matching rows for `vaccinations`, `services`, `sellers`, `orders`, `order_items`, `gps_locations`, `geocoding_cache`, `executive_tasks`, `executive_alerts`, `addresses`
- Column headers display misspelled names: `consultaion_fee`, `appointmnet_type`, `is_actiive`, etc.

---

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed code produces the expected behavior.

**Pseudocode:**

```
FOR ALL input WHERE isBugCondition(input) DO
  result := evaluate_fixed_code(input)
  ASSERT expectedBehavior(result)
END FOR
```

**Concrete assertions**:
- Build completes without errors on a case-sensitive file system.
- `SEARCH_CONFIG[key].column` exists in `TABLES_SEED[key].columns` for every key (i.e., `indexOf` ≥ 0).
- Searching `"vaccine_name"` value in `vaccinations` table returns the matching row.
- Each corrected column name renders exactly (no typos) as a table header.

---

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code produces the same result as the original code.

**Pseudocode:**

```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT original_code(input) = fixed_code(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for the search filter path because it can generate many (searchTerm, tableKey) pairs and assert that the filter output is identical before and after the fix for tables whose config was already correct.

**Test Cases**:
1. **Unaffected search preservation**: For tables `pet_parents`, `pets`, `doctors`, `clinics`, `medical_records`, `notifications`, `audit_logs` — generate random search terms and assert filter output is unchanged.
2. **CRUD preservation**: Add, edit, and delete a row in an unaffected table; assert state changes are identical.
3. **Pagination preservation**: Navigate pages in an unaffected table; assert page slices are identical.
4. **Stats strip preservation**: Assert all stat values render unchanged.

---

### Unit Tests

- Test that `App.jsx` renders without throwing (import resolution).
- Test that `Navbar.jsx` renders without throwing (no CSS import error).
- For each of the 10 affected `SEARCH_CONFIG` entries: assert `TABLES_SEED[key].columns.indexOf(SEARCH_CONFIG[key].column) >= 0`.
- For each corrected column in `data.js`: assert the column name string equals the expected spelling.
- Test `addresses` column array: assert `" city"` is absent and `"city"` is present.

### Property-Based Tests

- Generate random (tableKey, searchTerm) pairs for the 10 previously broken tables; after the fix, assert `columnIndex >= 0` for all of them and that filtering by the column returns a consistent subset.
- Generate random search terms for already-correct tables; assert the filter returns the same result before and after the fix (preservation).
- For all `TABLES_SEED` entries, assert every column name contains only lowercase letters, digits, and underscores (no leading/trailing spaces, no double letters in known positions) — this would have caught all typos.

### Integration Tests

- Full render of the app: click each sidebar item and assert the table renders with the correct column headers.
- Perform a search in each previously broken table and assert at least one row matches (using known seed data).
- Verify that selecting an unaffected table after selecting an affected one resets the search and displays correct data.
- Verify the new-record modal opens, submits, and appends a row to an affected table after the fix.
