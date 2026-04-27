# Bug: Server/Client Schema Field Name Mismatch

**Files:** `server/models/insight.ts`, `client/src/schemas/insight.ts`  
**Severity:** 🔴 Runtime bug — every insight fetched from the API will have `brandId: undefined` and `date: undefined` on the client

## Description

The server and client define the `Insight` type independently with different field names:

| Server (`server/models/insight.ts`) | Client (`client/src/schemas/insight.ts`) |
|---|---|
| `brand: number` | `brandId: number` |
| `createdAt: Date` | `date: Date` |
| `id: number` | `id: number` |
| `text: string` | `text: string` |

When the server serialises an insight to JSON, it sends `{ brand, createdAt, ... }`.
The client receives this and tries to use `brandId` and `date`, both of which will be
`undefined`. The `Insights` component renders brand and date from these fields — so
they will always be blank regardless of what the server returns.

## Options

### Option A — Align server model to match client schema (recommended)
Rename the server model fields to `brandId` and `date` to match the client.
Also rename the DB columns (or add a mapping layer in the operations) since the
DB uses `brand` and `createdAt`.

Pros: client schema is the "public contract"; server adapts to it.

### Option B — Align client schema to match server model
Rename `brandId` → `brand` and `date` → `createdAt` in `client/src/schemas/insight.ts`
and update all client code that references those fields.

Pros: minimal server-side changes; DB column names stay correct.

### Option C — Transform in the server route handler
Keep both schemas as-is but map the fields when serialising the response:
```ts
router.get("/insights", (ctx) => {
  const result = listInsights({ db });
  ctx.response.body = result.map(({ brand, createdAt, ...rest }) => ({
    ...rest,
    brandId: brand,
    date: createdAt,
  }));
  ctx.response.status = 200;
});
```

Pros: no schema file changes needed, explicit transformation in one place.  
Cons: every endpoint that returns an insight needs to apply the same mapping.

## Recommendation
Option B is least disruptive — the DB schema and server model are consistent and
only client-side names need updating. The client schema was probably written to
match a future API contract that never landed.
