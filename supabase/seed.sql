-- Starting sources (from the Kurean plan). Feed URLs should be checked once after setup;
-- the dashboard will flag any feed that goes quiet.
insert into sources (name, feed_url, site_url, category_hint, trust) values
  ('Soompi', 'https://www.soompi.com/feed', 'https://www.soompi.com', 'mixed', 2),
  ('Yonhap News', 'https://en.yna.co.kr/RSS/news.xml', 'https://en.yna.co.kr', 'korea_news', 3),
  ('Korea Herald', 'https://www.koreaherald.com/rss/newsAll', 'https://www.koreaherald.com', 'mixed', 3),
  ('Korea Times', 'https://feed.koreatimes.co.kr/k/allnews.xml', 'https://www.koreatimes.co.kr', 'mixed', 3),
  ('Korea.net Culture', 'https://www.korea.net/koreanet/rss/news/7', 'https://www.korea.net', 'culture', 3),
  ('Korea.net Food and Travel', 'https://www.korea.net/koreanet/rss/news/8', 'https://www.korea.net', 'culture', 3),
  ('SBS Star', 'https://sbsstar.net/rssfeed.xml', 'https://sbsstar.net', 'mixed', 3),
  -- allkpop is fast but gossip-heavy: low trust, so sensitive stories need a second source
  ('allkpop', 'https://www.allkpop.com/rss_xml/lab.php', 'https://www.allkpop.com', 'kpop', 1)
on conflict (feed_url) do nothing;

-- These feeds block automated readers, so they stay paused rather than being worked around.
update sources set active = false where name in ('Korea Times', 'Korea.net Culture', 'Korea.net Food and Travel');

-- Checked and not added: Koreaboo (mostly clickbait gossip), Hancinema (bot check blocks automated readers).
-- Korea JoongAng Daily and KBS World have no confirmed public feed yet.

-- First 30 glossary terms (from the Glossary tab of the plan)
insert into glossary (english, sorani, note) values
  ('comeback', 'گەڕانەوە', 'A group''s new release after a break'),
  ('debut', 'یەکەم دەرکەوتن', 'Or دێبیو in casual captions'),
  ('idol', 'ئایدۆڵ', 'K-pop performer'),
  ('fan', 'هەوادار', 'Plural هەواداران'),
  ('fandom', 'کۆمەڵەی هەواداران', 'فاندۆم allowed in casual social captions'),
  ('fan meeting', 'دیداری هەواداران', null),
  ('light stick', 'لایت ستیک', 'Kept as the English loanword'),
  ('album', 'ئەلبووم', null),
  ('mini album', 'مینی ئەلبووم', null),
  ('single', 'سینگڵ', 'Or تاکە گۆرانی'),
  ('music video (MV)', 'ڤیدیۆ کلیپ', null),
  ('teaser', 'تیزەر', 'Short preview before a release'),
  ('chart', 'لیستی گۆرانی', 'e.g. Billboard, Melon'),
  ('concert', 'کۆنسێرت', null),
  ('world tour', 'گەشتی جیهانی', null),
  ('agency', 'کۆمپانیای بەڕێوەبردن', 'e.g. HYBE, SM, JYP, YG'),
  ('trainee', 'ڕاهێنراو', 'Idol in training before debut'),
  ('leader', 'لیدەری گرووپ', null),
  ('maknae', 'ماکنە', 'Youngest member; explain once per article'),
  ('military enlistment', 'خزمەتی سەربازی', 'Male idols and actors in Korea'),
  ('award show', 'ئاهەنگی خەڵاتبەخشین', 'e.g. MAMA, Melon Music Awards'),
  ('Hallyu (Korean Wave)', 'شەپۆلی کۆری', 'Add هالیو in brackets the first time'),
  ('K-drama', 'درامای کۆری', null),
  ('episode', 'ئەڵقە', null),
  ('season', 'وەرز', null),
  ('lead role', 'ڕۆڵی سەرەکی', null),
  ('cast', 'ئەکتەرانی زنجیرەکە', 'For films: ئەکتەرانی فیلمەکە'),
  ('ratings (viewership)', 'ڕێژەی بینەر', 'TV audience share'),
  ('premiere', 'نمایشی یەکەم', null),
  ('streaming platform', 'پلاتفۆرمی ستریمینگ', 'e.g. Netflix, Disney+')
on conflict (english) do update set sorani = excluded.sorani, note = excluded.note, updated_at = now();
