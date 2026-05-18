# Product Tracer — PRD

> 跨平台独立产品发布/增长信号追踪器
> 状态: Draft
> 版本: v0.1

---

## 1. 产品定位

**一句话：** 自动追踪独立开发者产品在多个平台的发布、增长和热度信号，输出洞察而非信息流。

**不是又一个聚合器**——你能在 GitHub、Product Hunt、X 上看到所有信息。
Product Tracer 的价值在于**跨平台信号联动 + AI 精炼**：
- "这个项目 24h 内在 GitHub 涨了 500 stars，同时在 Product Hunt 上也有讨论"
- "这个 founder 连续 3 周在 X 上更新增长数据"
- "本周有 3 个新工具值得关注"

---

## 2. MVP 范围 (v0.1)

### 监控源

| 平台 | 数据点 | 优先级 |
|------|--------|--------|
| GitHub | Stars 变动、新 release、新 fork | P0 |
| Product Hunt | 新 launch、upvotes 趋势 | P0 |
| X/Twitter | 讨论热度、founder 动态 | P1 (API 就绪后) |
| Reddit (r/SaaS, r/indiehackers) | 帖子热度、项目 mention | P2 |
| Hacker News (Show HN) | 新展示、comment 数 | P2 |

### 输出

**Phase 1**: 每日 Email Digest（纯后端）
- 今天值得关注的 5 个项目
- 每个项目一句话 + 数据（Stars 变化 / PH 排名 / 关键讨论）
- 每周趋势综述

**Phase 2**: Web 面板
- Dashboard
- 搜索/筛选
- 自定义 watchlist

### 核心信号

1. **Velocity Signal** — Stars/upvotes 加速度（不只是绝对值）
2. **Cross-platform Signal** — 同一项目在多个平台同时出现
3. **Founder Signal** — founder 在 X 上主动分享的数据点
4. **Alert Signal** — 你 watchlist 里的项目有重大变动

---

## 3. 技术架构（建议）

```
┌─────────────────┐
│  Scheduler/CRON │── 每 6h 触发
└────────┬────────┘
         ▼
┌─────────────────┐
│  Data Collectors│── GH API, PH API, X API, Reddit API
└────────┬────────┘
         ▼
┌─────────────────┐
│  Signal Engine  │── AI 分析/精炼/关联
└────────┬────────┘
         ▼
┌─────────────────┐
│  Output Layer   │── Email / Web / API
└─────────────────┘
```

- **Backend**: JS/TS (和你现有技术栈一致)
- **Storage**: 轻量 SQLite → 后期 PostgreSQL
- **Auth**: 后期加
- **Deploy**: 初期本地跑 cron，成熟后上 AWS/Cloudflare

---

## 4. 数据模型（初步）

```
Project {
  id, name, description, url, category
  github_url, ph_url, x_handle
  created_at, updated_at
}

Snapshot {
  id, project_id, platform, timestamp
  stars, forks, upvotes, comments
  rank, velocity
  raw_data: JSON
}

Signal {
  id, project_id, type, severity
  title, description, linked_snapshots
  created_at, acknowledged
}
```

---

## 5. 里程碑

| Phase | 内容 | 时间 |
|-------|------|------|
| P0 | 单一平台（GitHub）监控 + Email 推送 | 1 周 |
| P1 | 全平台数据收集 + 信号引擎 | 2 周 |
| P2 | Web 面板 + 搜索/筛选 | 3-4 周 |
| P3 | 用户系统 + 付费订阅 + 公开 beta | 5-6 周 |

---

## 6. 与 James 的分工

| 角色 | 负责 |
|------|------|
| **James** | Claude Code / Codex 高强度编码，本地开发 |
| **Alex / JBK** | PRD 维护、辅助任务、PR review、文档、自动化脚本 |

所有 context 在 GitHub repo 内统一管理。

---

_Discussion thread: Telegram 2026-05-17_
