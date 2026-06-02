# RESPONSE.md — 执行结果

## 执行摘要

- **任务一（Reddit Collector）**：上一轮已完成并推送（collector / 脚本 / migration / package.json 已在 main；workflow yml 待你手动提交 —— 见下）。本轮未重复实现。
- **任务二（前端支持 Product Hunt）**：✅ 本轮完成。首页 PH 区块从 "Coming Soon" 改为真实数据，typecheck 通过。

---

## 任务二变更清单

| 文件 | 说明 |
| --- | --- |
| `apps/web/lib/db.ts` | `LivePlatform` 加 `'product_hunt'`；`PlatformTopItem.metric_label` 加 `'upvotes'`；`getPlatformTop` 加 `product_hunt` 分支（`ph_upvotes` 作 metric，从 `app.project_metric` 取最新值）。`getPlatformProjectCount` 无需改（已是通用按 platform 查 identity_link）。 |
| `apps/web/app/page.tsx` | 并行 fetch 加 `phTop` / `phCount`；`totalLive = ghCount + hnCount + phCount`；Hero `across 2 platforms` → `3 platforms`；"By platform" `2 live · 3 coming soon` → `3 live · 2 coming soon`；PH 的 `ComingSoonSection` 替换为 `LivePlatformSection`。GitHub / HN / Reddit / X 区块未动。 |

说明：`LivePlatformSection` 组件只渲染 `metric` 数字、不读 `metric_label`，所以加 `'upvotes'` 到类型 union 不影响渲染（保持和 GH/HN 行一致的展示）。

## 测试

- `pnpm --filter @product-tracer/web typecheck` → ✅ 通过
- prettier → ✅（两个文件已是规范格式）
- **未跑 dev/build 实际渲染**：本地无 `DATABASE_URL`，页面是 `force-dynamic`、运行时才查库。PH collector 有数据后即会显示。如果 PH 表暂时没数据，区块会显示 0 projects + 空列表（不会报错）。

---

## ⚠️ 仍需你手动处理（沿用上一轮）

1. **Reddit collector workflow** `.github/workflows/collect-reddit.yml` 已写好但我无法推送（本机 OAuth token 无 `workflow` scope）。本地 untracked，请你补提交：
   ```bash
   git add .github/workflows/collect-reddit.yml
   git commit -m "ci: add reddit collector workflow"
   git push
   ```
2. **Reddit 需要 OAuth creds**：Reddit 已封锁数据中心 IP 的匿名 JSON（实测 403）。代码已加可选 OAuth fallback。建 script app（https://www.reddit.com/prefs/apps），配 `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` secret。
3. **跑 migration** `packages/db/migrations/0002_reddit_score.sql`（Supabase SQL Editor），否则 Reddit collector 写 `reddit_score` 会失败。
4. **Product Hunt** 仍需 `PRODUCT_HUNT_TOKEN` secret 才能在生产采到数据（上上轮已说明）。前端代码已就绪，等数据进库即显示。

## 下一步建议

1. 把 PH collector 真正跑起来（配 token），首页 PH 区块就有真实数据了。
2. 同理推进 Reddit（creds + migration + workflow）。
3. （可选）`/projects` 页和列表查询目前以 GitHub stars 排序，未来可加 PH/Reddit 的跨平台综合排序。

---

**状态:** ✅ 任务二完成（前端 PH 已接真实数据）；任务一上一轮已完成（待你补 workflow + creds + migration）
