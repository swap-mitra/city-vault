import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("sprint 2 migration", () => {
  it("backfills records and record versions from the legacy file table", () => {
    const sql = readFileSync(
      "prisma/migrations/20260415093000_sprint2_records_core/migration.sql",
      "utf8"
    );

    expect(sql).toContain('INSERT INTO "public"."Record"');
    expect(sql).toContain('FROM "public"."File"');
    expect(sql).toContain('INSERT INTO "public"."RecordVersion"');
    expect(sql).toContain(`CONCAT("id", '_v1')`);
  });
});
