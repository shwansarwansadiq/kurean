import { describe, expect, it } from "vitest";
import { latinPart, parseChartList, parseChartPage, periodDates } from "../src/lib/chart";
import { moveLabel, soraniPeriod } from "../src/components/KoreaChart";

const page = `<script>var nationGbn = "T";
            var hitYear = "2026";
            var targetTime = "43";</script>
<option value="202643" selected >2026.10.18~2026.10.24 (43)</option>
<option value="202642"  >2026.10.11~2026.10.17 (42)</option>`;

const row = (o: Record<string, string>) => ({
  ALBUMIMG: "/uploadDir/albumImg/thumb/20261016_19C8.jpg", ALBUM_NAME: "x", ARTIST_NAME: "A", SEQ_MOM: "1",
  SONG_NAME: "S", SERVICE_RANKING: "1", PRE_SERVICE_RANKING: "1", RankStatus: "same", RankChange: "0", ...o,
});

describe("Circle Chart", () => {
  it("reads the week the page shows", () => {
    expect(parseChartPage(page)).toEqual({ year: 2026, week: 43, period: "2026.10.18~2026.10.24" });
    expect(parseChartPage("<html></html>")).toBeNull();
  });
  it("turns the list into ranked entries with movement, top 100 only", () => {
    const list = {
      0: row({ SEQ_MOM: "a", SERVICE_RANKING: "2", PRE_SERVICE_RANKING: "3", RankStatus: "up" }),
      1: row({ SEQ_MOM: "b", SERVICE_RANKING: "1", PRE_SERVICE_RANKING: "1" }),
      2: row({ SEQ_MOM: "c", SERVICE_RANKING: "10", PRE_SERVICE_RANKING: "", RankStatus: "new" }),
      3: row({ SEQ_MOM: "d", SERVICE_RANKING: "15", PRE_SERVICE_RANKING: "11", RankStatus: "down" }),
      4: row({ SEQ_MOM: "e", SERVICE_RANKING: "101", PRE_SERVICE_RANKING: "207", RankStatus: "hot" }),
      5: row({ SEQ_MOM: "f", SERVICE_RANKING: "40", ALBUMIMG: "javascript:alert(1)", SONG_NAME: "It`s Me" }),
    };
    const out = parseChartList({ List: list });
    expect(out.map((e) => [e.id, e.rank, e.move, e.change])).toEqual([
      ["b", 1, "same", 0], ["a", 2, "up", 1], ["c", 10, "new", 0], ["d", 15, "down", 4], ["f", 40, "down", 39],
    ]);
    expect(out[0].cover).toBe("https://circlechart.kr/uploadDir/albumImg/thumb/20261016_19C8.jpg");
    expect(out[4].cover).toBeNull();
    expect(out[4].title).toBe("It’s Me");
    expect(parseChartList({ ErrorMsg: "x" })).toEqual([]);
  });
  it("finds the Latin name Circle Chart gives, and nothing when there is only Korean", () => {
    expect(latinPart("IVE (아이브)")).toBe("IVE");
    expect(latinPart("소연 (SOYEON)")).toBe("SOYEON");
    expect(latinPart("aespa")).toBe("aespa");
    expect(latinPart("로제 (ROSE), Bruno Mars")).toBe("ROSE, Bruno Mars");
    expect(latinPart("한로로")).toBeNull();
    expect(latinPart("퇴사할게여 (Narr. 기안84)")).toBeNull();
  });
  it("writes the week and movement in Sorani", () => {
    expect(periodDates("2026.10.18~2026.10.24")?.from.getUTCDate()).toBe(18);
    expect(soraniPeriod("2026.10.18~2026.10.24")).toBe("١٨ تا ٢٤ی تشرینی یەکەم");
    expect(soraniPeriod("2026.09.27~2026.10.03")).toBe("٢٧ی ئەیلوول تا ٣ی تشرینی یەکەم");
    expect(moveLabel({ move: "up", change: 3 })).toBe("٣ پلە سەرکەوت");
    expect(moveLabel({ move: "new", change: 0 })).toBe("نوێ هاتە ناو چارتەکە");
  });
});
