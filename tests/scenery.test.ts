import { describe, expect, it } from "vitest";
import { namesPlace, photoCandidate, videoCandidate } from "../src/lib/scenery";
import { PLACES } from "../src/lib/places";

const palace = PLACES.find((p) => p.en.startsWith("Gyeongbokgung"))!;
const photo = (o: Partial<Parameters<typeof photoCandidate>[0]> = {}) => ({
  id: 1, width: 3000, height: 4500, url: "https://www.pexels.com/photo/gyeongbokgung-palace-in-autumn-123/", alt: "Gyeongbokgung Palace in autumn",
  photographer: "A B", photographer_url: "https://pexels.com/@ab", src: { original: "https://images.pexels.com/1.jpeg" }, ...o,
});

describe("scenery candidates from Pexels", () => {
  it("only takes pictures whose description names the place", () => {
    expect(namesPlace("Gyeongbokgung Palace in autumn", palace)).toBe(true);
    expect(namesPlace("A temple in Kyoto, Japan", palace)).toBe(false);
    expect(photoCandidate(photo(), palace)?.place_ckb).toBe("کۆشکی گیۆنگبۆکگونگ، سیئۆڵ");
    expect(photoCandidate(photo({ alt: "Old palace in Beijing", url: "https://www.pexels.com/photo/palace-99/" }), palace)).toBeNull();
  });
  it("only takes sharp vertical pictures", () => {
    expect(photoCandidate(photo({ width: 4500, height: 3000 }), palace)).toBeNull();
    expect(photoCandidate(photo({ width: 800, height: 1400 }), palace)).toBeNull();
  });
  it("picks the smallest full-HD vertical file of a clip", () => {
    const v = {
      id: 9, width: 2160, height: 3840, duration: 14, url: "https://www.pexels.com/video/gyeongbokgung-at-night-9/", user: { name: "C D", url: "https://pexels.com/@cd" },
      video_files: [
        { link: "sd.mp4", width: 540, height: 960, file_type: "video/mp4", quality: "sd" },
        { link: "hd.mp4", width: 1080, height: 1920, file_type: "video/mp4", quality: "hd" },
        { link: "uhd.mp4", width: 2160, height: 3840, file_type: "video/mp4", quality: "uhd" },
      ],
    };
    expect(videoCandidate(v, palace)?.url).toBe("hd.mp4");
    expect(videoCandidate({ ...v, duration: 4 }, palace)).toBeNull();
    expect(videoCandidate({ ...v, video_files: v.video_files.slice(0, 1) }, palace)).toBeNull();
  });
});
