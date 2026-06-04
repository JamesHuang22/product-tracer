# Assistant Queue — Alex → Claude Code

> 当前状态: 🟢 **Bug 修复 + UI 改进**

---

## Bug 1: /projects 页面 i18n 副标题不生效

### 问题
切换到中文后，`/projects` 页面顶部的副标题仍然是英文：
> "Tracked 1580 indie products across GitHub, Hacker News & Product Hunt..."

它应该显示中文：
> "已追踪 1580 个独立产品，覆盖 GitHub、Hacker News 和 Product Hunt..."

### 原因
`projects/page.tsx` 是 Server Component，需要从 cookie 读 locale 并调用 `translate()`。之前 `projects.subtitle` 的中文翻译 key 已经在 `i18n.ts` 中定义了。

### 修复
确保 `projects/page.tsx` 使用 cookies() 读取 locale，并调用 `translate(locale, 'projects.subtitle', { count })` 渲染副标题。

**如果代码中已经用了 translate()，检查原因：**
- 确认 cookie 写入正确（语言切换按钮确实写入了 `locale` cookie）
- 确认国际化 provider 没有拦截 Server Component
- 如果切换后刷新页面仍然不行，检查浏览器的 cookie 值是否正确

**不需要问任何问题，直接修复。所有翻译 key 都已经在 i18n.ts 中存在。如果发现缺少某个 key 就补上。**

---

## Bug 2: "View all Hacker News projects" / "View all Product Hunt projects" 链接不对

### 问题
在首页（`/`）的 HN 和 PH 卡片上，点击 "View all Hacker News projects" 或 "View all Product Hunt projects" 按钮目前跳转到 `/projects` 页面（通用项目列表）。它应该跳转到**各自平台的独立页面**。

### 需要做的

**1. 新增平台详情页路由** `apps/web/app/platform/[platform]/page.tsx`
- 支持 `github`、`hacker_news`、`product_hunt`、`reddit`、`x` 这几个平台
- 从数据库查询该平台所有项目（用 `app.identity_link` 过滤）
- 显示平台名称、项目总数
- 使用现有的 `ProjectsTable` 组件展示项目列表

需要新增一个 DB 查询函数：
```typescript
export async function getPlatformProjects(platform: string): Promise<ProjectListItem[]> {
  // SELECT from app.project JOIN app.identity_link WHERE identity_link.platform = platform
  // ORDER BY latest metric desc
}
```

**2. 修改首页的平台卡片链接**
在 `apps/web/components/home-content.tsx` 中，找到平台卡片的 "View all X projects" 链接：
- `github` → 保持跳转到 `/projects`（现有行为）
- `hacker_news` → 跳转到 `/platform/hacker_news`
- `product_hunt` → 跳转到 `/platform/product_hunt`
- 其他平台如果也有这个按钮，同样处理

具体查找 `home-content.tsx` 中的 `viewAll` 翻译 key 或类似链接逻辑。

**3. 首页的平台链接也要 i18n**
"View all {platform} projects" 在切换中文后应该显示为 "查看全部 {platform} 项目"——这个 key 已经存在于 i18n.ts 中（`platform.viewAll`），如果链接指向的 URL 也变了，确保在中文模式下 URL 不变（URL 不需要翻译）。

### 设计
- `/platform/[platform]` 页面使用与 `/projects` 相同的表格和布局风格
- header 显示平台名称 + 项目数
- 不需要单独为每个平台设计不同的 UI，统一用现有 `ProjectsTable`

### 完成标准
- 点击 "View all HN projects" → 跳转到 `/platform/hacker_news`，显示只有 HN 项目的列表
- 点击 "View all PH projects" → 跳转到 `/platform/product_hunt`，显示只有 PH 项目的列表
- 页面标题显示平台名（中文模式下显示中文平台名）

---

## Bug 3: GitHub collector workflow 持续失败（403 Forbidden）

### 问题
地址: https://github.com/JamesHuang22/product-tracer/actions/runs/26912783333/job/79394900570

collect-github workflow 在 `fetchKnownReposByIds` 步骤失败，错误：
```
GitHub repo 1222653845 failed: 403 Forbidden — {"message":"Repository access blocked","block":{"reason":"tos","created_at":"2026-06-02T09:07:04Z","html_url":"https://github.com/tos"}}
```

这说明有一个 repo（id: 1222653845）被 GitHub 封禁了（违反 TOS），所以 API 返回 403。这导致整个 collector 脚本抛出异常并退出。

### 修复方案
修改 `apps/worker/src/scripts/collect-github.ts` 或 `apps/worker/src/collectors/github.ts`，使得当 GitHub API 对单个 repo 返回 403 时：
1. **不要抛出异常中断整个流程**
2. 只是跳过这个 blocked repo（记录到日志即可）
3. 继续处理其他 repo

具体来说，在 `fetchKnownReposByIds` 函数中，当 fetch 单个 repo 返回 403 时，应该 catch 该错误并继续，而不是让错误冒泡出去。

### 可选的改进（如果时间允许）
类似地，其他可能的高频错误（如 404 `Not Found`、429 `Rate Limit` 等）也应该 graceful handling：
- 404 → repo 可能被删了，跳过
- 403 → repo 被封了，跳过
- 429 → 等待后重试（可选）

### 完成标准
- collect-github workflow 在所有 repo 都被正常处理，不会因为单个 blocked repo 而整体失败
- 不捕获真正的错误（比如 DATABASE_URL 缺失、连接失败等），只捕获单个 repo 级别的 403/404

---

**不需要问任何问题。三个 bug 按优先级修（先修 3 让 workflow 跑通，再修 1+2 UI 问题）。完成后写 RESPONSE.md。**
