# Assistant Queue — Alex → Claude Code

> 当前状态: 🟢 **任务排队中**

---

## 任务一: 前端 UI — HN 和 PH 独立项目详情页

### 问题
现在 `/projects` 页面把所有项目都展示成统一的表格，点击后跳转到 `primary_url`（也就是项目自己的网站或 GitHub）。但对于 **Hacker News** 和 **Product Hunt** 上发现的独立产品，我们不应该只链接到外部 URL——应该有自己的详情页，展示该项目的跨平台数据。

### 需要做的

**1. 新增 `apps/web/app/projects/[slug]/page.tsx`**
- 接收 `slug` 参数
- 从数据库查询该项目所有平台的 snapshot 数据
- 从 `app.project_metric` 查询每日指标
- 返回 404 如果项目不存在

**页面包含：**
- 项目名称 + one_liner
- 跨平台数据卡片（每个平台一张，含最新 metric + 历史趋势）
- GitHub: stars, forks （如果存在 identity_link for github）
- HN: score, comments（如果存在）
- PH: upvotes（如果存在）
- 外部链接按钮（访问项目网站、GitHub、PH page 等）
- 如果项目只有一个平台数据（比如只有 PH），那也要显示好，不要留空

**2. 新增 `apps/web/lib/db.ts` 查询函数**

```typescript
export interface ProjectDetail {
  id: string;
  slug: string;
  name: string;
  one_liner: string | null;
  category: string | null;
  primary_url: string | null;
  created_at: string;
  platforms: {
    platform: string;
    external_id: string;
  }[];
  metrics: {
    date: string;
    github_stars: number | null;
    github_forks: number | null;
    ph_upvotes: number | null;
    hn_score: number | null;
    reddit_score: number | null;
  }[];
}

export async function getProjectBySlug(slug: string): Promise<ProjectDetail | null>;
// 查询逻辑：join app.project + app.identity_link（多行） + app.project_metric（多行），
// 按 date 排序返回
```

**3. 修改 `apps/web/app/projects/projects-table.tsx`**
- GitHub 项目行：链接到 GitHub URL（保持现有行为，在新标签页打开）
- HN 和 PH 项目行：不再直接链接到外部 URL，改为链接到 `/projects/[slug]`（内部详情页）

可以通过 `identity_link` 来判断——如果项目只有 `product_hunt` 或 `hacker_news` 的 identity_link 而没有 `github` 的，就指向内部详情页。也可以简单点：所有非 GitHub 项目都指向详情页，GitHub 项目保持原样。

**4. 修改 `/projects` 页面标题和描述（已经在 page.tsx 里）**
- 表格里加一列显示来源平台（用 platform badge：GH / HN / PH 小标签）

### 设计参考
参考现有 `/projects` 页面的设计风格（中性色调、圆角、一致间距）。新增详情页要简洁，一屏内显示全部信息。

---

## 任务二: AI/LLM 自动分类 Research

### 目标
研究如何用 AI/LLM 对产品项目进行自动分类和质量评分，**保持成本可控**。**不需要实现**，只需要写一份详细的 research 文档。

### 研究要点

**1. 候选 LLM**
- **Anthropic Claude Haiku**（最便宜，适合批量）：~$0.25/1M input tokens
- **OpenAI GPT-4o Mini**：~$0.15/1M input tokens  
- **DeepSeek**：~$0.14/1M input tokens
- **本地模型**（Ollama + llama3.2 或 Qwen2.5）：零成本，但需要 GPU

评估维度：每个模型的成本、延迟、分类准确度、是否支持 JSON structured output

**2. 批处理策略**
- 每天 UTC 6:00 data quality 脚本之后
- 如何 batch 处理所有新项目（一次 API 调用处理多个项目 vs 逐条）
- 如何利用 prompt engineering 在一个请求里处理多个项目（减少 API 调用次数）

**3. 分类 Schema**
推荐的结构化输出格式：
```json
{
  "category": "AI/ML | Dev Tools | SaaS | Product | Design | Mobile | Other",
  "subcategory": "LLM Tools | Data Pipeline | etc.",
  "quality_score": 1-5,
  "tags": ["tag1", "tag2"],
  "requires_review": true/false,
  "reasoning": "简短原因"
}
```

**4. 与现有 Data Quality Pipeline 整合**
- 现有的纯规则评分（`classifier.ts`）可以作为 pre-filter
- 只有评分在 30-70 之间的灰色地带项目才送 LLM 判断（节省成本）
- 高分/低分项目直接保留/丢弃，不需要 LLM

**5. 成本估算**
基于当前 1564 个项目，只有 ~30% 需要 LLM 判断（灰色地带）：
- 每个项目 ~200 tokens input
- 每天 ~470 个项目 × ~200 tokens = ~94K tokens
- 不同模型日成本：Haiku ~$0.02/天，DeepSeek ~$0.01/天
- 月成本 ~$0.30-$0.60

**6. 实现方案建议**
- 新增 `apps/worker/src/quality/llm-classifier.ts`（建议代码架构）
- 配置化的 LLM provider（支持 Haiku/GPT-4o-mini/DeepSeek 切换）
- 投票机制：多条 prompt 各跑一次取 majority
- fallback 策略：LLM 不可用时回退到纯规则评分

### 输出
在项目根目录创建 `research/llm-classification.md`，包含以上全部研究内容。**不要实现任何代码**，只写文档。

---

两个任务独立，可以先做任务一（前端UI）再做任务二（research 文档）。完成后写 RESPONSE.md。
