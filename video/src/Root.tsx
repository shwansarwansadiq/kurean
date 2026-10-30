import { Composition } from "remotion";
import { Chart, CHART_FRAMES, type ChartProps } from "./Chart";
import { News, NEWS_FRAMES, type NewsProps } from "./News";

const sampleNews: NewsProps = {
  headline: "تیزەری درامای «Nine to Six» بڵاوکرایەوە و Park Bo Gum ڕۆڵی سەرەکی دەگێڕێت",
  points: ["تیزەری یەکەم ئەمڕۆ بڵاوکرایەوە.", "پەخشی یەکەم: چوارشەممە ٢٥ی تشرینی دووەم.", "٩ی شەو لە کۆریا، ٣ی پاشنیوەڕۆ لە هەولێر."],
  image: "test.jpg",
  label: "دراما و فیلم",
  colour: "#9B7BEA",
};

const sampleChart: ChartProps = {
  week: 43,
  top: [
    { rank: 1, title: "NEON", artist: "A2O, A2O LITE", artist_ckb: "ئەی تو ئۆ", move: "same", change: 0 },
    { rank: 2, title: "Toesahalgeyeo (Narr. Gian84)", artist: "SOYEON", artist_ckb: "سۆیۆن", move: "up", change: 1 },
    { rank: 3, title: "Kkumkkudeon Eorireun Doeeotnayo?", artist: "Meomureu", artist_ckb: "مەمورو", move: "up", change: 2 },
    { rank: 4, title: "LOVE ATTACK", artist: "RESCENE", artist_ckb: "ڕیسین", move: "same", change: 0 },
    { rank: 5, title: "Deja Vu", artist: "RESCENE", artist_ckb: "ڕیسین", move: "up", change: 2 },
    { rank: 6, title: "REDRED", artist: "CORTIS", artist_ckb: "کۆرتیس", move: "down", change: 1 },
    { rank: 7, title: "Gapjagi", artist: "I.O.I", artist_ckb: "ئای ئۆ ئای", move: "down", change: 1 },
    { rank: 8, title: "BAD", artist: "ATEEZ", artist_ckb: "ئەیتیز", move: "up", change: 2 },
    { rank: 9, title: "Pretty Girl", artist: "RESCENE", artist_ckb: "ڕیسین", move: "down", change: 1 },
    { rank: 10, title: "Looks Can Kill", artist: "IVE", artist_ckb: "ئایڤ", move: "new", change: 0 },
  ],
};

export function Root() {
  return (
    <>
      <Composition id="News" component={News} durationInFrames={NEWS_FRAMES} fps={30} width={1080} height={1920} defaultProps={sampleNews} />
      <Composition id="Chart" component={Chart} durationInFrames={CHART_FRAMES} fps={30} width={1080} height={1920} defaultProps={sampleChart} />
    </>
  );
}
