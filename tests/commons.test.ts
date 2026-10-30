import { describe, expect, it } from "vitest";
import { isAllowedLicense, normName, photoSubjects, scoreFile, type CommonsFile } from "../src/lib/commons";
import { looksLikeAgencyPhoto } from "../src/lib/photo";

const file = (over: Partial<CommonsFile>): CommonsFile => ({
  title: "File:Park Bo-gum at an event in 2025.jpg",
  width: 3000,
  height: 2000,
  mime: "image/jpeg",
  thumburl: "https://upload.wikimedia.org/x.jpg",
  descriptionurl: "https://commons.wikimedia.org/wiki/File:x.jpg",
  license: "CC BY 3.0",
  artist: "TenAsia",
  date: "2025-05-01",
  ...over,
});

describe("same person, by name", () => {
  it("treats spelling variants of one name as the same", () => {
    expect(normName("Park Bo Gum")).toBe(normName("Park Bo-gum"));
    expect(normName("KATSEYE")).toBe(normName("Katseye"));
  });
  it("needs the subject named in the file title", () => {
    expect(scoreFile(file({}), "Park Bo Gum", 2026)).not.toBeNull();
    expect(scoreFile(file({ title: "File:Bae Suzy in 2025.jpg" }), "Park Bo Gum", 2026)).toBeNull();
  });
});

describe("photo quality and licence", () => {
  it("rejects small photos, signatures and non-free licences", () => {
    expect(scoreFile(file({ width: 800, height: 600 }), "Park Bo-gum", 2026)).toBeNull();
    expect(scoreFile(file({ title: "File:Park Bo-gum Signature.png", mime: "image/png" }), "Park Bo-gum", 2026)).toBeNull();
    expect(isAllowedLicense("CC BY-NC 4.0")).toBe(false);
    expect(isAllowedLicense("CC BY-SA 4.0")).toBe(true);
    expect(isAllowedLicense("Public domain")).toBe(true);
    expect(isAllowedLicense("CC0")).toBe(true);
  });
  it("prefers recent solo photos", () => {
    const solo = scoreFile(file({}), "Park Bo-gum", 2026)!;
    const group = scoreFile(file({ title: "File:Park Bo-gum, Bae Suzy and Choi Woo-shik in 2025.jpg" }), "Park Bo-gum", 2026)!;
    const old = scoreFile(file({ date: "2016-01-01", title: "File:Park Bo-gum in 2016.jpg" }), "Park Bo-gum", 2026)!;
    expect(solo).toBeGreaterThan(group);
    expect(solo).toBeGreaterThan(old);
  });
});

describe("photoSubjects", () => {
  it("keeps names and drops quoted titles and years", () => {
    expect(photoSubjects(["Claudia Kim", "«Sacred Jewel»"])).toEqual(["Claudia Kim"]);
    expect(photoSubjects(["MAMA 2026"])).toEqual(["MAMA"]);
  });
});

describe("looksLikeAgencyPhoto", () => {
  it("spots agency addresses and embedded credits", () => {
    expect(looksLikeAgencyPhoto("https://img.yna.co.kr/photo/x.jpg")).toBe(true);
    const bytes = new TextEncoder().encode("....Copyright: Newsen ....");
    expect(looksLikeAgencyPhoto("https://cdn.example.com/a.jpg", bytes)).toBe(true);
    expect(looksLikeAgencyPhoto("https://cdn.example.com/a.jpg", new TextEncoder().encode("plain"))).toBe(false);
  });
});
