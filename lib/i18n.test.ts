import { describe, expect, it } from "vitest";
import { formatEventDate } from "./i18n";

describe("formatEventDate", () => {
  it("formats a single day", () => {
    expect(formatEventDate("2026-10-24")).toBe("24 Oktober 2026");
    expect(formatEventDate("2026-10-24", null)).toBe("24 Oktober 2026");
    expect(formatEventDate("2026-10-24", "2026-10-24")).toBe("24 Oktober 2026");
  });

  it("shortens a range within one month", () => {
    expect(formatEventDate("2026-10-24", "2026-10-26")).toBe("24–26 Oktober 2026");
  });

  it("names both months across a month boundary", () => {
    expect(formatEventDate("2026-10-30", "2026-11-02")).toBe("30 Oktober – 2 November 2026");
  });

  it("writes both dates in full across a year boundary", () => {
    expect(formatEventDate("2026-12-30", "2027-01-02")).toBe("30 Desember 2026 – 2 Januari 2027");
  });

  it("ignores an end date before the start", () => {
    expect(formatEventDate("2026-10-24", "2026-10-20")).toBe("24 Oktober 2026");
  });
});
