import type { Insight } from "$models/insight.ts";
import type { HasDBClient } from "../shared.ts";
import type * as insightsTable from "$tables/insights.ts";

type Input = HasDBClient & {
  brand: number;
  text: string;
};

export default (input: Input): Insight => {
  console.log("Creating insight");

  const createdAt = new Date().toISOString();

  input.db.sql`INSERT INTO insights (brand, createdAt, text)
               VALUES (${input.brand}, ${createdAt}, ${input.text})`;

  const [row] = input.db
    .sql<insightsTable.Row>`SELECT * FROM insights WHERE id = last_insert_rowid()`;

  const result: Insight = { ...row, createdAt: new Date(row.createdAt) };
  console.log("Created insight:", result);
  return result;
};
