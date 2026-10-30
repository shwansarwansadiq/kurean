# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Readers:** Kurdish K-pop, K-drama and Korean-culture fans aged 15–30 in the Kurdistan Region and the
  diaspora, reading Sorani. Most arrive from social links (Instagram, TikTok, Facebook link in bio and story
  links) and read on a phone, often in a short spare moment.
- **Editor:** Shwan, the owner, who approves every story before it is published, usually from his phone.

## Product Purpose

KUREAN (کوریەن) brings daily Korean pop-culture news to Kurdish fans in their own language. A pipeline
collects headlines from trusted English-language sources, writes original Sorani articles, and holds them
for Shwan's approval; approved stories appear on kurean.news and on social media.

Success for the website: a reader finishes the story, reads another, and follows @kurean.news.

## Positioning

Korean news written natively in Sorani (not machine-translated copies), fast, combined from several trusted
sources and credited to every one of them, with a human approving each story.

## Operating Context

- Readers land on one story from a social post, often via a short link `kurean.news/n/<id>`.
- Shwan works through a queue of pending stories: approve, edit, regenerate or skip.
- Korea is 6 hours ahead of Kurdistan (KST, UTC+9 vs UTC+3); K-dramas air in the Korean evening.

## Capabilities and Constraints

- Read only at launch: no reader accounts, comments, search or share buttons.
- Content categories: K-pop, K-drama & film, culture & lifestyle, Korea news.
- Stories are text only; no press photos unless clearly official press material. Branded cards stand in.
- Sorani, right to left, first; group and artist names in Latin letters with Sorani in brackets.
- Stack: Next.js on Vercel, Supabase; see CLAUDE.md.

## Brand Commitments

- Display name KUREAN on every platform; handle @kurean.news; Sorani name کوریەن; domain kurean.news.
- Approved logo: lowercase "kurean" wordmark ("kur" plum, "ean" berry) with the line-art Korean finger heart
  and a berry heart ringed by the 21 gold rays of the Kurdish sun.
- Brand colours, fonts and style are binding: see CLAUDE.md → Brand.
- Voice: a friendly, well-informed fan friend; accurate; no rumours as facts.

## Evidence on Hand

- Real stories in Supabase (`stories` table), with sources per story.
- No photographs of our own, no testimonials, no audience numbers, no press. Never invent any.

## Product Principles

1. The reader came for one story: give it to them fast, then offer the next.
2. Every fact is credited; trust is the product.
3. Kurdish first: it should feel made in Kurdistan for Kurds, not translated.
4. Nothing reaches the public without Shwan's approval.
