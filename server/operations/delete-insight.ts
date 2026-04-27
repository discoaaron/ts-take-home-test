import type { HasDBClient } from "../shared.ts";

type Input = HasDBClient & {
  id: number;
};

export default (input: Input): boolean => {
  console.log(`Deleting insight id=${input.id}`);

  input.db.sql`DELETE FROM insights WHERE id = ${input.id}`;

  const deleted = input.db.changes > 0;
  console.log(deleted ? "Insight deleted" : "Insight not found");
  return deleted;
};
