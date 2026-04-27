# Implementation Plan: Insights Feature

> **Status: ✅ Implemented — commit `2580318` (April 27, 2026)**

Complete the two missing server endpoints, wire them to the existing frontend
components, and fix the pre-existing bugs that block the feature from working
end-to-end.

## Decisions

- **Schema alignment** — client fields are updated to match the server model (`brand`,
  `createdAt`) because changing UI code is cheaper than DB migrations. The server
  model and DB columns are the source of truth.
- **Optimistic updates** — UI updates state immediately on user action. If the server
  returns a non-2xx response the operation is rolled back and an error is shown.
- **Error handling** — use a consistent `error` state pattern in `App`; display an
  inline error message in the UI rather than crashing. Operations degrade gracefully
  (e.g. failed delete restores the item; failed create removes the temp entry).

---

## Phase 1 — Pre-requisite bug fixes

These bugs prevent the feature from being testable. Fix them before writing new code.

### 1.1 Fix `/insights` route response (BUG-001)

**File:** `server/main.ts`

`ctx.response.body = 200` overwrites the result with the number `200`. Change to
`ctx.response.status = 200`.

### 1.2 Fix `useState` generic (BUG-005)

**File:** `client/src/routes/app.tsx`

`useState<Insight>` → `useState<Insight[]>`.

### 1.3 Fix `res.json()` not awaited (BUG-006)

**File:** `client/src/routes/app.tsx`

Chain `.then(res => res.json()).then(data => setInsights(data))` instead of calling
`setInsights(res.json())` directly inside the first `.then`.

### 1.4 Align client schema to server model

**File:** `client/src/schemas/insight.ts`

Rename `brandId: z.number()` → `brand: z.number()` and `date: z.date()` →
`createdAt: z.date()`.

**File:** `client/src/components/insights/insights.tsx`

Update destructuring `{ id, text, date, brandId }` → `{ id, text, createdAt, brand }`.
Update JSX: `brandId` → `brand`, `date.toString()` → `createdAt.toString()`.

**File:** `client/src/components/insights/insights.test.tsx`

Update fixture field names to match (`brand`, `createdAt`) and add the missing
`id` field (see `docs/bugs/misc.md` BUG-008).

---

## Phase 2 — Server: create endpoint

### 2.1 New file: `server/operations/create-insight.ts`

Pattern: mirrors `list-insights.ts` and `lookup-insight.ts`.

```
Input:   HasDBClient & { brand: number; text: string }
Returns: Insight
```

Steps inside the operation:
1. Compute `createdAt = new Date().toISOString()`.
2. Insert using a parameterised `db.sql` tagged template (NOT `insertStatement` —
   see `docs/bugs/sql-injection.md`):
   ```ts
   db.sql`INSERT INTO insights (brand, createdAt, text)
          VALUES (${input.brand}, ${createdAt}, ${input.text})`;
   ```
3. Retrieve the created row:
   ```ts
   db.sql`SELECT * FROM insights WHERE id = last_insert_rowid()`
   ```
4. Map `createdAt` string → `Date` and return the `Insight`.

### 2.2 Register route in `server/main.ts`

Replace the stub `router.get("/insights/create", ...)` with:
```
router.post("/insights", async (ctx) => { ... })
```

Handler steps:
1. Parse the request body as JSON.
2. Validate with Zod: `z.object({ brand: z.number().int().min(0), text: z.string().min(1) })`.
3. Validation failure → `400` `{ error: "Invalid request body" }`.
4. Call `createInsight({ db, ...body })`.
5. Success → `201` + created `Insight` as response body.
6. Wrap in try/catch → `500` `{ error: "Internal server error" }`.

### 2.3 Remove `insertStatement` from `server/tables/insights.ts`

Once `create-insight.ts` uses `db.sql` directly, delete the unsafe
string-interpolation `insertStatement` export.

At the same time, update `server/testing.ts` so the `withDB` fixture no longer
depends on `insertStatement` when seeding test data. The `Insert` type can remain
as it is still useful for typing the fixture input.

---

## Phase 3 — Server: delete endpoint

### 3.1 New file: `server/operations/delete-insight.ts`

```
Input:   HasDBClient & { id: number }
Returns: boolean  (true = deleted, false = not found)
```

Steps:
1. `db.sql\`DELETE FROM insights WHERE id = ${input.id}\``
2. Return `db.changes > 0`.

### 3.2 Register route in `server/main.ts`

Replace the stub `router.get("/insights/delete", ...)` with:
```
router.delete("/insights/:id", (ctx) => { ... })
```

Handler steps:
1. `parseInt(ctx.params.id, 10)` — on `NaN` → `400`.
2. Call `deleteInsight({ db, id })`.
3. `true` → `204` (no body).
4. `false` → `404` `{ error: "Insight not found" }`.
5. Wrap in try/catch → `500`.

Also fix the existing `router.get("/insights/:id", ...)` handler at the same time:
parse `id` with `parseInt` (BUG-002) and return `404` when `lookupInsight` returns
`undefined`.

---

## Phase 4 — Frontend: state architecture

`App` owns `insights` state but `Header` holds `AddInsight` open state in isolation
with no way to notify `App` of a new insight. Lift callbacks into `App` and thread
them down.

### 4.1 `App` — `client/src/routes/app.tsx`

Add:
- `const [error, setError] = useState<string | null>(null)`
- `handleAdd(input: { brand: number; text: string })` — owns temp id generation,
  optimistic insertion, POST, rollback, and reconciliation (Phase 5)
- `handleDelete(id: number)` — removes entry optimistically, sends DELETE (Phase 5)
- Pass `onAdd={handleAdd}` to `<Header>`
- Pass `onDelete={handleDelete}` to `<Insights>`
- Render `{error && <p role="alert" className={styles.error}>{error}</p>}` below header

Also update `client/src/routes/app.module.css` to add a visible style for the
inline error state.

### 4.2 `Header` — `client/src/components/header/header.tsx`

Add `onAdd(input: { brand: number; text: string }): void` to `HeaderProps`. Pass
through to `<AddInsight>`.

Update `client/src/components/header/header.test.tsx` to pass the new required prop.

### 4.3 `AddInsight` — `client/src/components/add-insight/add-insight.tsx`

Extend props:
```ts
type AddInsightProps = ModalProps & {
  onAdd(input: { brand: number; text: string }): void;
};
```

Make the form controlled: `useState` for `brand` (number, default first brand id)
and `text` (string, default `""`).

`addInsight` handler:
1. `e.preventDefault()`
2. Call `props.onAdd({ brand, text })`.
3. `props.onClose()`
4. `App.handleAdd` performs the optimistic insert and server reconciliation.

### 4.4 `Insights` — `client/src/components/insights/insights.tsx`

Add `onDelete(id: number): void` to `InsightsProps`. Wire the `Trash2Icon` onClick:
```tsx
onClick={() => props.onDelete(id)}
```

Update `client/src/components/insights/insights.test.tsx` to pass the new required
`onDelete` prop alongside the renamed fixture fields.

---

## Phase 5 — Frontend: API calls

Both API calls live in `App` alongside state, keeping components presentational.

### `handleAdd`

```
1. tempId = Date.now()
2. setInsights(prev => [{ id: tempId, brand, createdAt, text }, ...prev])   // optimistic
3. POST /api/insights  body: { brand, text }
4. on 201: parse body; replace entry where id === tempId with server response
           (server createdAt is a string — wrap with new Date(...))
5. on error: remove temp entry, setError("Failed to add insight — please try again")
```

Fetch call:
```ts
fetch("/api/insights", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ brand, text }),
})
```

`AddInsight` should stay dumb here: it submits only the form payload, while `App`
is the single owner of optimistic state changes.

### `handleDelete`

```
1. snapshot = insights.find(i => i.id === id)
2. snapshotIndex = insights.findIndex(i => i.id === id)
3. setInsights(prev => prev.filter(i => i.id !== id))   // optimistic
4. DELETE /api/insights/:id
5. on 204: done
6. on error: re-insert snapshot at snapshotIndex, setError("Failed to delete insight — please try again")
```

---

## Relevant files

| File | Change |
|---|---|
| `server/main.ts` | Fix BUG-001 + BUG-002; register POST + DELETE routes |
| `server/operations/create-insight.ts` | New file |
| `server/operations/delete-insight.ts` | New file |
| `server/tables/insights.ts` | Remove `insertStatement` |
| `server/testing.ts` | Stop using `insertStatement` in the test fixture |
| `client/src/schemas/insight.ts` | Rename `brandId`→`brand`, `date`→`createdAt` |
| `client/src/routes/app.tsx` | Fix BUG-005/006; add error state + callbacks |
| `client/src/routes/app.module.css` | Add inline error styling |
| `client/src/components/header/header.tsx` | Thread `onAdd` prop |
| `client/src/components/header/header.test.tsx` | Pass new required prop |
| `client/src/components/add-insight/add-insight.tsx` | Controlled form; call `onAdd` |
| `client/src/components/insights/insights.tsx` | Rename fields; wire `onDelete` |
| `client/src/components/insights/insights.test.tsx` | Update fixtures and pass required prop |

---

## Verification checklist

- [ ] `deno task dev` starts without errors; browser loads at `http://localhost:3000`
- [ ] Existing insights load and display on page load
- [ ] "Add insight" modal: submitting appends item immediately (optimistic); entry persists after page refresh
- [ ] Trash icon: removes item immediately (optimistic); absent after page refresh
- [ ] Server failure simulation: UI rolls back the optimistic change and shows error message
- [ ] `deno task test:client` — all existing client tests still pass
- [ ] Server operation tests cover create success, create validation failure, delete existing id, and delete missing id
- [ ] `GET /insights` returns `200` + array
- [ ] `POST /insights` with valid body returns `201` + created insight
- [ ] `POST /insights` with invalid body returns `400`
- [ ] `DELETE /insights/:id` for existing id returns `204`
- [ ] `DELETE /insights/:id` for unknown id returns `404`
- [ ] `GET /insights/:id` for unknown id returns `404`

---

## Out of scope (tracked in `docs/bugs/`)

- BUG-003 — broad lint suppression comment in `main.ts`
- BUG-004 — no structured error handling on existing GET routes
- BUG-007 — `servereBaseUrl` typo in `vite.config.ts`
- BUG-009 — missing `key` prop on `<option>` in `add-insight.tsx`
