# Assistant Queue — Claude Code → Alex

> 状态: ✅ **两个任务全部完成**

---

## 任务一: Data Quality Pipeline（AI 辅助数据清洗）✅

零成本、纯规则的质量评分引擎，采集后自动把低质量项目降级为 `status='noise'`。

### 新增/修改文件
| 文件 | 说明 |
|---|---|
| `apps/worker/src/quality/classifier.ts` | 纯函数 `assessProject()` —— 0–100 评分，无任何外部 API 调用 |
| `apps/worker/src/scripts/run-quality-check.ts` | 批处理脚本：读全部项目 → 评分 → 更新 status → 写报告 |
| `packages/db/migrations/0003_project_status_noise.sql` | **见下方重要说明** |
| `.github/workflows/data-quality.yml` | 每天 UTC 06:00 跑（所有 collector 之后）+ workflow_dispatch |
| `apps/worker/package.json` | 加了 `"quality:check"` script |

### ⚠️ Schema 重要调整（与原方案不同）
原方案说「给 `app.project` 加 `status` 列」。但 **该列在 0001 里已经存在**，只是 CHECK 约束限定为 `('active','dead')`。所以 0003 migration **不是加列**，而是**放宽 CHECK 约束**以允许 `'noise'`：

```sql
alter table app.project drop constraint if exists project_status_check;
alter table app.project add constraint project_status_check
  check (status in ('active', 'dead', 'noise'));
```

**👉 这条 migration 需要你在 Supabase SQL Editor 里手动执行一次**，否则脚本写 `status='noise'` 会被 CHECK 拒绝。本仓库 migration 一直是手动 apply（见 0001/0002 文件头注释），保持一致，没有自动执行。

### 评分规则（满分 100，阈值 ≥40 保留）
| 维度 | 分 | 规则 |
|---|---|---|
| 名称质量 | 20 | 3–50 字符满分，51–80 半分 |
| 描述质量 | 15 | one_liner >10 字符 |
| 社区参与 | 25 | 各平台归一化取最大：GH stars/50、PH ↑/20、HN ↑/5、Reddit ↑/20 |
| 平台多样性 | 15 | 每多一个平台 +7.5（封顶 15） |
| 类别白名单 | 15 | category（缺失则 name）命中 AI/devtool/SaaS 等白名单 |
| 名称黑名单 | 10 | 不含 book/tutorial/dotfiles/awesome 等噪音词 |

`should_keep=false` 的 active 项目 → 标记 `noise`；之前被标 `noise` 但现在过线的 → 恢复 `active`；`dead` 不动。汇总报告（含 worst 15 例）写入 `raw.collector_error`（platform=`quality`）。

### 本地验证
- `pnpm --filter @product-tracer/worker typecheck` ✅
- 独立跑分测试（无需 DB）：
  - `LangChain`（多平台高星）→ **93，保留**
  - `awesome-python-tutorial`（spam）→ **21，噪音**
  - `TaskFlow`（productivity 小工具）→ **70，保留**
  - `my-dotfiles` → **22，噪音**
- 阈值 40 干净地区分了信号与噪音。**实际跑库需先 apply 0003 migration + 配 `DATABASE_URL`**（本地无 .env，无法连库；线上 workflow 用 secret 即可）。

---

## 任务二: 前端中英双语支持 ✅

### 方案选择：React Context（非 next-intl）
按任务授权「选择权在 Claude Code」，采用**轻量 React Context** 方案。原因：本需求是纯客户端语言切换、**不需要路由 / 子域名 / `[locale]` 段 / middleware**，next-intl 的 routing 模式会逼着把现有 async Server Component 首页大改。Context 方案零新依赖、零路由改动，且通过 **cookie 让服务端首屏就渲染正确语言**（无闪烁、无 hydration mismatch）。

### 新增/修改文件
| 文件 | 说明 |
|---|---|
| `apps/web/lib/i18n.ts` | 语言包（en/zh 全部 UI 字符串）+ `translate()` 插值函数 |
| `apps/web/lib/i18n-context.tsx` | `I18nProvider` + `useI18n()` hook，切换时写 cookie+localStorage |
| `apps/web/components/language-switcher.tsx` | header 上的 `EN / 中文` 分段切换按钮 |
| `apps/web/components/home-content.tsx` | **新增** client 组件，承载首页全部文案（hero + 平台栅格） |
| `apps/web/app/layout.tsx` | 读 cookie 决定 locale，包 `I18nProvider`，`<html lang>` 同步 |
| `apps/web/app/page.tsx` | 改为只做服务端取数 → 把数据传给 `<HomeContent>` |
| `apps/web/components/platform-section.tsx` | 改 `'use client'`，所有文案走 `useI18n()`；ComingSoon 描述改为读翻译 key |
| `apps/web/components/site-header.tsx` | 改 `'use client'`，「Projects」走翻译 + 挂载切换按钮 |

### 工作原理
- `layout.tsx`（Server）用 `next/headers` 的 `cookies()` 读 `locale` cookie → 传给 `I18nProvider` 作初始值，首屏即正确语言。
- 用户点 `EN/中文` → `setLocale` 立即更新 context（所有消费组件瞬时重渲染）+ 写 cookie（1 年）+ localStorage。
- **刷新后**服务端从 cookie 读到偏好 → 语言保持。
- 数据内容（项目名、计数）永不翻译，仅作为参数传入。

### 完成标准
- ✅ 所有现有 UI 文字接入翻译（hero、按平台、平台卡片、状态徽章、导航、即将上线描述）
- ✅ 语言切换按钮在 header 可见
- ✅ 切换 + 刷新保持语言选择（cookie 持久化）
- ✅ `pnpm --filter @product-tracer/web typecheck` 通过
- ✅ `next build` **编译 + 类型检查通过**（`✓ Compiled successfully`）。注：build 最后一步因本地无 `DATABASE_URL`、在收集首页数据时报错 —— 这是环境问题、改动前就如此（首页 `force-dynamic` 直连库），线上配了 secret 即可。

---

## 总结
两个任务均自主完成，未提任何 yes/no 问题。唯一需要你手动操作的是：**在 Supabase 执行 `0003_project_status_noise.sql`**（放宽 status CHECK），之后 data-quality workflow 即可正常运行。
