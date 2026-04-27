import { expect } from "jsr:@std/expect";
import { beforeAll, describe, it } from "jsr:@std/testing/bdd";
import type { Insight } from "$models/insight.ts";
import { withDB } from "../testing.ts";
import createInsight from "./create-insight.ts";

describe("creating an insight in the database", () => {
  describe("inserting a new insight", () => {
    withDB((fixture) => {
      let result: Insight;

      beforeAll(() => {
        result = createInsight({ ...fixture, brand: 3, text: "Test insight" });
      });

      it("returns the created insight", () => {
        expect(result).toMatchObject({ brand: 3, text: "Test insight" });
      });

      it("assigns an id", () => {
        expect(typeof result.id).toBe("number");
      });

      it("assigns a createdAt date", () => {
        expect(result.createdAt).toBeInstanceOf(Date);
      });

      it("persists the row to the DB", () => {
        const rows = fixture.insights.selectAll();
        expect(rows.length).toBe(1);
        expect(rows[0].brand).toBe(3);
        expect(rows[0].text).toBe("Test insight");
      });
    });
  });

  describe("inserting multiple insights", () => {
    withDB((fixture) => {
      let first: Insight;
      let second: Insight;

      beforeAll(() => {
        first = createInsight({ ...fixture, brand: 1, text: "First" });
        second = createInsight({ ...fixture, brand: 2, text: "Second" });
      });

      it("assigns distinct ids", () => {
        expect(first.id).not.toBe(second.id);
      });

      it("persists both rows to the DB", () => {
        expect(fixture.insights.selectAll().length).toBe(2);
      });
    });
  });
});
