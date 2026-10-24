import { describe, expect, it } from "vitest";
import type { FieldDef } from "@/lib/forms";
import { summarize } from "./responses";

const q = (over: Partial<FieldDef> & Pick<FieldDef, "key" | "type">): FieldDef => ({ label: over.key, required: false, options: [], ...over });

describe("summarize", () => {
  it("skips the name and email questions", () => {
    const s = summarize([q({ key: "name", type: "short_text", role: "name" }), q({ key: "email", type: "email", role: "email" })], [{}]);
    expect(s).toEqual([]);
  });

  it("counts choices in option order and ignores answers that no longer match", () => {
    const [s] = summarize([q({ key: "peran", type: "radio", options: ["Guru", "Siswa"] })], [{ peran: "Siswa" }, { peran: "Guru" }, { peran: "Siswa" }, { peran: "Kepala" }, {}]);
    expect(s).toMatchObject({ kind: "counts", answered: 3, buckets: [{ label: "Guru", count: 1 }, { label: "Siswa", count: 2 }] });
  });

  it("counts each checked box, but each person once in answered", () => {
    const [s] = summarize([q({ key: "topik", type: "checkbox", options: ["A", "B", "C"] })], [{ topik: ["A", "B"] }, { topik: ["B"] }]);
    expect(s).toMatchObject({ answered: 2, buckets: [{ label: "A", count: 1 }, { label: "B", count: 2 }, { label: "C", count: 0 }] });
  });

  it("buckets a linear scale over its whole range", () => {
    const [s] = summarize([q({ key: "puas", type: "scale", config: { min: 1, max: 3 } })], [{ puas: "3" }, { puas: "3" }, { puas: "9" }]);
    expect(s).toMatchObject({ answered: 2, buckets: [{ label: "1", count: 0 }, { label: "2", count: 0 }, { label: "3", count: 2 }] });
  });

  it("lists the latest text answers first, at most 10", () => {
    const responses = Array.from({ length: 12 }, (_, i) => ({ saran: `saran ${i}` }));
    const [s] = summarize([q({ key: "saran", type: "paragraph" })], responses);
    expect(s).toMatchObject({ kind: "list", answered: 12 });
    if (s.kind === "list") expect(s.latest).toEqual(Array.from({ length: 10 }, (_, i) => `saran ${11 - i}`));
  });
});
