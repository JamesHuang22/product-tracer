/**
 * Lightweight client-side i18n — English / 中文.
 *
 * No routing, no middleware, no extra dependency. The whole UI string set
 * lives here; the active locale is held in React context (see
 * `i18n-context.tsx`) and persisted to a cookie so the server can render the
 * correct language on the next request (no flash, no hydration mismatch).
 *
 * Data content (project names, counts) is never translated — only chrome.
 */

export const LOCALES = ['en', 'zh'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'locale';

export function isLocale(value: string | undefined | null): value is Locale {
  return value === 'en' || value === 'zh';
}

/** Flat key → string. Keep `en` and `zh` in lockstep. */
type Messages = Record<string, string>;

const en: Messages = {
  'hero.badge': '{count} projects tracked across {platforms} platforms',
  'hero.titleLine1': 'Cross-platform signals',
  'hero.titleLead': 'for ',
  'hero.titleAccent': 'indie products.',
  'hero.subtitle':
    'Daily intelligence on what’s gaining traction across GitHub, Hacker News, Product Hunt, YouTube, Reddit, and X — surfaced into a 5-minute morning read.',
  'hero.browseAll': 'Browse all projects',
  'hero.dailyEmail': 'Daily email digest',
  'hero.comingSoon': 'coming soon',

  'nav.projects': 'Projects',

  'byPlatform.title': 'By platform',
  'byPlatform.summary': '{live} live · {soon} coming soon',

  'platform.live': 'Live',
  'platform.comingSoon': 'Coming soon',
  'platform.notYetIntegrated': 'Not yet integrated',
  'platform.projectsTracked': '{count} projects tracked',
  'platform.oneProject': '1 project tracked',
  'platform.viewAll': 'View all {platform} projects',
  'platform.reddit.description':
    'r/SideProject, r/indiehackers, r/SaaS — early discovery and community signal.',
  'platform.x.description':
    'Founder tweets with traction data — following a curated watchlist, not the firehose.',

  'lang.label': 'Language',
  'lang.english': 'English',
  'lang.chinese': '中文',

  'projects.subtitle':
    'Tracked {count} indie products across GitHub, Hacker News, Product Hunt & YouTube. Sorted by GitHub stars — open a non-GitHub project for its cross-platform detail.',

  'table.header.project': 'Project',
  'table.header.source': 'Source',
  'table.header.category': 'Category',
  'table.header.stars': 'Stars',
  'table.header.forks': 'Forks',
  'table.search': 'Search projects…',
  'table.count': '{shown} of {total}',
  'table.noMatch': 'No projects match “{query}”.',
  'table.empty': 'No projects tracked yet.',

  'detail.visitSite': 'Visit site',
  'detail.stars': 'stars',
  'detail.forks': 'forks',
  'detail.upvotes': 'upvotes',
  'detail.points': 'points',
  'detail.comments': 'comments',
  'detail.views': 'views',
  'detail.likes': 'likes',
  'detail.updated': 'Updated {date}',
  'detail.crossPlatformSignals': 'Cross-platform signals',
  'detail.mentions': 'Mentions',
  'projects.trackedSince': 'Tracked since {date}',
  'detail.notEnoughHistory': 'Not enough history yet',
  'detail.noMetrics': 'No metrics recorded yet',

  'platform.name.github': 'GitHub',
  'platform.name.hacker_news': 'Hacker News',
  'platform.name.product_hunt': 'Product Hunt',
  'platform.name.youtube': 'YouTube',
  'platform.name.reddit': 'Reddit',
  'platform.name.x': 'X',
  'platform.page.subtitle': '{count} projects tracked on {platform}.',
  'platform.page.oneProject': '1 project tracked on {platform}.',
};

const zh: Messages = {
  'hero.badge': '已追踪 {count} 个项目，覆盖 {platforms} 个平台',
  'hero.titleLine1': '跨平台信号',
  'hero.titleLead': '',
  'hero.titleAccent': '发现独立产品',
  'hero.subtitle':
    '每日洞察 GitHub、Hacker News、Product Hunt、YouTube、Reddit 和 X 上正在增长的热门项目，浓缩成 5 分钟晨间阅读。',
  'hero.browseAll': '浏览所有项目',
  'hero.dailyEmail': '每日邮件摘要',
  'hero.comingSoon': '即将上线',

  'nav.projects': '项目',

  'byPlatform.title': '按平台',
  'byPlatform.summary': '{live} 个已上线 · {soon} 个即将上线',

  'platform.live': '已上线',
  'platform.comingSoon': '即将上线',
  'platform.notYetIntegrated': '尚未接入',
  'platform.projectsTracked': '已追踪 {count} 个项目',
  'platform.oneProject': '已追踪 1 个项目',
  'platform.viewAll': '查看全部 {platform} 项目',
  'platform.reddit.description': 'r/SideProject、r/indiehackers、r/SaaS —— 早期发现与社区信号。',
  'platform.x.description': '带有增长数据的创始人推文 —— 关注精选名单，而非信息洪流。',

  'lang.label': '语言',
  'lang.english': 'English',
  'lang.chinese': '中文',

  'projects.subtitle':
    '已追踪 {count} 个独立产品，覆盖 GitHub、Hacker News、Product Hunt 和 YouTube。按 GitHub stars 排序——点击非 GitHub 项目查看跨平台详情。',

  'table.header.project': '项目',
  'table.header.source': '来源',
  'table.header.category': '分类',
  'table.header.stars': '星标',
  'table.header.forks': '复刻',
  'table.search': '搜索项目…',
  'table.count': '{total} 个中显示 {shown} 个',
  'table.noMatch': '没有匹配 “{query}” 的项目。',
  'table.empty': '暂无追踪的项目。',

  'detail.visitSite': '访问网站',
  'detail.stars': '星标',
  'detail.forks': '复刻',
  'detail.upvotes': '点赞',
  'detail.points': '分数',
  'detail.comments': '评论',
  'detail.views': '播放量',
  'detail.likes': '点赞',
  'detail.updated': '更新于 {date}',
  'detail.crossPlatformSignals': '跨平台信号',
  'detail.mentions': '提及',
  'projects.trackedSince': '自 {date} 开始追踪',
  'detail.notEnoughHistory': '历史数据不足',
  'detail.noMetrics': '暂无指标数据',

  'platform.name.github': 'GitHub',
  'platform.name.hacker_news': 'Hacker News',
  'platform.name.product_hunt': 'Product Hunt',
  'platform.name.youtube': 'YouTube',
  'platform.name.reddit': 'Reddit',
  'platform.name.x': 'X',
  'platform.page.subtitle': '在 {platform} 上追踪了 {count} 个项目。',
  'platform.page.oneProject': '在 {platform} 上追踪了 1 个项目。',
};

const MESSAGES: Record<Locale, Messages> = { en, zh };

export type MessageKey = keyof typeof en;

/** Translate `key` for `locale`, interpolating `{name}` placeholders. */
export function translate(
  locale: Locale,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const dict = MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];
  let value = dict[key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? key;
  if (params) {
    for (const [name, raw] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{${name}\\}`, 'g'), String(raw));
    }
  }
  return value;
}
