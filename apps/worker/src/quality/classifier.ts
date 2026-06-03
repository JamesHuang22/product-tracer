/**
 * Rule-based quality scoring for collected projects — zero external API cost.
 *
 * Every collector (GitHub / HN / PH / Reddit) sweeps a lot of noise into
 * `app.project`: books, tutorials, dotfiles, spam, low-signal posts. This
 * module scores each project 0–100 from purely local data (name, one-liner,
 * category, snapshot engagement, cross-platform presence) so the data-quality
 * pipeline can demote the bottom tail to `status='noise'` without paying for
 * an LLM call.
 *
 * Pure & deterministic — no I/O, no globals. The caller (run-quality-check.ts)
 * supplies the project plus its snapshots and identity links.
 */

export interface QualityScore {
  project_id: string;
  score: number; // 0–100
  reason: string; // short human-readable explanation
  should_keep: boolean; // score >= KEEP_THRESHOLD
}

export const KEEP_THRESHOLD = 40;

export interface AssessProjectInput {
  id: string;
  name: string;
  one_liner: string | null;
  category: string | null;
}

export interface AssessSnapshot {
  platform: string;
  upvotes: number | null;
  comments: number | null;
  stars: number | null;
  forks: number | null;
}

export interface AssessIdentityLink {
  platform: string;
}

// Known noise/spam name patterns — books, learning material, scaffolding,
// personal sites, toy apps. Matched case-insensitively on the project name.
const BLACKLIST_NAME =
  /\b(book|tutorial|course|guide|template|starter|boilerplate|awesome|cv|resume|dotfiles|notes|blog|portfolio|landing|chrome-extension|icon|font|theme|color|wallpaper|emoji|discord-bot|minecraft|games?|music|spotify|recipe|food|travel|weather|news|horoscope|calculator|timer|clock|quiz|trivia|meme|joke|quote|poem|privacy-policy|terms-of-service|cookie-consent|captcha|recaptcha|login-page|signup|auth-template)\b/i;

// Categories / topics that signal a real, relevant product. Matched against
// the project's category (falling back to its name).
const WHITELIST_CATEGORY =
  /(ai|ml|llm|gpt|claude|openai|langchain|rag|agent|vector|embedding|inference|training|fine.?tune|cloud|dev.?tool|cli|terminal|sdk|api|framework|database|cache|queue|streaming|analytics|monitoring|observability|logging|testing|ci.?cd|deployment|infrastructure|kubernetes|docker|container|serverless|edge|cdn|security|auth|encryption|privacy|search|indexing|crawler|scraper|automation|workflow|pipeline|etl|data.?pipeline|data.?science|computer.?vision|nlp|speech|audio|video|image|generation|synthesis|translation|summarization|code.?generation|code.?review|productivity|collaboration|project.?management|note.?taking|knowledge.?base|wiki|docs|documentation|saas|b2b|b2c|marketplace|e.?commerce|cms|headless|low.?code|no.?code|nocode|nocodb|supabase|firebase|stripe|payment|subscription|billing|invoice|dashboard|reporting|visualization|chart|graph|diagram|mind.?map|whiteboard|kanban|scrum|agile|roadmap|feedback|survey|form|newsletter|email|sms|notification|push|websocket|realtime|live|stream|video.?conference|screen.?share|remote|desktop|mobile|app.?builder|web.?builder|landing.?page|portfolio.?builder|resume.?builder|api.?builder|form.?builder|chat.?bot|chatbot|voice.?assistant|virtual.?assistant|personal.?assistant)\b/i;

// Per-platform engagement value that earns full community-signal credit.
const ENGAGEMENT_FULL: Record<string, number> = {
  github: 50, // stars
  product_hunt: 20, // upvotes
  hacker_news: 5, // upvotes (points)
  reddit: 20, // upvotes (score)
  x: 50, // upvotes (likes)
};

function max(a: number, b: number): number {
  return a > b ? a : b;
}

export function assessProject(
  project: AssessProjectInput,
  snapshots: AssessSnapshot[],
  identityLinks: AssessIdentityLink[],
): QualityScore {
  const reasons: string[] = [];
  let score = 0;

  const name = (project.name ?? '').trim();
  const oneLiner = (project.one_liner ?? '').trim();

  // --- Name quality (20) — sensible length ---------------------------------
  const len = name.length;
  if (len >= 3 && len <= 50) {
    score += 20;
  } else if (len > 50 && len <= 80) {
    score += 10;
    reasons.push('long name');
  } else {
    reasons.push('bad name length');
  }

  // --- Description quality (15) — has a real one-liner ---------------------
  if (oneLiner.length > 10) {
    score += 15;
  } else {
    reasons.push('thin description');
  }

  // --- Community engagement (25) — best normalised signal across platforms -
  let bestEngagement = 0;
  for (const snap of snapshots) {
    const full = ENGAGEMENT_FULL[snap.platform] ?? 50;
    const value =
      snap.platform === 'github'
        ? snap.stars ?? 0
        : snap.upvotes ?? 0;
    if (value > 0) bestEngagement = max(bestEngagement, Math.min(value / full, 1));
  }
  const community = Math.round(bestEngagement * 25);
  score += community;
  if (community < 8) reasons.push('low engagement');

  // --- Platform diversity (15) — cross-platform presence -------------------
  const platforms = new Set<string>();
  for (const link of identityLinks) platforms.add(link.platform);
  for (const snap of snapshots) platforms.add(snap.platform);
  const extra = max(platforms.size - 1, 0);
  const diversity = Math.min(extra * 7.5, 15);
  score += diversity;
  if (platforms.size >= 2) reasons.push(`${platforms.size} platforms`);

  // --- Category whitelist (15) — relevant topic ----------------------------
  const categoryText = project.category ?? name;
  if (WHITELIST_CATEGORY.test(categoryText)) {
    score += 15;
  } else {
    reasons.push('off-topic category');
  }

  // --- Name blacklist (10) — not obvious noise -----------------------------
  if (BLACKLIST_NAME.test(name)) {
    reasons.push('spam keyword in name');
  } else {
    score += 10;
  }

  score = Math.round(Math.max(0, Math.min(100, score)));
  const should_keep = score >= KEEP_THRESHOLD;

  const reason = reasons.length > 0 ? reasons.join(', ') : 'solid signal';

  return { project_id: project.id, score, reason, should_keep };
}
