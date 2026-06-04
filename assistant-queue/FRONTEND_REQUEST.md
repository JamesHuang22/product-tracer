# Assistant Queue — Frontend Agent ← Alex

> 当前状态: 🟢 **Bug 修复**

---

## Bug: 详情页 one_liner 显示原始 HTML + 过长文本

### 问题
在 `/projects/[slug]` 详情页，HN/PH 项目的 `one_liner` 字段包含了原始文本（含 HTML 实体如 `&#x2F;`、`&quot;`），而且文本过长（有时是整个 HN 帖子的正文）。

例如：
> "I kept seeing every npm&#x2F;pnpm&#x2F;yarn&#x2F;bun&#x2F;uv supply chain post end with the same advice..."

### 修复方案

**在 `apps/web/app/projects/[slug]/page.tsx` 中修改 one_liner 的展示：**
- 用一个 helper function 处理 one_liner 文本
- 解码 HTML 实体：`&#x2F;` → `/`，`&quot;` → `"`，`&amp;` → `&`，`&lt;` → `<`，`&gt;` → `>` 等
- 截断到最多 120 个字符，如果超出则在末尾加 `...`
- 这个 helper 可以放在 `apps/web/lib/format.ts` 里

```typescript
// apps/web/lib/format.ts
export function cleanOneLiner(text: string | null): string | null {
  if (!text) return null;
  // Decode common HTML entities
  const decoded = text
    .replace(/&#x2F;/g, '/')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'");
  // Truncate
  if (decoded.length > 120) return decoded.slice(0, 120) + '...';
  return decoded;
}
```

**修改 `[slug]/page.tsx`：**
在显示 `project.one_liner` 的地方调用 `cleanOneLiner(project.one_liner)`。

**同样检查 home page 和 projects 页面：**
如果这些页面也直接显示 one_liner，同样应用这个清理。

### 完成标准
- 详情页的 one_liner 干净显示（无 HTML 实体，不超过 120 字符）
- `/projects` 表格里的 one_liner 同样处理
- 首页的 one_liner 同样处理

---

**本 agent 负责范围：`apps/web/` 下的 .tsx / .css / .ts 文件。完成写 FRONTEND_RESPONSE.md。**
