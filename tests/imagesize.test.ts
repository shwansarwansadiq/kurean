import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { imageSize } from "../src/lib/imagesize";

const dir = mkdtempSync(join(tmpdir(), "kr-img-"));
const make = (name: string, w: number, h: number) => {
  const out = join(dir, name);
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "lavfi", "-i", `color=c=pink:s=${w}x${h}`, "-frames:v", "1", out]);
  return new Uint8Array(readFileSync(out));
};
let hasFfmpeg = true;
try { execFileSync("ffmpeg", ["-version"]); } catch { hasFfmpeg = false; }

describe.skipIf(!hasFfmpeg)("imageSize", () => {
  it("reads JPEG, PNG and WebP sizes", () => {
    expect(imageSize(make("a.jpg", 300, 200))).toEqual({ width: 300, height: 200 });
    expect(imageSize(make("a.png", 1280, 720))).toEqual({ width: 1280, height: 720 });
    expect(imageSize(make("a.webp", 1600, 900))).toEqual({ width: 1600, height: 900 });
  });
  it("returns null for other data", () => {
    expect(imageSize(new TextEncoder().encode("not an image"))).toBeNull();
  });
});
