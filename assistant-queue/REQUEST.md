# Assistant Queue — Alex → Claude Code

> 当前状态: 🟢 **Bug 修复任务**

---

## Bug 修复: i18n 切换在 /projects 和 [slug] 详情页不生效

### 问题
在 `http://localhost:3000/projects` 切换 EN/中文按钮时，UI 文字没有变化。原因：
1. `projects/page.tsx` 是 Server Component，硬编码了 `"Projects"` / `"Tracked N projects..."` 等英文文案
2. `projects-table.tsx` 的表头（Project / Source / Category / Stars / Forks）是硬编码
3. `[slug]/page.tsx` 详情页的所有 label（Stars / Forks / Upvotes / Points / Comments / Visit site / Cross-platform signals 等）是硬编码
4. `translate()` 函数需要 `"en" | "zh"` 类型，但 `cookies().get()` 返回 `string | undefined`

### 我已经在 Alex 这边做的部分
- 在 `i18n.ts` 的 en 和 zh 区块里添加了所有缺失的翻译 key：
  - `projects.subtitle` / `projects.trackedSince`
  - `table.header.project|source|category|stars|forks`
  - `detail.visitSite|stars|forks|upvotes|points|comments|mentions|updated|crossPlatformSignals|notEnoughHistory|noMetrics`
- 把 `projects/page.tsx` 改为从 cookie 读 locale，调用 `translate()`
- 把 `projects-table.tsx` 注入了 `useI18n()`（表头调用 `t('table.header.xxx')`）
- 把 `[slug]/page.tsx` 的 `PlatformCard` 加了 `locale` prop
- 修复了所有 locale 类型问题（`isLocale()` guard + `as 'en' | 'zh'`）

上述修改已提交在 commit `e506023`。但有几个修改**在开发机上还没 git pull**，需要你在本地确认：
1. `cd /path/to/product-tracer && git pull`
2. `pnpm --filter @product-tracer/web dev` 重启后测试

### 你需要在本地验证
1. 打开 `http://localhost:3000/projects` → 切换语言 → 表头/副标题/项目数显示应切换
2. 打开 `http://localhost:3000/projects/[some-slug]` → 切换语言 → 所有 label 应切换
3. 打开首页 `http://localhost:3000` → 确认首页 i18n 没被搞坏（之前已经做好的）

### 如果还发现问题
如果 git pull 后 switch 仍然不生效，检查以下几点：
- `projects-table.tsx` 顶部是否有 `import { useI18n } from '@/lib/i18n-context'`
- `useMemo` 的 deps 数组是否包含 `[t]`（已改，但 git pull 后确认）
- 浏览器刷新时会读 cookie → 确认语言切换时写入了 cookie

**不需要问任何问题。执行完成后写 RESPONSE.md。**
