# Bug: SQL Injection in insertStatement

**File:** `server/tables/insights.ts`  
**Severity:** 🔴 Security — OWASP A03: Injection

## Description

`insertStatement` builds a SQL query via string interpolation. The `text` field
comes directly from user input (the form in `add-insight.tsx`). A malicious value
can break out of the string literal and execute arbitrary SQL.

### Current code
```ts
export const insertStatement = (item: Insert) =>
  `INSERT INTO insights (brand, createdAt, text) VALUES (${item.brand}, '${item.createdAt}', '${item.text}')`;
```

### Example exploit
If a user submits the insight text:
```
foo', 1); DROP TABLE insights; --
```
The rendered SQL becomes:
```sql
INSERT INTO insights (brand, createdAt, text) VALUES (1, '2026-01-01', 'foo', 1); DROP TABLE insights; --')
```

## Fix

Use `@db/sqlite`'s parameterised query support instead of string interpolation.
The `db.sql` tagged template literal already escapes values safely (as seen in
`list-insights.ts` and `lookup-insight.ts`). The `insertStatement` helper should
either:

**Option A** — remove `insertStatement` and do the insert inline with `db.sql`:
```ts
// in create-insight.ts
db.sql`INSERT INTO insights (brand, createdAt, text) VALUES (${brand}, ${createdAt}, ${text})`;
```

**Option B** — use `db.prepare` for a reusable parameterised statement:
```ts
const stmt = db.prepare(
  "INSERT INTO insights (brand, createdAt, text) VALUES (?, ?, ?)"
);
stmt.run(item.brand, item.createdAt, item.text);
```

Option A is consistent with the rest of the codebase and is preferred.
The `insertStatement` export in `tables/insights.ts` can then be removed,
along with its `Insert` type (or keep `Insert` as it's useful for typing input).

**Status:** ✅ Fixed — commit `2580318` (Option A: `insertStatement` removed from `tables/insights.ts`; `create-insight.ts` and `testing.ts` seed both use `db.sql` tagged template)
