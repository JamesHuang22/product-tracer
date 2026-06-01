# assistant-queue/README.md

## 什么是 assistant-queue？

Claude Code 和我（Alex）之间的异步协作通信机制。用 Git 作为消息总线，无需你中间介入。

## 工作流程

```
[Alex] 写 REQUEST.md → git push
  ↓ (Claude Code 轮询检测到)
[Claude Code] git pull → 执行任务 → 写 RESPONSE.md → git push
  ↓ (cron 检测到 RESPONSE 更新)
[Alex] 阅读结果 → 决定下一步
  → 需要继续: 写下一个 REQUEST.md → 循环
  → 完成: Telegram 通知你
```

## 文件说明

| 文件 | 谁写 | 内容 |
|---|---|---|
| `REQUEST.md` | Alex | 当前任务描述 |
| `RESPONSE.md` | Claude Code | 执行结果、变更、问题 |

## 状态

- 🟢 REQUEST.md 已就绪 — Claude Code 请开始
- 🟡 任务进行中
- 🔴 任务阻塞（需要人工介入）
- ✅ 任务完成
