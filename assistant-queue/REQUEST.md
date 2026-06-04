# Assistant Queue — Alex → Claude Code

> 当前状态: 🟢 **新功能实现**

---

## 任务: X/Twitter Collector 实现

### 背景
`research/x-twitter-collector.md` 里已经做了完整的技术调研。现在决定用**开源库**的方式实现，而不是自建 scraping。

### 要求
实现一个 X/Twitter collector，可以使用任何主流的开源 X/Twitter 抓取库。参考调研文档中的方案分析。

**目标：**
1. 无需官方 X API（不花 $100/mo）
2. 能获取特定用户的公开推文
3. 稳定可靠
4. 成本为 0（除了 GitHub Actions 运行时间）

### 什么是"开源库"实现
使用类似 `agent-twitter-client`、`twitter-scraper`、或类似的 npm 包，这些包模拟浏览器行为或使用非官方 API 来获取推文。**不要自己写 scraping 逻辑**。

### 需要做的

**1. 研究并选择一个合适的开源 npm 包**
研究以下候选并选择一个：
- `agent-twitter-client` — 最流行的 TypeScript X 客户端，支持登录态、免 API key
- 其他类似库

选择标准：TypeScript 支持、活跃维护、能无 API key 抓取公开数据、能在 Node.js/CI 环境运行。

**2. 新增 `apps/worker/src/collectors/x.ts`**
Collector 实现，遵循与其他 collector（github.ts, hackernews.ts 等）相同的模式：

```typescript
import { z } from 'zod';

export interface XPost {
  id: string;
  text: string;
  // 还需要哪些字段？参考其他 collector 的 schema
}
```

**3. 新增 `apps/worker/src/scripts/collect-x.ts`**
batch script，与其他 collector 脚本（collect-github.ts 等）结构一致。

**核心流程：**
1. 从配置文件读取 curated founder list（初始列表从已知项目中提取 X 用户名）
2. 对每个 founder，获取其最新推文
3. 过滤出与产品相关的推文
4. 如果推文包含链接 → 尝试 match 到已有项目（或创建新项目）
5. 写入 `raw.snapshot` (platform='x') + 更新 `app.project_metric`（如果需要加新列）
6. 统计并输出结果

**4. 新增 `.github/workflows/collect-x.yml`**
与现有的 collector workflow 结构一致（checkout → setup → pnpm install → run script）。

**5. 更新 `apps/worker/package.json`**
添加选中的 npm 包作为依赖。

**6. 初始 Founder List**
从现有数据库中提取已经有 X 链接的项目（PH/HN 项目可能带有 X 链接），作为初始 seed。也可以从一个 JSON 配置文件读取。

### 架构参考
参与已有 collector 的实现方式：
- `apps/worker/src/collectors/github.ts` 定义了 schema + fetch 逻辑
- `apps/worker/src/scripts/collect-github.ts` 定义了 batch task + DB 写入
- 遵循相同的命名和错误处理模式

### 注意事项
- 如果选中的 npm 包需要某些 cookie 或 token，写在脚本的环境变量中（通过 GitHub secrets 传入）
- 速率控制：不要触发 rate limit
- 错误处理：单个用户失败不要中断整个流程
- 使用 `@chen_og0023` 账号的 cookie 或 session（如果需要的化）

### 验证
- `pnpm --filter @product-tracer/worker typecheck` 通过
- 不使用真实的 X 账号也能 typecheck 通过（实际运行需要配置）

---

**不需要问任何问题。选择最合适的库后直接实现。完成后写 RESPONSE.md。**
