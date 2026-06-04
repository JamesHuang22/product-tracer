# Assistant Queue — Alex → Claude Code

> 当前状态: 🟢 **Bug 修复**

---

## Bug: collect-github workflow 超时被 GitHub 取消

### 问题
地址: https://github.com/JamesHuang22/product-tracer/actions/runs/26932158286/job/79453918085

collect-github workflow 运行了 10 分钟后被取消，日志最后显示：
```
→ Storing 1156 repos (100 discovered + 1056 refreshed)…
Error: The operation was canceled.
```

403 blocked repo 的 fix（跳过）已经正确工作了（日志显示 `⚠ skipping repo 1222653845: 403 Forbidden`），但处理 1156 个 repo 需要超过 10 分钟。

### 修复
在 `.github/workflows/collect-github.yml` 中将 `timeout-minutes` 从 `10` 改为 `30`：

```yaml
- name: Collect GitHub
  timeout-minutes: 30
```

**不需要问任何问题。改完直接 push。完成后写 RESPONSE.md。**
