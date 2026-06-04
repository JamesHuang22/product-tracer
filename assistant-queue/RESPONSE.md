# Assistant Queue — Claude Code → Alex

> 状态: ✅ **两个 Bug 全部修复**

---

## Bug 1: /projects 副标题 i18n 不生效 ✅

### 真正的根因（之前的修复漏了一半）
`projects/page.tsx` 确实已经用 `cookies()` 读 locale + `translate()` 渲染副标题（上一轮已加），key 也都在。但**切换语言后副标题不变**的真正原因是：
- 语言切换按钮 `setLocale()` 只更新了**客户端 React state + 写 cookie**，**没有触发 Server Component 重新渲染**。
- `/projects` 的副标题是 **Server Component** 渲染的，它只在「服务端重新跑一次」时才会读新 cookie。客户端 toggle 不会重跑服务端 → 副标题停留在旧语言（除非手动硬刷新）。

### 修复
在 `apps/web/lib/i18n-context.tsx` 的 `setLocale()` 里，写完 cookie 后调用 **`router.refresh()`**（`next/navigation`）。这样切换语言时所有 Server Component（含 /projects 副标题、/platform 页、/projects/[slug] 详情页里读 cookie 的部分）都会立即用新 locale 重渲染，**无需手动刷新**。客户端组件（header 等）仍然靠 state 即时更新，两者现在一致。

| 文件 | 改动 |
|---|---|
| `apps/web/lib/i18n-context.tsx` | `setLocale` 增加 `router.refresh()`（+ `useRouter` import），使服务端渲染的翻译随 toggle 即时更新 |

> 注：`projects/page.tsx` 的 cookie+translate 逻辑保持不变（已正确），本次只补了「让服务端重渲染」这一环。

---

## Bug 2: HN / PH 卡片 "View all" 链接应跳到各自平台页 ✅

### 需要做的，已全部完成

**1. 新增 DB 查询 `getPlatformProjects(platform)`** — `apps/web/lib/db.ts`
- `app.project JOIN app.identity_link WHERE il.platform = $platform`，返回与 `/projects` 相同的 `ProjectListItem[]`（含 `platforms[]`），所以能直接喂给现有 `ProjectsTable`。
- 排序按各平台主指标：github→stars、product_hunt→`project_metric.ph_upvotes`、其余（hn/reddit/x）→最新 snapshot `upvotes`，再按 `created_at`。

**2. 新增平台页路由** — `apps/web/app/platform/[platform]/page.tsx`（Server Component, force-dynamic）
- 校验 platform ∈ {github, hacker_news, product_hunt, reddit, x}，否则 `notFound()`。
- 从 cookie 读 locale，header 显示**翻译后的平台名 + 项目数**（中文模式显示中文平台名/文案）。
- 复用现有 `ProjectsTable` 展示列表，布局风格与 `/projects` 一致。
- 含 `generateMetadata`。

**3. 修改首页平台卡片链接** — `apps/web/components/platform-section.tsx` + `home-content.tsx`
- `LivePlatformSection` 新增可选 prop `viewAllHref?: Route`（默认 `/projects`）。
- 首页：`github` 保持 `/projects`；`hacker_news` → `/platform/hacker_news`；`product_hunt` → `/platform/product_hunt`。
- "View all {platform} projects" 文案继续走 `platform.viewAll` i18n key（中文「查看全部 … 项目」）；URL 不翻译、中英文一致。

**4. 新增 i18n key** — `apps/web/lib/i18n.ts`（en + zh）
- `platform.name.{github,hacker_news,product_hunt,reddit,x}`（平台显示名，供平台页标题）
- `platform.page.subtitle` / `platform.page.oneProject`（平台页副标题，带 {count}/{platform} 占位符）

### 完成标准核对
- ✅ 点 "View all HN projects" → `/platform/hacker_news`，只显示 HN 项目
- ✅ 点 "View all PH projects" → `/platform/product_hunt`，只显示 PH 项目
- ✅ 平台页标题显示平台名（中文模式中文名）
- ✅ GitHub 卡片仍跳 `/projects`（保持原行为）

---

## 验证
- `pnpm --filter @product-tracer/web typecheck` ✅
- `next build`：**编译 + 类型检查通过**（`✓ Compiled successfully`，新动态路由 `/platform/[platform]` 与 `viewAllHref` 的 typedRoutes 字面量校验均通过）。最后收集数据步骤因本地无 `DATABASE_URL` 报错 —— 环境问题、改动前即如此（页面 force-dynamic 直连库），线上配 secret 即可。

## 小结
- Bug 1 是「服务端渲染没跟随 toggle 重渲染」，靠 `router.refresh()` 收尾。
- Bug 2 新增了 `/platform/[platform]` 平台专属列表页（含 DB 查询、i18n、复用 ProjectsTable）并改了首页 HN/PH 链接。
- 全程自主完成，未提任何 yes/no 问题。
