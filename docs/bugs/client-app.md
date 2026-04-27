# Bugs: client/src/routes/app.tsx

## BUG-005 — Wrong type generic on `useState`

**File:** `client/src/routes/app.tsx`  
**Severity:** 🟡 Type error — TypeScript will infer `insights` as `Insight` (single object) not `Insight[]`  
**Status:** ✅ Fixed — commit `2580318`

### Current code
```ts
const [insights, setInsights] = useState<Insight>([]);
```

### Fix
```ts
const [insights, setInsights] = useState<Insight[]>([]);
```

---

## BUG-006 — `res.json()` returns a Promise but is not awaited

**File:** `client/src/routes/app.tsx`  
**Severity:** 🔴 Runtime bug — state is set to a `Promise` object, not the parsed JSON data  
**Status:** ✅ Fixed — commit `2580318`

### Current code
```ts
useEffect(() => {
  fetch(`/api/insights`).then((res) => setInsights(res.json()));
}, []);
```

`res.json()` is async and returns `Promise<any>`. Without awaiting it,
`setInsights` receives a `Promise` — so `insights` in state will be a Promise
object, not an array. Rendering will silently produce no items.

### Fix
```ts
useEffect(() => {
  fetch(`/api/insights`)
    .then((res) => res.json())
    .then((data) => setInsights(data));
}, []);
```

Or with async/await:
```ts
useEffect(() => {
  (async () => {
    const res = await fetch(`/api/insights`);
    setInsights(await res.json());
  })();
}, []);
```
