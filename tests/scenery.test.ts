import { describe, expect, it } from "vitest";
import { namesPlace, photoCandidate, pixabayCandidate, videoCandidate } from "../src/lib/scenery";
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

describe("scenery from Pixabay", () => {
  const v = {
    id: 5, pageURL: "https://pixabay.com/videos/gyeongbokgung-palace-seoul-5/", tags: "gyeongbokgung, palace, seoul", duration: 12,
    user: "seoulwalker", user_id: 77,
    videos: {
      large: { url: "large.mp4", width: 2160, height: 3840 },
      medium: { url: "medium.mp4", width: 1080, height: 1920 },
      small: { url: "small.mp4", width: 720, height: 1280 },
    },
  };
  it("takes the smallest full-HD vertical file of a video that names the place", () => {
    const c = pixabayCandidate(v, palace)!;
    expect(c.url).toBe("medium.mp4");
    expect(c.source).toBe("pixabay");
    expect(c.photographer_url).toBe("https://pixabay.com/users/seoulwalker-77/");
  });
  it("takes wide 4K (cropped to its centre) but refuses wide full HD and other places", () => {
    expect(pixabayCandidate({ ...v, videos: { large: { url: "w4k.mp4", width: 3840, height: 2160 } } }, palace)?.url).toBe("w4k.mp4");
    expect(pixabayCandidate({ ...v, videos: { large: { url: "w.mp4", width: 1920, height: 1080 } } }, palace)).toBeNull();
    expect(pixabayCandidate({ ...v, tags: "temple, kyoto", pageURL: "https://pixabay.com/videos/temple-5/" }, palace)).toBeNull();
  });
});
