import { describe, expect, it } from "vitest";
import { extractCollection } from "./api";

describe("extractCollection", () => {
  it("membaca array langsung", () => {
    expect(extractCollection<number>([1, 2])).toEqual([1, 2]);
  });

  it("membaca collection dari data.items", () => {
    expect(extractCollection<{ code: string }>({ data: { items: [{ code: "PRD-1" }] } })).toEqual([
      { code: "PRD-1" },
    ]);
  });

  it("mendukung key collection yang diberi nama", () => {
    expect(extractCollection<string>({ products: ["A"] }, ["products"])).toEqual(["A"]);
  });

  it("mengembalikan array kosong untuk payload tidak dikenal", () => {
    expect(extractCollection({ message: "ok" })).toEqual([]);
  });
});
