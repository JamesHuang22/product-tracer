# Assistant Queue — Alex → Claude Code

> 当前状态: 🟢 **Bug 修复**

---

## Bug: GitHub collector workflow 持续失败（403 Forbidden）

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

**不需要问任何问题。执行完成后写 RESPONSE.md。**
