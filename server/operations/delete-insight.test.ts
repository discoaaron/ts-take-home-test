import { expect } from "jsr:@std/expect";
import { beforeAll, describe, it } from "jsr:@std/testing/bdd";
import { withDB } from "../testing.ts";
import deleteInsight from "./delete-insight.ts";

describe("deleting an insight from the database", () => {
  describe("insight does not exist", () => {
    withDB((fixture) => {
      let result: boolean;

      beforeAll(() => {
        result = deleteInsight({ ...fixture, id: 99 });
      });

      it("returns false", () => {
        expect(result).toBe(false);
      });
    });
  });

  describe("insight exists", () => {
    withDB((fixture) => {
      let result: boolean;

      beforeAll(() => {
        fixture.insights.insert([
          { brand: 1, createdAt: new Date().toISOString(), text: "To delete" },
          { brand: 2, createdAt: new Date().toISOString(), text: "Keep me" },
        ]);
        result = deleteInsight({ ...fixture, id: 1 });
      });

      it("returns true", () => {
        expect(result).toBe(true);
      });

      it("removes the row from the DB", () => {
        const rows = fixture.insights.selectAll();
        expect(rows.find((r) => r.id === 1)).toBeUndefined();
      });

      it("does not remove other rows", () => {
        const rows = fixture.insights.selectAll();
        expect(rows.find((r) => r.id === 2)).toBeDefined();
      });
    });
  });
});
