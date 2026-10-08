import { describe, expect, it } from "vitest";
import { labelize, formatDate, toDateInput, PROJECT_STATUSES, TASK_STATUSES, TASK_PRIORITIES } from "@/lib/constants";

describe("Frontend Constants & Formatting Utilities", () => {
  it("formats status strings into human readable labels", () => {
    expect(labelize("IN_PROGRESS")).toBe("In Progress");
    expect(labelize("NOT_STARTED")).toBe("Not Started");
    expect(labelize("IN_REVIEW")).toBe("In Review");
    expect(labelize("DONE")).toBe("Done");
    expect(labelize(null)).toBe("—");
    expect(labelize(undefined)).toBe("—");
  });

  it("formats ISO dates correctly", () => {
    const formatted = formatDate("2026-12-31T00:00:00.000Z");
    expect(formatted).toMatch(/Dec\s+31,\s+2026/);
    expect(formatDate(null)).toBe("—");
    expect(formatDate("invalid-date-string")).toBe("invalid-date-string");
  });

  it("converts timestamps into input[type=date] values", () => {
    expect(toDateInput("2026-12-31T14:30:00.000Z")).toBe("2026-12-31");
    expect(toDateInput(null)).toBe("");
    expect(toDateInput(undefined)).toBe("");
  });

  it("contains the exact valid PostgreSQL enum subsets", () => {
    expect(PROJECT_STATUSES).toContain("NOT_STARTED");
    expect(PROJECT_STATUSES).toContain("IN_PROGRESS");
    expect(PROJECT_STATUSES).toContain("COMPLETED");

    expect(TASK_STATUSES).toContain("TODO");
    expect(TASK_STATUSES).toContain("IN_PROGRESS");
    expect(TASK_STATUSES).toContain("DONE");

    expect(TASK_PRIORITIES).toContain("LOW");
    expect(TASK_PRIORITIES).toContain("MEDIUM");
    expect(TASK_PRIORITIES).toContain("HIGH");
  });
});
