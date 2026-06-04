# Assistant Queue — Frontend Agent ← Alex

> 当前状态: 🟢 **等待任务**

*此文件仅供前端专属 agent 读取。后端 agent 请读 partner REQUEST.md。*

---

## 前端任务池

### ✅ Bug 修复记录
- i18n 切换 + 平台详情页 — 已完成

### 🎯 当前待做

（暂无任务 — 等 James 安排）

---

## 工作指南

**前端 agent 职责范围（只改这些）：**
- `.tsx` / `.css` / `.jsx` 文件
- `apps/web/` 下的所有组件、页面、布局
- `apps/web/lib/` 下的工具函数（不含 DB 查询）
- `apps/web/components/` 下的所有组件
- 翻译文件 `apps/web/lib/i18n.ts`
- i18n 上下文 `apps/web/lib/i18n-context.tsx`

**绝不碰（留给后端 agent 或主 agent）：**
- DB 查询（`apps/web/lib/db.ts` 里的 SQL）
- Worker/collector 代码（`apps/worker/` 下的所有文件）
- Migration SQL
- GitHub workflow yml
- `packages/` 下的 schema 或类型定义
- `research/` 文档除非有相关新增

**工作流：**
1. git pull
2. 读本文件（FRONTEND_REQUEST.md）
3. 执行所有任务
4. 写 FRONTEND_RESPONSE.md
5. git add / commit / push
6. 删除本文件
7. 等 30 分钟后重新 pull

---

*本文件每次创建时覆盖。*
