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
    'An intelligent product tracer that keeps you up to date with the hottest projects, trends, technology, and more.',
  'hero.browseAll': 'Browse all projects',
  'hero.dailyEmail': 'Daily email digest',
  'home.sources.label': 'Tracking across',

  'nav.projects': 'Projects',
  'nav.insights': 'Insights',
  'nav.trends': 'Trends',
  'nav.bookmarks': 'Bookmarks',
  'nav.menu': 'Menu',
  'nav.close': 'Close menu',

  'bookmarks.title': 'Bookmarks',
  'bookmarks.empty': 'No bookmarks yet. Save a project to find it here.',

  'byPlatform.title': 'By platform',
  'byPlatform.summary': '{live} active sources',

  'home.stats.totalProjects': 'Total projects',
  'home.stats.activePlatforms': 'Active platforms',
  'home.stats.newThisWeek': 'New this week',
  'home.stats.hotSignals': 'Hot signals',
  'home.latest.title': 'Latest activity',
  'home.latest.subtitle': 'Last {count} projects added',
  'home.latest.empty': 'No projects yet.',
  'home.insights.title': 'Latest insights',
  'home.insights.subtitle': 'High-relevance picks',
  'home.insights.empty': 'No video insights yet.',
  'home.insights.viewAll': 'All insights',

  // Home overview sections (Projects / Insights / Trends)
  'home.section.projects.title': 'Projects',
  'home.section.projects.subtitle': 'Top projects across every platform',
  'home.section.projects.viewAll': 'All projects',
  'home.section.insights.title': 'Insights',
  'home.section.insights.subtitle': 'Fresh takeaways from across YouTube',
  'home.section.trends.title': 'Trends',
  'home.section.trends.subtitle': 'This week’s movers in indie & AI',
  'home.section.trends.viewAll': 'Full report',
  'home.trends.weekOf': 'Week of {start} – {end}',
  'home.trends.empty': 'No weekly trends yet — check back after the analysis runs.',
  'time.justNow': 'just now',
  'time.minutesAgo': '{n}m ago',
  'time.hoursAgo': '{n}h ago',
  'time.daysAgo': '{n}d ago',

  'platform.live': 'Live',
  'platform.comingSoon': 'Coming soon',
  'platform.notYetIntegrated': 'Not yet integrated',
  'platform.projectsTracked': '{count} projects tracked',
  'platform.oneProject': '1 project tracked',
  'platform.viewAll': 'View all {platform} projects',
  'platform.topProjects': 'Top projects',
  'platform.rankedBy': 'by {metric}',
  'platform.empty': 'No projects yet',
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
  'table.search': 'Filter the table…',
  'search.placeholder': 'Search projects…',
  'search.noResults': 'No projects match “{query}”.',
  'table.filter.category': 'Filter by category',
  'table.filter.allCategories': 'All categories',
  'table.count': '{shown} of {total}',
  'table.filteredByTag': 'Filtered by tag',
  'table.noMatch': 'No projects match “{query}”.',
  'table.empty': 'No projects tracked yet.',
  'table.pagination.page': 'Page {current} of {total}',
  'table.pagination.prev': 'Prev',
  'table.pagination.next': 'Next',
  'table.pagination.perPage': '{count} per page',
  'table.pagination.showing': 'Showing {start}–{end} of {total}',

  'sort.label': 'Sort',
  'sort.starsDesc': 'Stars (high → low)',
  'sort.starsAsc': 'Stars (low → high)',
  'sort.newest': 'Newest first',
  'sort.nameAsc': 'Name (A–Z)',

  'theme.toDark': 'Switch to dark mode',
  'theme.toLight': 'Switch to light mode',

  'detail.aiSummary': 'AI Summary',
  'detail.bookmark': 'Bookmark',
  'detail.bookmarked': 'Bookmarked',
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
  'detail.relatedTitle': 'You might also like',
  'detail.relatedSubtitle': 'More in {category}',
  'detail.notFound': 'This project is no longer tracked, or the link is broken.',
  'detail.browseAll': 'Browse all projects',

  'platform.name.github': 'GitHub',
  'platform.name.hacker_news': 'Hacker News',
  'platform.name.product_hunt': 'Product Hunt',
  'platform.name.youtube': 'YouTube',
  'platform.name.reddit': 'Reddit',
  'platform.name.x': 'X',
  'platform.page.subtitle': '{count} projects tracked on {platform}.',
  'platform.page.oneProject': '1 project tracked on {platform}.',

  'insights.title': 'Latest insights',
  'insights.subtitle': 'Insights come from up to date trends.',
  'insights.empty': 'No video insights yet — check back once the analysis pipeline has run.',
  'insights.topics': 'Topics',
  'insights.trends': 'Trends',
  'insights.watchOn': 'Watch on YouTube',
  'insights.sentimentPositive': 'Positive',
  'insights.sentimentNeutral': 'Neutral',
  'insights.sentimentNegative': 'Negative',
  'insights.categoryAll': 'All categories',
  'insights.categoryAiMl': 'AI/ML',
  'insights.categoryDevTools': 'Developer Tools',
  'insights.categoryStartup': 'Startup/Business',
  'insights.categoryTechNews': 'Tech News',
  'insights.categoryHardware': 'Hardware',
  'insights.categorySecurity': 'Security',
  'insights.categoryDesign': 'Design',
  'insights.categoryOther': 'Other',
  'insights.viewList': 'List',
  'insights.viewGrid': 'Grid',

  'trends.title': 'Weekly Hot Trends',
  'trends.subtitle': "What's hot in the indie dev space this week",
  'trends.weekOf': 'Week of {start} – {end}',
  'trends.weekLabel': 'Week',
  'trends.wowNew': 'New',
  'trends.wowUp': 'Up {n} from last week',
  'trends.wowDown': 'Down {n} from last week',
  'trends.summary': 'Summary',
  'trends.topProducts': 'Top Products',
  'trends.emergingThemes': 'Emerging Themes',
  'trends.videoHighlights': 'Video Highlights',
  'trends.stats': '{projects} projects scanned · {signals} signals · {insights} insights',
  'trends.noTrendsYet': 'No trends yet. Check back after the weekly analysis runs.',
  'trends.distribution': 'This week’s mix',
  'trends.distributionSubtitle': 'Top products grouped by category or source',
  'trends.wow': 'Week over week',
  'trends.thisWeek': 'This week',
  'trends.lastWeek': 'Last week',
  'trends.topSource': 'Top source',
  'trends.topProduct': 'Top product',
  'trends.noPrevWeek': 'No prior week to compare yet — check back next week.',
  'trends.sourceUnchanged': 'unchanged',
  'trends.sourceShifted': 'shifted from {from}',
  'platform.name.other': 'Other',
};

const zh: Messages = {
  'hero.badge': '已追踪 {count} 个项目，覆盖 {platforms} 个平台',
  'hero.titleLine1': '跨平台信号',
  'hero.titleLead': '',
  'hero.titleAccent': '发现独立产品',
  'hero.subtitle':
    '智能产品追踪器，帮你紧跟最热门的项目、趋势、技术等动态。',
  'hero.browseAll': '浏览所有项目',
  'hero.dailyEmail': '每日邮件摘要',
  'home.sources.label': '覆盖平台',

  'nav.projects': '项目',
  'nav.insights': '洞察',
  'nav.trends': '趋势',
  'nav.bookmarks': '收藏',
  'nav.menu': '菜单',
  'nav.close': '关闭菜单',

  'bookmarks.title': '收藏',
  'bookmarks.empty': '还没有收藏。点击项目上的收藏按钮即可在此找到它。',

  'byPlatform.title': '按平台',
  'byPlatform.summary': '{live} 个活跃来源',

  'home.stats.totalProjects': '项目总数',
  'home.stats.activePlatforms': '活跃平台',
  'home.stats.newThisWeek': '本周新增',
  'home.stats.hotSignals': '热门信号',
  'home.latest.title': '最新动态',
  'home.latest.subtitle': '最近新增的 {count} 个项目',
  'home.latest.empty': '暂无项目。',
  'home.insights.title': '最新洞察',
  'home.insights.subtitle': '高相关度精选',
  'home.insights.empty': '暂无视频洞察。',
  'home.insights.viewAll': '全部洞察',

  // Home overview sections (Projects / Insights / Trends)
  'home.section.projects.title': '项目',
  'home.section.projects.subtitle': '各平台的热门项目',
  'home.section.projects.viewAll': '全部项目',
  'home.section.insights.title': '洞察',
  'home.section.insights.subtitle': '来自 YouTube 的最新要点',
  'home.section.trends.title': '趋势',
  'home.section.trends.subtitle': '本周独立开发与 AI 圈的热点',
  'home.section.trends.viewAll': '完整报告',
  'home.trends.weekOf': '{start} – {end} 当周',
  'home.trends.empty': '暂无每周趋势 —— 分析运行后再来查看。',
  'time.justNow': '刚刚',
  'time.minutesAgo': '{n} 分钟前',
  'time.hoursAgo': '{n} 小时前',
  'time.daysAgo': '{n} 天前',

  'platform.live': '已上线',
  'platform.comingSoon': '即将上线',
  'platform.notYetIntegrated': '尚未接入',
  'platform.projectsTracked': '已追踪 {count} 个项目',
  'platform.oneProject': '已追踪 1 个项目',
  'platform.viewAll': '查看全部 {platform} 项目',
  'platform.topProjects': '热门项目',
  'platform.rankedBy': '按{metric}',
  'platform.empty': '暂无项目',
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
  'table.search': '筛选当前表格…',
  'search.placeholder': '搜索项目…',
  'search.noResults': '没有匹配 “{query}” 的项目。',
  'table.filter.category': '按分类筛选',
  'table.filter.allCategories': '全部分类',
  'table.count': '{total} 个中显示 {shown} 个',
  'table.filteredByTag': '按标签筛选',
  'table.noMatch': '没有匹配 “{query}” 的项目。',
  'table.empty': '暂无追踪的项目。',
  'table.pagination.page': '第 {current} 页，共 {total} 页',
  'table.pagination.prev': '上一页',
  'table.pagination.next': '下一页',
  'table.pagination.perPage': '每页 {count} 条',
  'table.pagination.showing': '显示 {start}–{end}，共 {total} 条',

  'sort.label': '排序',
  'sort.starsDesc': 'Stars（高 → 低）',
  'sort.starsAsc': 'Stars（低 → 高）',
  'sort.newest': '最新优先',
  'sort.nameAsc': '名称（A–Z）',

  'theme.toDark': '切换到深色模式',
  'theme.toLight': '切换到浅色模式',

  'detail.aiSummary': 'AI 概述',
  'detail.bookmark': '收藏',
  'detail.bookmarked': '已收藏',
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
  'detail.relatedTitle': '猜你喜欢',
  'detail.relatedSubtitle': '更多 {category} 项目',
  'detail.notFound': '该项目已不再追踪，或链接已失效。',
  'detail.browseAll': '浏览所有项目',

  'platform.name.github': 'GitHub',
  'platform.name.hacker_news': 'Hacker News',
  'platform.name.product_hunt': 'Product Hunt',
  'platform.name.youtube': 'YouTube',
  'platform.name.reddit': 'Reddit',
  'platform.name.x': 'X',
  'platform.page.subtitle': '在 {platform} 上追踪了 {count} 个项目。',
  'platform.page.oneProject': '在 {platform} 上追踪了 1 个项目。',

  'insights.title': '最新洞察',
  'insights.subtitle': '洞察来自最新趋势。',
  'insights.empty': '暂无视频洞察 —— 分析流程运行后再来查看。',
  'insights.topics': '主题',
  'insights.trends': '趋势',
  'insights.watchOn': '在 YouTube 观看',
  'insights.sentimentPositive': '积极',
  'insights.sentimentNeutral': '中性',
  'insights.sentimentNegative': '消极',
  'insights.categoryAll': '全部分类',
  'insights.categoryAiMl': 'AI/ML',
  'insights.categoryDevTools': '开发工具',
  'insights.categoryStartup': '创业/商业',
  'insights.categoryTechNews': '科技新闻',
  'insights.categoryHardware': '硬件',
  'insights.categorySecurity': '安全',
  'insights.categoryDesign': '设计',
  'insights.categoryOther': '其他',
  'insights.viewList': '列表',
  'insights.viewGrid': '网格',

  'trends.title': '本周热门趋势',
  'trends.subtitle': '本周独立开发者圈的热点',
  'trends.weekOf': '{start} – {end} 当周',
  'trends.weekLabel': '周',
  'trends.wowNew': '新',
  'trends.wowUp': '较上周上升 {n} 位',
  'trends.wowDown': '较上周下降 {n} 位',
  'trends.summary': '概要',
  'trends.topProducts': '热门产品',
  'trends.emergingThemes': '新兴主题',
  'trends.videoHighlights': '视频亮点',
  'trends.stats': '扫描 {projects} 个项目 · {signals} 个信号 · {insights} 条洞察',
  'trends.noTrendsYet': '暂无趋势数据。请等待每周分析完成后查看。',
  'trends.distribution': '本周构成',
  'trends.distributionSubtitle': '按分类或来源划分的热门产品',
  'trends.wow': '环比变化',
  'trends.thisWeek': '本周',
  'trends.lastWeek': '上周',
  'trends.topSource': '主要来源',
  'trends.topProduct': '头号产品',
  'trends.noPrevWeek': '暂无可对比的上一周 —— 下周再来查看。',
  'trends.sourceUnchanged': '与上周相同',
  'trends.sourceShifted': '从 {from} 变化而来',
  'platform.name.other': '其他',
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
