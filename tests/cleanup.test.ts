import { describe, expect, it } from "vitest";
import { unusedVideos } from "../src/lib/cleanup";

describe("unusedVideos", () => {
  const now = Date.parse("2026-11-19T12:00:00Z");
  const old = "2026-11-10T00:00:00Z";
  it("removes only old files nothing points to", () => {
    const files = [
      { name: "story-1-aaaa.mp4", created_at: old, metadata: null },
      { name: "story-1-bbbb.mp4", created_at: old, metadata: null },
      { name: "story-2-cccc.mp4", created_at: "2026-11-19T10:00:00Z", metadata: null },
      { name: ".emptyFolderPlaceholder", created_at: old, metadata: null },
    ];
    const out = unusedVideos(files, new Set(["story-1-bbbb.mp4"]), now).map((f) => f.name);
    expect(out).toEqual(["story-1-aaaa.mp4"]);
  });
});
