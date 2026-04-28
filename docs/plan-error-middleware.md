# Plan: Global Error Middleware

Replace per-route `try/catch` blocks with a single Oak application-level error
middleware, and extend coverage to the currently unguarded GET routes (BUG-004).

**Status: ⏳ Not yet implemented**

---

## Decision

Use **Option A — Oak application-level error middleware**.

A single middleware registered on `app` (before `router.routes()`) catches any
unhandled exception from any route and returns a structured JSON 500. This is
the idiomatic Oak pattern and requires no changes to the operation functions.

Alternatives considered and rejected:

- **Option B (typed Result)** — too invasive; requires rewriting all operations
  and their tests; still needs a safety-net catch for DB-level errors.
- **Option C (per-route wrapper)** — same one-place-per-abstraction benefit as
  Option A but worse ergonomics and still scattered across route registrations.

---

## Phase 1 — Failing tests

### 1.1 Integration-style tests for error paths in `server/main.ts`

Add `server/main.test.ts` (or extend a dedicated route-handler test file).
Use Oak's `testing` utilities or a lightweight `superoak` / direct `fetch`
approach against a test server instance.

Tests to write **before** touching `main.ts`:

| Test | Expected behaviour |
|---|---|
| GET `/insights` — DB throws | `500` `{ error: "Internal server error" }` |
| GET `/insights/:id` — DB throws | `500` `{ error: "Internal server error" }` |
| POST `/insights` — DB throws | `500` `{ error: "Internal server error" }` |
| DELETE `/insights/:id` — DB throws | `500` `{ error: "Internal server error" }` |

These tests must fail before the middleware is added (GET routes currently
produce an Oak HTML 500, not JSON).

---

## Phase 2 — Implementation

### 2.1 Add global error middleware to `server/main.ts`

Register the middleware on `app` **before** `router.routes()`:

```ts
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error("Unhandled error:", err);
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
  }
});
```

### 2.2 Remove per-route `try/catch` blocks

Delete the `try/catch` wrappers from:
- `router.post("/insights", ...)` 
- `router.delete("/insights/:id", ...)`

The handler bodies remain unchanged — only the wrapping boilerplate is removed.

### 2.3 Remove the `deno-lint-ignore-file no-explicit-any` suppression (BUG-003)

Now that `ctx.params.id` is parsed with `parseInt` in both routes that use it,
the only remaining `any` usage is gone. Remove the file-level lint suppression
and fix any resulting type errors explicitly.

---

## Phase 3 — Documentation

Update `docs/bugs/server-main.md`:
- **BUG-003** → `✅ Fixed — commit <sha>`
- **BUG-004** → `✅ Fixed — commit <sha>`

Update this file:
- **Status** → `✅ Implemented — commit <sha> (date)`

---

## Relevant files

| File | Change |
|---|---|
| `server/main.ts` | Add error middleware; remove per-route try/catch; remove lint suppression |
| `server/main.test.ts` | New — integration tests for 500 error paths |
| `docs/bugs/server-main.md` | Mark BUG-003 and BUG-004 fixed |
| `docs/plan-error-middleware.md` | This file — mark implemented |
