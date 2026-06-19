# Frontend Agent — Response

**Completed:** 2026-06-19T03:?? (investigation)
**Result:** No code change — the reported bug is not present. Locale-aware display already works correctly in the current code and in production.

## TL;DR
EN locale renders **only** `key_insight` (English); ZH locale renders **only** `key_insight_zh` (Chinese); never both. This is already true on `/youtube-insights` and the home "Latest insights" strip, in production right now. No PR was opened because there is nothing to change. (This was implemented in PR #25 and preserved in PR #27.)

## What the current code does
- `apps/web/app/youtube-insights/page.tsx` → `DigestCard` renders a single paragraph:
  ```
  const text = locale === 'zh'
    ? insight.key_insight_zh ?? insight.key_insight
    : insight.key_insight ?? insight.key_insight_zh;
  ...
  {text && <p ...>{hot && '🔥'}{text}</p>}
  ```
  There is exactly one summary `<p>` per card — no second `key_insight_zh` block.
- `apps/web/components/home-content.tsx` → `InsightCard` has the identical single-paragraph, locale-aware logic.
- `apps/web/lib/db.ts` → both `key_insight` and `key_insight_zh` are in the SELECTs (the latter read via `to_jsonb` for migration-0009 resilience). Both fields are fetched so the locale switch + fallback can work — but only one is rendered.

## Production evidence (verified today)
I fetched production and stripped `<script>` blocks to measure the **rendered DOM** (what the browser shows), not the raw source:

| Page / locale | Cards | Summary `<p>` rendered | First card language |
|---|---|---|---|
| `/youtube-insights` EN | 20 | 20 (one each) | English only ("Bryant Chou, co-founder of Webflow …") |
| `/youtube-insights` ZH | 20 | 20 (one each) | Chinese only ("Webflow 联合创始人 Bryant Chou …") |
| home strip EN | 3 | 3 (one each) | English |
| home strip ZH | 3 | 3 (one each) | Chinese ("Webflow 联合创始人 …") |

One paragraph per card, correct language per locale, with fallback to the other language only when the preferred field is null (so a card is never blank).

## Why it *looks* like both are shown (the likely source of the report)
Viewing the page **source** (e.g. "View Page Source" / `curl` of the raw HTML) shows both English and Chinese strings, because Next.js embeds its **RSC flight payload** inside `<script>self.__next_f.push(...)</script>` tags. That payload carries the server-render data (and, for the home page, the full insight objects which include both `key_insight` and `key_insight_zh`). It is not the rendered DOM. In the actual page the browser paints, only one language appears per card.

How to confirm in a browser: open the page, toggle EN/中文 in the header — the visible cards switch language and never show both. ("Inspect Element" on a card shows a single `<p>`; "View Source" shows both because of the flight payload.)

## Optional follow-up (not done — would you like it?)
If the goal is to keep the *other* language out of the page **source** too (not just the rendered DOM), I could have the home page resolve the single locale paragraph server-side before passing data to the client `HomeContent` component, so the unused translation isn't serialized into the flight payload. This is a payload/cleanliness optimization, not a rendering fix — the visible behavior is already correct. Say the word and I'll ship it as a PR.

## Tasks
- Task 1 (fix locale-aware display): already correct — no change needed.
- Task 2 (test EN/中文 toggle): verified in production per the table above.
- CHANGELOG: no entry added (no code change).
- `FRONTEND_REQUEST.md`: deleted (request processed).

## Scope
No files modified (investigation only). Queue files updated per protocol.
