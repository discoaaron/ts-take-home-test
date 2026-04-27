# Bugs: server/main.ts

## BUG-001 — `/insights` route overwrites body instead of setting status

**File:** `server/main.ts`  
**Severity:** 🔴 Runtime bug — response body is overwritten with `200`, actual data is lost  
**Status:** ✅ Fixed — commit `2580318`

### Current code
```ts
router.get("/insights", (ctx) => {
  const result = listInsights({ db });
  ctx.response.body = result;
  ctx.response.body = 200;  // ← overwrites result with the number 200
});
```

### Fix
```ts
router.get("/insights", (ctx) => {
  const result = listInsights({ db });
  ctx.response.body = result;
  ctx.response.status = 200;
});
```

---

## BUG-002 — `lookupInsight` receives `id` as `string` instead of `number`

**File:** `server/main.ts`  
**Severity:** 🟡 Type mismatch — `ctx.params.id` is always a `string`, but `lookupInsight` declares `id: number`  
**Status:** ✅ Fixed — commit `2580318` (`parseInt` + `isNaN` guard + 404 when not found)

SQLite coerces the value so it works in practice today, but creates a divergence between
tests (which pass real numbers) and runtime (which passes strings). Any numeric comparison
or strict equality check in future code would silently fail.

### Current code
```ts
router.get("/insights/:id", (ctx) => {
  const params = ctx.params as Record<string, any>;
  const result = lookupInsight({ db, id: params.id });
  //                                    ^^^^^^^^^ string, not number
```

### Fix
Parse and validate the `id` param before passing it through:
```ts
router.get("/insights/:id", (ctx) => {
  const id = parseInt(ctx.params.id, 10);
  if (isNaN(id)) {
    ctx.response.status = 400;
    return;
  }
  const result = lookupInsight({ db, id });
  ctx.response.body = result ?? null;
  ctx.response.status = result ? 200 : 404;
});
```
This also fixes the missing 404 when an insight is not found.

---

## BUG-003 — Broad lint suppression masks real issues

**File:** `server/main.ts` (line 1)  
**Severity:** 🟢 Code quality  
**Status:** ⏳ Not yet addressed

```ts
// deno-lint-ignore-file no-explicit-any
```

This suppresses `any` warnings for the entire file, but `any` is only used once
(for `ctx.params`). Once BUG-002 is fixed by properly typing/parsing `ctx.params.id`,
the suppression comment can be removed entirely.

---

## BUG-004 — No error handling on route handlers

**File:** `server/main.ts`  
**Severity:** 🟢 Code quality / resilience  
**Status:** ✅ Partially fixed — commit `2580318` (try/catch added to POST and DELETE routes; GET routes still unguarded)

If `listInsights` or `lookupInsight` throw (e.g. DB error, schema parse failure),
Oak will catch it and return a 500 with an HTML error page. Callers receive no
structured error body and the server logs nothing meaningful.

### Fix
Wrap handler bodies in try/catch and return a structured JSON error:
```ts
router.get("/insights", (ctx) => {
  try {
    ctx.response.body = listInsights({ db });
    ctx.response.status = 200;
  } catch (err) {
    console.error("Failed to list insights", err);
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
  }
});
```
