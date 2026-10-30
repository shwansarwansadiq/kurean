import { describe, expect, it } from "vitest";
import { artistNames, keyWords, pickTrack, scoreVideo } from "../src/lib/listen";

const ive = { titles: ["Looks Can Kill"], artists: artistNames("IVE (아이브)", "IVE") };
const kr = { titles: ["사랑하게 될 거야", "Saranghage Doel Geoya"], artists: artistNames("한로로", "Hanroro") };

describe("finding the official video", () => {
  it("reads artist names from chart lines", () => {
    expect(artistNames("로제 (ROSE), Bruno Mars")).toEqual(["로제", "rose", "bruno mars"]);
    expect(artistNames("IVE (아이브)", "IVE")).toEqual(["ive", "아이브"]);
    expect(keyWords("긴 소원 (Birthday Wish)")).toEqual(["긴", "소원", "birthday", "wish"]);
    expect(keyWords("HOME SWEET HOME (feat. 태양, 대성)")).toEqual(["home", "sweet", "home"]);
  });
  it("accepts the artist's own channel and label channels, preferring the MV", () => {
    const mv = scoreVideo({ videoId: "a", title: "IVE 아이브 'Looks Can Kill' MV", channelTitle: "IVE" }, ive);
    const topic = scoreVideo({ videoId: "b", title: "Looks Can Kill", channelTitle: "IVE - Topic" }, ive);
    const label = scoreVideo({ videoId: "c", title: "[MV] IVE(아이브) _ Looks Can Kill", channelTitle: "1theK (원더케이)" }, ive);
    expect(mv).not.toBeNull();
    expect(topic).not.toBeNull();
    expect(label).not.toBeNull();
    expect(mv!).toBeGreaterThan(topic!);
  });
  it("refuses fan uploads, covers, lyrics, fancams and other songs", () => {
    expect(scoreVideo({ videoId: "d", title: "IVE - Looks Can Kill (Lyrics)", channelTitle: "IVE" }, ive)).toBeNull();
    expect(scoreVideo({ videoId: "e", title: "Looks Can Kill MV", channelTitle: "kpopfan123" }, ive)).toBeNull();
    expect(scoreVideo({ videoId: "f", title: "IVE Looks Can Kill dance cover", channelTitle: "1theK" }, ive)).toBeNull();
    expect(scoreVideo({ videoId: "g", title: "IVE 'BANG BANG' MV", channelTitle: "IVE" }, ive)).toBeNull();
    expect(scoreVideo({ videoId: "h", title: "[직캠] IVE Looks Can Kill", channelTitle: "IVE" }, ive)).toBeNull();
  });
  it("matches Korean titles in either spelling", () => {
    expect(scoreVideo({ videoId: "i", title: "[MV] 한로로 - 사랑하게 될 거야", channelTitle: "한로로" }, kr)).not.toBeNull();
    expect(scoreVideo({ videoId: "j", title: "HANRORO 'Saranghage Doel Geoya' Official MV", channelTitle: "HANRORO" }, kr)).not.toBeNull();
    expect(scoreVideo({ videoId: "k", title: "teaser | 사랑하게 될 거야", channelTitle: "한로로" }, kr)).toBeLessThan(50);
  });
});

describe("finding the Spotify track", () => {
  const song = { id: "1", title: "긴 소원 (Birthday Wish)", artist: "NMIXX", title_latin: "Gin Sowon (Birthday Wish)", artist_latin: "NMIXX" };
  it("needs both the artist and the title to match", () => {
    expect(pickTrack([{ id: "x", name: "Birthday Wish", artists: [{ name: "Someone" }] }], song)).toBeNull();
    expect(pickTrack([{ id: "y", name: "긴 소원 (Birthday Wish)", artists: [{ name: "NMIXX" }] }], song)).toBe("y");
    expect(pickTrack([{ id: "z", name: "Looks Can Kill", artists: [{ name: "IVE" }] }], { id: "2", title: "Looks Can Kill", artist: "IVE (아이브)", title_latin: "Looks Can Kill", artist_latin: "IVE" })).toBe("z");
  });
});
