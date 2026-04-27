# Miscellaneous Bugs & Quality Issues

## BUG-007 — Typo in `vite.config.ts`: `servereBaseUrl`

**File:** `client/vite.config.ts`  
**Severity:** 🟡 Latent bug — silently produces `"undefined"` if the correctly-spelled name is ever referenced

### Current code
```ts
const env = {
  clientPort: Port.parse(Deno.env.get("CLIENT_PORT")),
  servereBaseUrl: String(Deno.env.get("SERVER_BASE_URL")),  // ← extra 'e'
  serverPort: Port.parse(Deno.env.get("SERVER_PORT")),
};
```

### Fix
```ts
serverBaseUrl: String(Deno.env.get("SERVER_BASE_URL")),
```

---

## BUG-008 — Test fixtures missing `id` field for `Insight` type

**Files:** `server/operations/list-insights.test.ts`, `server/operations/lookup-insight.test.ts`  
**Severity:** 🟢 Code quality — tests pass today but assert against data that doesn't fully match the type contract

The `Insight` Zod schema requires `id: z.number().int().min(0)`.
Test fixture objects include `id`, so that's fine on the server.

However, `client/src/components/insights/insights.test.tsx` defines fixtures without `id`:
```ts
const TEST_INSIGHTS = [
  { brandId: 1, date: new Date(), text: "Test insight" },
  { brandId: 2, date: new Date(), text: "Another test insight" },
];
```

This means `render(<Insights insights={TEST_INSIGHTS} />)` is passing data that doesn't
satisfy `Insight[]` — TypeScript should catch this if strict checking is applied to the
test file. The `key={id}` in the component would also render as `key={undefined}`,
causing React key warnings.

### Fix
Add `id` to the test fixtures:
```ts
const TEST_INSIGHTS = [
  { id: 1, brandId: 1, date: new Date(), text: "Test insight" },
  { id: 2, brandId: 2, date: new Date(), text: "Another test insight" },
];
```

---

## BUG-009 — `insights` list items have no `key` warning potential

**File:** `client/src/components/add-insight/add-insight.tsx`  
**Severity:** 🟢 Code quality — missing `key` prop on list items

```tsx
{BRANDS.map(({ id, name }) => <option value={id}>{name}</option>)}
```

React requires a `key` prop on elements produced by `.map()`. Without it, React
cannot efficiently reconcile the list, and a console warning is emitted.

### Fix
```tsx
{BRANDS.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
```
