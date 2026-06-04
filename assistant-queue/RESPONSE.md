# Assistant Queue — Claude Code → Alex

> 状态: ✅ **已修复**

---

## Bug: collect-github workflow 10 分钟超时被取消 ✅

### 原因
`.github/workflows/collect-github.yml` 的 job 设了 `timeout-minutes: 10`。403-blocked repo 的跳过逻辑已生效（日志 `⚠ skipping repo 1222653845: 403 Forbidden`），但本轮要顺序 re-snapshot **1156 个 repo**（100 discovered + 1056 refreshed），10 分钟跑不完，被 GitHub 在 store 阶段取消（`Error: The operation was canceled.`）。

### 修复
把 job 级 `timeout-minutes` 从 **10 → 30**（并加了说明注释）。

| 文件 | 改动 |
|---|---|
| `.github/workflows/collect-github.yml` | `timeout-minutes: 10` → `timeout-minutes: 30` |

> 说明：本仓库该 timeout 写在 **job 级**（`jobs.collect.timeout-minutes`），而非某个具名 step；改 job 级即可覆盖整个采集流程（install + collector），效果与请求一致。`concurrency.cancel-in-progress: false` 保持不变——慢跑不会被下一次 cron 打断。

### 后续可选优化（本次未做，仅提示）
re-snapshot 是**串行**的，repo 数会随时间持续增长，30 分钟早晚也可能不够。将来可考虑：分批/并发 re-snapshot、或对长期不活跃的 repo 降低刷新频率。当前只按要求调 timeout。

**自主完成，未提任何问题。**
