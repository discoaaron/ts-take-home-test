// deno-lint-ignore-file no-explicit-any
import { Database } from "@db/sqlite";
import * as oak from "@oak/oak";
import * as path from "@std/path";
import { z } from "zod";
import { Port } from "../lib/utils/index.ts";
import listInsights from "./operations/list-insights.ts";
import lookupInsight from "./operations/lookup-insight.ts";
import createInsight from "./operations/create-insight.ts";
import deleteInsight from "./operations/delete-insight.ts";
import { createTable } from "./tables/insights.ts";

console.log("Loading configuration");

const env = {
  port: Port.parse(Deno.env.get("SERVER_PORT")),
};

const dbFilePath = path.resolve("tmp", "db.sqlite3");

console.log(`Opening SQLite database at ${dbFilePath}`);

await Deno.mkdir(path.dirname(dbFilePath), { recursive: true });
const db = new Database(dbFilePath);
db.exec(createTable);

console.log("Initialising server");

const router = new oak.Router();

router.get("/_health", (ctx) => {
  ctx.response.body = "OK";
  ctx.response.status = 200;
});

router.get("/insights", (ctx) => {
  const result = listInsights({ db });
  ctx.response.body = result;
  ctx.response.status = 200;
});

router.get("/insights/:id", (ctx) => {
  const params = ctx.params as Record<string, any>;
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Invalid id" };
    return;
  }
  const result = lookupInsight({ db, id });
  if (!result) {
    ctx.response.status = 404;
    ctx.response.body = { error: "Insight not found" };
    return;
  }
  ctx.response.body = result;
  ctx.response.status = 200;
});

router.post("/insights", async (ctx) => {
  try {
    const body = await ctx.request.body.json();
    const schema = z.object({
      brand: z.number().int().min(0),
      text: z.string().min(1),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Invalid request body" };
      return;
    }
    const result = createInsight({ db, ...parsed.data });
    ctx.response.status = 201;
    ctx.response.body = result;
  } catch {
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
  }
});

router.delete("/insights/:id", (ctx) => {
  try {
    const params = ctx.params as Record<string, any>;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Invalid id" };
      return;
    }
    const deleted = deleteInsight({ db, id });
    if (!deleted) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Insight not found" };
      return;
    }
    ctx.response.status = 204;
  } catch {
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
  }
});

const app = new oak.Application();

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(env);
console.log(`Started server on port ${env.port}`);
