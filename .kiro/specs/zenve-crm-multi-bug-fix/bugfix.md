# Bugfix Requirements Document

## Introduction

The Zenve Zippy CRM dashboard contains nine bugs across four source files (`App.jsx`, `Navbar.jsx`, `searchConfig.js`, and `data.js`). These bugs fall into three categories:

1. **Import path errors** — a case-sensitive module path and an invalid CSS import path that cause crashes or build failures.
2. **Search column mismatches** — ten entries in `searchConfig.js` reference column names that do not exist in `TABLES_SEED`, causing `Array.indexOf` to return `-1` and every search query to silently return no results.
3. **Column name typos in data.js** — eight column names in `TABLES_SEED` contain spelling errors (transposed letters, doubled letters, a wrong word, or a leading space), causing incorrect header labels in the UI and broken search lookups.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the application is built or served on a case-sensitive file system (Linux / CI) THEN the system crashes with "Cannot find module './components/sidebar.jsx'" because `App.jsx` imports `sidebar.jsx` (lowercase s) while the file on disk is `Sidebar.jsx` (capital S).

1.2 WHEN `Navbar.jsx` is resolved by the bundler THEN the system throws a build error because `Navbar.jsx` imports `"./index.css"` which does not exist inside the `components/` directory.

1.3 WHEN a user types a search term into the search bar for any of the tables `vaccinations`, `addresses`, `services`, `sellers`, `orders`, `order_items`, `gps_locations`, `geocoding_cache`, `executive_tasks`, or `executive_alerts` THEN the system returns no results because `SEARCH_CONFIG[key].column` does not match any entry in `TABLES_SEED[key].columns`, causing `indexOf` to return `-1` and the filter predicate to never match.

1.4 WHEN the `doctors` table is displayed THEN the system renders the column header `"consultaion_fee"` (missing the letter 't') instead of `"consultation_fee"`.

1.5 WHEN the `appointments` table is displayed THEN the system renders the column headers `"consultaion_fee"` and `"appointmnet_type"` (both misspelled) instead of `"consultation_fee"` and `"appointment_type"`.

1.6 WHEN the `availability_slots` table is displayed THEN the system renders the column header `"consultaion_type"` (missing the letter 't') instead of `"consultation_type"`.

1.7 WHEN the `consultations` table is displayed THEN the system renders the column header `"consultaion_mode"` (missing the letter 't') instead of `"consultation_mode"`.

1.8 WHEN the `sellers` table is displayed THEN the system renders the column header `"is_actiive"` (double letter 'i') instead of `"is_active"`.

1.9 WHEN the `deliveries` table is displayed THEN the system renders the column header `"eatimated_delivery"` (missing the letter 's') instead of `"estimated_delivery"`.

1.10 WHEN the `commission_rules` table is displayed THEN the system renders the column header `"effective_form"` (wrong word 'form') instead of `"effective_from"`.

1.11 WHEN the `executive_tasks` table is displayed THEN the system renders the column header `"piincode"` (double letter 'i') instead of `"pincode"`.

1.12 WHEN the `addresses` table is displayed or searched THEN the system renders the column header `" city"` (with a leading space) and address search fails because `searchConfig` passes `"city"` while the actual column key is `" city"` (with a leading space), causing `indexOf` to return `-1`.

---

### Expected Behavior (Correct)

2.1 WHEN the application is built or served on any file system THEN the system SHALL resolve `Sidebar.jsx` correctly because `App.jsx` uses the import path `"./components/Sidebar.jsx"` with a capital S.

2.2 WHEN `Navbar.jsx` is processed by the bundler THEN the system SHALL NOT throw a missing-module error because the non-existent local `"./index.css"` import SHALL be removed from `Navbar.jsx`.

2.3 WHEN a user types a search term into the search bar for `vaccinations`, `addresses`, `services`, `sellers`, `orders`, `order_items`, `gps_locations`, `geocoding_cache`, `executive_tasks`, or `executive_alerts` THEN the system SHALL filter and display only rows whose value in the configured column contains the search term, because `SEARCH_CONFIG[key].column` SHALL exactly match a column name present in `TABLES_SEED[key].columns`.

2.4 WHEN the `doctors` table is displayed THEN the system SHALL render the column header `"consultation_fee"` (correctly spelled).

2.5 WHEN the `appointments` table is displayed THEN the system SHALL render the column headers `"consultation_fee"` and `"appointment_type"` (both correctly spelled).

2.6 WHEN the `availability_slots` table is displayed THEN the system SHALL render the column header `"consultation_type"` (correctly spelled).

2.7 WHEN the `consultations` table is displayed THEN the system SHALL render the column header `"consultation_mode"` (correctly spelled).

2.8 WHEN the `sellers` table is displayed THEN the system SHALL render the column header `"is_active"` (correctly spelled, single 'i').

2.9 WHEN the `deliveries` table is displayed THEN the system SHALL render the column header `"estimated_delivery"` (correctly spelled, with 's').

2.10 WHEN the `commission_rules` table is displayed THEN the system SHALL render the column header `"effective_from"` (correct word 'from').

2.11 WHEN the `executive_tasks` table is displayed THEN the system SHALL render the column header `"pincode"` (correctly spelled, single 'i').

2.12 WHEN the `addresses` table is displayed or searched THEN the system SHALL render the column header `"city"` (no leading space) and address search SHALL correctly match rows by city value.

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN any table other than those listed above is selected in the sidebar THEN the system SHALL CONTINUE TO display its columns and rows exactly as before.

3.2 WHEN the search bar is used for tables with a correctly matching `SEARCH_CONFIG` entry (e.g., `pet_parents`, `pets`, `doctors`, `clinics`) THEN the system SHALL CONTINUE TO filter rows by the configured column and return matching results.

3.3 WHEN a user clicks "New record" and fills out the modal form THEN the system SHALL CONTINUE TO append the new row to the table and increment the record count.

3.4 WHEN a user edits an existing row via the edit modal THEN the system SHALL CONTINUE TO update that row in place without affecting other rows.

3.5 WHEN a user deletes a row after confirming the dialog THEN the system SHALL CONTINUE TO remove that row and decrement the record count.

3.6 WHEN a user navigates between pages in the data table THEN the system SHALL CONTINUE TO paginate correctly, showing the correct slice of filtered rows.

3.7 WHEN a user selects a different table from the sidebar THEN the system SHALL CONTINUE TO reset the search term and page number to their defaults.

3.8 WHEN the application renders the global stats strip THEN the system SHALL CONTINUE TO display all stat values unchanged.

3.9 WHEN the `Sidebar`, `TopBar`, `StatsGrid`, `DataTable`, and `RecordModal` components render THEN the system SHALL CONTINUE TO function without any behavioral change beyond the corrected column names and import paths.
