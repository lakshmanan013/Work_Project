// Shared helpers for turning an uploaded CSV/JSON file (or pasted text)
// into an array of plain row objects. Used by the "Import file" button on
// a table page (App.jsx) and by the CSV/JSON import box in Bulk Tools.

export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] ?? "";
    });
    return obj;
  });
}

export function parseImportText(text) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  }
  return parseCSV(trimmed);
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

// Given parsed rows and a table's field config, builds create/update
// payloads and applies them one row at a time via the supplied
// create/update functions. Returns a {created, updated, failed} summary.
// Rows with an `id` column update that record; rows without one create a
// new record — same convention used by the Bulk Tools importer.
export async function importRows(rows, fields, { createFn, updateFn }) {
  let created = 0,
    updated = 0,
    failed = 0;

  for (const row of rows) {
    try {
      const payload = {};
      fields.forEach((field) => {
        if (field.readOnly) return;
        if (row[field.key] === undefined) return;
        payload[field.key] = field.coerce ? field.coerce(row[field.key]) : row[field.key];
      });
      if (row.id !== undefined && row.id !== "") {
        await updateFn(row.id, payload);
        updated++;
      } else {
        await createFn(payload);
        created++;
      }
    } catch {
      failed++;
    }
  }

  return { created, updated, failed };
}
