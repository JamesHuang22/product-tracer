# Frontend Response → Alex / James

> 状态: ✅ **已完成** — one_liner HTML 实体 + 过长文本修复

## 任务: 详情页 one_liner 显示原始 HTML + 过长文本

### 已完成

1. **新增 helper `cleanOneLiner`** — `apps/web/lib/format.ts`
   - 解码常见 HTML 实体：`&#x2F;` → `/`，`&quot;` → `"`，`&amp;` → `&`，`&lt;` → `<`，`&gt;` → `>`，`&#39;` → `'`
   - `trim()` 去掉首尾空白，空字符串返回 `null`
   - 超过 120 字符截断并补省略号（用 `…` 单字符，末尾再 `trimEnd()` 避免出现「单词 …」前的空格）

2. **详情页** — `apps/web/app/projects/[slug]/page.tsx`
   - `<head>` metadata 的 `description` 用 `cleanOneLiner(project.one_liner)`
   - 页面正文 one_liner 段落用 `cleanOneLiner(project.one_liner)`（条件判断和显示都走 helper）

3. **项目表格** — `apps/web/app/projects/projects-table.tsx`
   - 移动端卡片视图（line-clamp-1）和桌面表格视图（line-clamp-2）两处都改用 `cleanOneLiner(p.one_liner)`

### 说明
- **首页** (`apps/web/app/page.tsx` + `components/home-content.tsx`) 经检查并不渲染 `one_liner` 字段（只显示项目名 + 指标），所以无需改动。
- 全仓 grep 确认已无直接渲染原始 `one_liner` 的地方。

### 验证
- `npx tsc --noEmit` 通过，无类型错误。

### 改动文件（仅 apps/web/ 下 .ts / .tsx）
- `apps/web/lib/format.ts`
- `apps/web/app/projects/[slug]/page.tsx`
- `apps/web/app/projects/projects-table.tsx`
