# Assistant Queue — Claude Code → Alex

> 状态: ✅ **Bug 已修复**

---

## Bug: GitHub collector 因单个被封 repo（403）整体失败 ✅

### 根因
`apps/worker/src/collectors/github.ts` 的 `fetchKnownReposByIds()` 在重新抓取已知 repo 时，只对 **404** 做了 graceful 处理（归入 `missing`），其余任何非 2xx 一律 **`throw`**。当某个 repo 被 GitHub 因 TOS 封禁（返回 `403 Repository access blocked`，如 id `1222653845`），异常冒泡到 `main()`，整个 collector run 退出失败。

### 修复
让**单个 repo 级别的失败被隔离**，绝不中断整轮采集：

| 状态码 | 处理 |
|---|---|
| **404** Not Found | 归入 `missing`（已删除/转私有）——原有行为 |
| **403 / 451** | 归入新增的 `blocked`（TOS 封禁 / 法律下架），**记录 warning 并跳过**，继续下一个 |
| **429 / 403 + `x-ratelimit-remaining: 0`** | 视为限流：按 `Retry-After` / `x-ratelimit-reset` **等待一次（上限 60s）后重试该 id**；仍失败则归入 `blocked` 跳过 |
| 其他非 2xx（401、5xx 等）/ 网络异常 | **仍然 throw**——这些是真正的故障，不应被吞掉 |

### 改动文件
| 文件 | 说明 |
|---|---|
| `apps/worker/src/collectors/github.ts` | `fetchKnownReposByIds` 返回值新增 `blocked: number[]`；新增 `isRateLimited()` / `rateLimitWaitMs()` / `sleep()` 辅助；403/451 跳过、429 等待重试一次 |
| `apps/worker/src/scripts/collect-github.ts` | 解构出 `blocked` 并打印计数；把被封 ids 记到 `raw.collector_error`（`error_type='repos_blocked'`）便于观测 |

### 关键点：只吞 repo 级 403/404，不吞真正的错误
- 只对 `404 / 403 / 451 / 429` 这几个**单 repo HTTP 状态**做跳过/重试。
- `DATABASE_URL` 缺失、连接失败、`fetch` 抛网络异常、401 鉴权失败、5xx 等**照常向上抛出**，run 仍会失败——符合「不捕获真正的错误」的要求。
- discovery 阶段（`discoverRepos` / `fetchTrendingRepos`）的 search 失败逻辑未改（那是整批查询失败，应当报错）。

### 验证
- `pnpm --filter @product-tracer/worker typecheck` ✅
- **单元级 stub fetch 测试**（mock 全局 fetch）：输入 ids `[1(200), 2(403-TOS), 3(404), 4(200)]`
  - 结果：`repos=[1,4]`、`missing=[3]`、`blocked=[2]`，repo 2 打印 `⚠ skipping repo 2: 403 Forbidden …`，**无异常抛出** → `PASS ✓`
- 这正是出错 run 的场景：被封 repo 被跳过，其余 repo 正常处理，collector 不再整体失败。

### 小结
单个 blocked/deleted/rate-limited repo 不再拖垮整个 collect-github run；被封 repo 会被记录到 `raw.collector_error` 方便后续清理（例如从 `identity_link` 移除长期 blocked 的 id）。真正的基础设施错误仍然会让 run 失败，不被掩盖。

**自主完成，未提任何问题。**
