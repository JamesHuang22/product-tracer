# Assistant Queue — Alex → Claude Code

> 当前状态: 🟢 **任务排队中**

---

## 任务一: Data Quality Pipeline（AI 辅助数据清洗）

### 问题
当前 4 个 collector（GitHub/HN/PH/Reddit）采集了大量数据，但很多是不相关的噪音（书籍、教程、dotfiles、spam、低质量帖子）。项目中已经有一些基础的 noise filter（关键词黑白名单），但不够智能。需要一个**独立的 AI 质量评分 engine**，在数据采集后自动处理，标记/删除低质量项目。

### 架构
新增一个 GH Actions workflow `data-quality.yml`，每天 UTC 6:00 运行一次（所有 collector 跑完后），对 `app.project` 表中所有项目进行质量评估。

### 技术方案

**1. 新增 `apps/worker/src/quality/classifier.ts`**
一个质量评分模块，不需要调用任何外部 AI API（零成本），完全基于规则和统计：

```typescript
export interface QualityScore {
  project_id: string;
  score: number;        // 0-100
  reason: string;       // 简短原因
  should_keep: boolean; // threshold >= 40
}

export function assessProject(
  project: { id: string; name: string; one_liner: string | null; category: string | null },
  snapshots: { platform: string; upvotes: number | null; comments: number | null; stars: number | null; forks: number | null }[],
  identityLinks: { platform: string }[],
): QualityScore;
```

**评分规则（详细，直接实现，不需要额外数据）：**

| 维度 | 权重 | 规则 |
|---|---|---|
| **名称质量** | 20分 | 名称 3-50 字符、不含 spam 关键词 |
| **描述质量** | 15分 | one_liner 存在且 >10 字符 |
| **社区参与** | 25分 | max(upvotes/stars) — PH>20 / HN>5 / GH stars>50 = 满分，按比例递减 |
| **平台多样性** | 15分 | 每个额外平台 +7.5 分（max 15） |
| **类别白名单** | 15分 | category 匹配白名单关键词 → 加分 |
| **名称黑名单** | 10分 | 不含已知噪音关键词 |

**spam/noise 关键词列表（直接在代码里定义）：**
```typescript
const BLACKLIST_NAME = /\b(book|tutorial|course|guide|template|starter|boilerplate|awesome|cv|resume|dotfiles|notes|blog|portfolio|landing|chrome-extension|icon|font|theme|color|wallpaper|emoji|discord-bot|minecraft|games?|music|spotify|recipe|food|travel|weather|news|horoscope|calculator|timer|clock|quiz|trivia|meme|joke|quote|poem|privacy-policy|terms-of-service|cookie-consent|captcha|recaptcha|login-page|signup|auth-template)\b/i;

const WHITELIST_CATEGORY = /(ai|ml|llm|gpt|claude|openai|langchain|rag|agent|vector|embedding|inference|training|fine.?tune|cloud|dev.?tool|cli|terminal|sdk|api|framework|database|cache|queue|streaming|analytics|monitoring|observability|logging|testing|ci.?cd|deployment|infrastructure|kubernetes|docker|container|serverless|edge|cdn|security|auth|encryption|privacy|search|indexing|crawler|scraper|automation|workflow|pipeline|etl|data.?pipeline|data.?science|computer.?vision|nlp|speech|audio|video|image|generation|synthesis|translation|summarization|code.?generation|code.?review|productivity|collaboration|project.?management|note.?taking|knowledge.?base|wiki|docs|documentation|saas|b2b|b2c|marketplace|e.?commerce|cms|headless|low.?code|no.?code|nocode|nocodb|supabase|firebase|stripe|payment|subscription|billing|invoice|analytics|dashboard|reporting|visualization|chart|graph|diagram|mind.?map|whiteboard|kanban|scrum|agile|roadmap|feedback|survey|form|newsletter|email|sms|notification|push|websocket|realtime|live|stream|video.?conference|screen.?share|remote|desktop|mobile|app.?builder|web.?builder|landing.?page|portfolio.?builder|resume.?builder|api.?builder|form.?builder|chat.?bot|chatbot|voice.?assistant|virtual.?assistant|personal.?assistant)\b/i;
```

**2. 新增 `apps/worker/src/scripts/run-quality-check.ts`**
- `loadRepoEnv()` → 读取所有 `app.project` 项目（不用 join snapshot 每个 collector 最新记录）
- 对每个项目调用 `assessProject()`
- `should_keep === false` 的项目：将其 `app.project.status` 更新为 `'noise'`（需要先加这个列）
- 写入报告到 `raw.collector_error`（含 summary 统计）

**3. schema migration 0003**
```sql
alter table app.project add column if not exists status text not null default 'active';
-- 已有的 status check 可能需要更新
```

注意：现有的 migration 0001 可能已经有一个 `status text not null default 'active'`（检查一下）——如果已经有了就不用加。

**4. `.github/workflows/data-quality.yml`**
```yaml
name: Data Quality
on:
  schedule:
    - cron: '0 6 * * *'   # daily UTC 6:00 = after all collectors ran
  workflow_dispatch: {}
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @product-tracer/worker exec tsx src/scripts/run-quality-check.ts
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

**5. `apps/worker/package.json`** — 加 script:
```json
"quality:check": "tsx src/scripts/run-quality-check.ts"
```

### 验证
- `pnpm --filter @product-tracer/worker quality:check` 跑通
- 第一次跑应该能识别出 ~30-50% 的现有项目为噪音（标记 status='noise'）
- 不报错，不中断

---

## 任务二: 前端中英双语支持

### 目标
用户可以通过切换按钮在中文和英文界面之间切换。所有 UI 文字根据语言切换，数据内容保持原语言。

### 技术方案
使用 **next-intl** 库，目前最成熟的 Next.js 国际化方案，纯客户端切换，不需要额外的路由或子域名。

**修改步骤：**

**1. 安装依赖**
```
pnpm --filter @product-tracer/web add next-intl
```

**2. 新增 `apps/web/messages/zh.json` 和 `apps/web/messages/en.json`**

所有 UI 字符串都提取到这里。覆盖 page.tsx 和 platform-section.tsx 里的所有文案：

`en.json`:
```json
{
  "hero": {
    "projectsTracked": "{count} projects tracked across {platforms} platforms",
    "title": "Cross-platform signals\nfor indie products.",
    "subtitle": "Daily intelligence on what's gaining traction across GitHub, Hacker News, Product Hunt, Reddit, and X — surfaced into a 5-minute morning read.",
    "browseAll": "Browse all projects",
    "dailyEmail": "Daily email digest",
    "comingSoon": "coming soon"
  },
  "byPlatform": {
    "title": "By platform",
    "live": "{count} live",
    "comingSoon": "{count} coming soon"
  },
  "platform": {
    "notYetIntegrated": "Not yet integrated"
  },
  "project": {
    "projectsTracked": "{count} projects tracked",
    "oneProject": "1 project tracked"
  }
}
```

`zh.json`（同样结构，中文翻译）:
```json
{
  "hero": {
    "projectsTracked": "已追踪 {count} 个项目，覆盖 {platforms} 个平台",
    "title": "跨平台信号\n发现独立产品",
    "subtitle": "每日洞察 GitHub、Hacker News、Product Hunt、Reddit 和 X 上正在增长的热门项目，浓缩成5分钟晨间阅读。",
    "browseAll": "浏览所有项目",
    "dailyEmail": "每日邮件摘要",
    "comingSoon": "即将上线"
    ...
  },
  ...
}
```

**3. 新增 `apps/web/app/i18n.ts`**
```typescript
import { createNavigation } from 'next-intl/navigation';
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'zh'],
  defaultLocale: 'en',
  localeDetection: false,  // 只通过切换按钮
});

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
```

**4. 修改 `apps/web/app/layout.tsx`**
- 包装 `NextIntlClientProvider`
- 从 cookie/localStorage 读取语言偏好（默认 'en'）

**5. 新增语言切换组件 `apps/web/components/language-switcher.tsx`**
- 下拉或 toggle，放在 header 上
- 切换时更新 localStorage + 刷新页面

**6. 修改 `apps/web/app/page.tsx`**
- 用 `useTranslations()` 替换所有硬编码的 UI 字符串
- 数据变量（项目名、计数）用参数传入，不翻译

**7. 修改 `apps/web/components/platform-section.tsx`**
- 同样用 `useTranslations()` 替换文案
- `ComingSoonSection` 的描述文字从 props 换成从翻译文件读取

**注意**：`page.tsx` 当前是 async Server Component。next-intl 支持在 Server Component 里用。但语言切换（客户端交互）需要：在 layout 里通过 cookie 传 locale，或者用 client component 包裹切换逻辑。

**更简单的实现**（如果 next-intl 配置太复杂）：用 React Context 实现简单的 i18n：
- `apps/web/lib/i18n-context.tsx` — Provider + useI18n hook
- `apps/web/lib/i18n.ts` — 语言包 + 翻译函数
- localStorage 存语言偏好
- 所有 UI text 从翻译函数读取
- 语言切换组件更新 state + localStorage

**选择权在 Claude Code：** 如果 next-intl 能顺利集成用 next-intl；如果遇到路由/SSR 问题就改用 React Context 方案。不做判断，直接实现。

---

### 完成标准
- ✅ 所有现有 UI 文字都接入翻译
- ✅ 语言切换按钮在 header 上可见
- ✅ 切换后刷新页面保持语言选择
- ✅ typecheck 通过，build 成功

---

**注意：以上两个任务全部由 Claude Code 自主完成，不需要问任何 yes/no 问题。如果遇到 schema 字段已存在或依赖冲突，自行调整。完成后写 RESPONSE.md。**
