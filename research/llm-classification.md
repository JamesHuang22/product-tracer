# Research — AI/LLM Auto-Classification & Quality Scoring

> 状态：**research only — 不实现代码**。本文给出技术选型、批处理策略、schema、与现有 pipeline 的整合方式、成本估算和建议架构。
>
> 背景：现有的数据质量 pipeline（`apps/worker/src/quality/classifier.ts`）是**纯规则**评分（0–100，无 API 成本）。本文研究在它之上叠加一层**可选的 LLM 判断**，只对规则评分无法确定的「灰色地带」项目调用 LLM，从而在几乎零成本的前提下显著提升分类质量。

---

## 1. 候选 LLM 对比

> ⚠️ 价格随时间变动，下表为撰写时（2026 上半年）的量级参考，落地前请到各家定价页核对。单位 = 美元 / 1M tokens。

| 模型 | Input | Output | JSON structured output | 延迟（典型） | 分类准确度（主观） | 备注 |
|---|---|---|---|---|---|---|
| **Claude Haiku 4.5** | ~$1.0 | ~$5.0 | ✅ tool use / 强制 JSON | 低 | 高 | 指令遵循好、幻觉少；**支持 Batch API 5 折 + prompt caching 9 折** |
| **Claude 3 Haiku（旧）** | ~$0.25 | ~$1.25 | ✅ | 很低 | 中 | 最便宜的 Claude，分类够用，已被 4.5 取代但仍可调用 |
| **OpenAI GPT-4o mini** | ~$0.15 | ~$0.60 | ✅ `response_format: json_schema` | 低 | 中–高 | 性价比高，structured output 成熟 |
| **DeepSeek-V3 / Chat** | ~$0.14（off-peak 更低） | ~$0.28 | ✅ JSON mode | 中（API 偶有拥塞） | 中–高 | 最便宜；数据出境/合规需评估；可用性不如前两家稳定 |
| **本地 Ollama（llama3.2-3B / Qwen2.5-7B）** | $0（电费/GPU 折旧） | $0 | ⚠️ 需 grammar/JSON 约束，小模型偶尔跑偏 | 取决于硬件 | 中（7B 起可用，3B 偏弱） | 零边际成本，但 CI（GitHub Actions runner 无 GPU）跑不动；要自建常驻机器 |

### 评估维度小结
- **成本**：DeepSeek ≈ GPT-4o mini < 旧 Haiku < Haiku 4.5。本地模型边际成本 0，但有固定基础设施成本。
- **延迟**：批量离线任务（每天一次）对延迟不敏感，可优先成本与准确度。
- **准确度**：分类 + 1–5 评分这类任务，GPT-4o mini / Haiku 已足够；DeepSeek 接近；3B 本地模型建议只做粗分类。
- **Structured output**：四家云模型都支持，强约束 JSON 是本场景的硬需求（见 §3）。

### 推荐
**主选 GPT-4o mini 或 Claude Haiku 4.5**（二选一，做成可切换，见 §6）：
- 预算极限敏感 → GPT-4o mini（或开 Claude Batch API 把 Haiku 拉到 5 折）。
- 指令遵循/低幻觉优先、且已在用 Anthropic 生态 → Claude Haiku 4.5 + Batch API + prompt caching。
- **不推荐**把本地模型作为 CI 路径（runner 无 GPU）；本地仅适合开发者机器上的离线实验。

---

## 2. 批处理策略

### 调度时机
接在现有 Data Quality workflow 之后：
```
collectors (全天多次)  →  data-quality.yml (UTC 06:00, 纯规则评分)  →  llm-classify.yml (UTC 06:30, 仅灰色地带)
```
LLM 步骤独立成一个 workflow（或在 data-quality 之后追加一个 step），失败不影响规则评分结果。

### 一次请求处理多个项目（关键省钱手段）
逐条调用 = 每个项目一次请求，固定开销（system prompt、tool schema）被重复计费 N 次。**应当 batch**：

- **Prompt-level batching**：一个请求里塞入一批项目（如 20–50 个），让模型一次返回一个 JSON 数组。
  - system prompt + 分类规则 + schema 只发一次 → 用 **prompt caching**（Anthropic / OpenAI 均支持）把这部分缓存，命中后近乎免费。
  - 每个项目只增加 ~150–250 input tokens（name + one_liner + category + 平台指标摘要）。
  - 风险：批越大，单条出错/越界的概率越高，且超长输出可能被截断 → 建议**每批 20–30 个**，输出用数组并要求 `project_id` 回填以便对齐。
- **Provider Batch API（异步离线）**：Anthropic Batches / OpenAI Batch，**5 折价格**、24h 内返回。本场景每天一次、不赶时间，非常契合。可与 prompt-level batching 叠加。

### 输入裁剪
喂给 LLM 的不是原始 raw_data，而是精炼摘要：
```
{id, name, one_liner(截断 200 字), category, signals: {gh_stars, hn_points, ph_upvotes, reddit_score, platform_count}}
```
控制在 ~200 input tokens / 项目。

---

## 3. 分类 Schema（结构化输出）

要求模型对**每个项目**返回如下对象（批处理时返回数组）：

```json
{
  "project_id": "uuid",
  "category": "AI/ML | Dev Tools | SaaS | Product | Design | Mobile | Other",
  "subcategory": "LLM Tools | Data Pipeline | CLI | Analytics | ...",
  "quality_score": 3,
  "tags": ["llm", "agents", "open-source"],
  "requires_review": false,
  "reasoning": "简短原因（≤120 字）"
}
```

落地约束：
- **Anthropic**：用 `tools` + `tool_choice` 强制调用一个 `classify` 工具，工具的 `input_schema` 即上面的 JSON Schema（数组版）。
- **OpenAI**：`response_format: { type: "json_schema", json_schema: {...}, strict: true }`。
- `category` / `subcategory` 用 enum 限定取值，避免自由发挥导致脏数据。
- `quality_score` 1–5（注意与现有规则的 0–100 不同尺度，整合时做映射，见 §4）。
- `requires_review=true` 用于「模型也拿不准」的项目 → 进人工/二次校验队列，**不直接删除**。

---

## 4. 与现有 Data Quality Pipeline 整合

核心思想：**规则评分做 pre-filter，LLM 只看灰色地带**，最大化省钱。

```
规则评分 score = assessProject(...)   // classifier.ts, 0–100
 ├─ score ≥ 70           → 直接 keep（status='active'），不调用 LLM
 ├─ score < 30           → 直接 noise（status='noise'），不调用 LLM
 └─ 30 ≤ score < 70      → 灰色地带 → 送 LLM 判断
                             ├─ LLM quality_score ≥ 3      → keep + 回写 category/subcategory/tags
                             ├─ LLM quality_score ≤ 2      → noise
                             └─ requires_review            → status='review'（新状态，待人工）
```

整合要点：
- **尺度映射**：LLM 的 1–5 映射回决策（≥3 keep / ≤2 noise），或归一化到 0–100（`(score-1)/4*100`）写入一个新列 `llm_score` 便于排序。
- **回写字段**：LLM 给出的 `category` / `subcategory` / `tags` 比 collector 原始 category（常是 subreddit 名/topic）更干净，可覆盖或并存（建议新列 `app.project.llm_category`、`llm_tags text[]`，保留原始 category 不动）。
- **schema 变更建议**（沿用手动 migration 习惯，见 0001/0002/0003 头注释）：
  ```sql
  -- migration 0004（建议，未实现）
  alter table app.project add column if not exists llm_category text;
  alter table app.project add column if not exists llm_subcategory text;
  alter table app.project add column if not exists llm_tags text[];
  alter table app.project add column if not exists llm_score smallint;  -- 1..5
  alter table app.project drop constraint if exists project_status_check;
  alter table app.project add constraint project_status_check
    check (status in ('active','dead','noise','review'));
  ```
- **幂等**：记录每个项目最近一次 LLM 判定的 input hash（类似 `project_embedding.source_text_hash`），输入没变就跳过，避免重复花钱。

---

## 5. 成本估算

基线：当前约 **1564** 个项目；规则 pre-filter 后约 **30%** 落入灰色地带需要 LLM。

- 灰色地带量：1564 × 30% ≈ **470 项目/天**（首跑全量；之后靠 input-hash 幂等，每天只有新增/变化的项目，实际远低于 470）。
- 每项目 input ≈ 200 tokens；输出 ≈ 80 tokens。
- 全量一次：input ≈ 94K tokens，output ≈ 38K tokens。

| 模型 | 单次全量（94K in + 38K out） | 月成本（按每天全量上限估，过高估） | 叠加 Batch API 5 折后 |
|---|---|---|---|
| GPT-4o mini | ~$0.037 | ~$1.1/月 | n/a（OpenAI Batch 也 5 折 → ~$0.55/月） |
| DeepSeek | ~$0.024 | ~$0.7/月 | off-peak 更低 |
| Claude Haiku 4.5 | ~$0.28 | ~$8.4/月 | + prompt caching → 实际 **~$1–2/月** |
| Claude 3 Haiku（旧） | ~$0.07 | ~$2/月 | Batch → ~$1/月 |

> 结论：**即使每天全量重跑，月成本也在个位数美元**。加上 input-hash 幂等（只跑增量），实际成本会更低（每天新增项目通常 < 100）。任务给出的「月成本 ~$0.3–0.6」在「只跑增量 + 最便宜模型」假设下是合理的。

---

## 6. 实现方案建议（架构，**不实现**）

### 文件
- `apps/worker/src/quality/llm-classifier.ts`
  - 导出 `classifyBatch(projects: GrayZoneInput[]): Promise<LlmClassification[]>`。
  - 内部：构造精炼摘要 → 调用 provider → 解析 structured output → 校验（zod）→ 返回。
- `apps/worker/src/quality/providers/`（可切换 provider 抽象）
  - `types.ts`：`interface LlmProvider { classify(batch): Promise<...> }`
  - `anthropic.ts` / `openai.ts` / `deepseek.ts`：各自实现，读 `LLM_PROVIDER` env 决定用哪个。
- `run-quality-check.ts` 末尾：把灰色地带项目收集起来 → 调 `classifyBatch` → 回写。
- `.github/workflows/llm-classify.yml`：UTC 06:30，注入对应 provider 的 API key secret。

### 配置化 provider
```
LLM_PROVIDER = anthropic | openai | deepseek   (默认 anthropic)
LLM_MODEL    = claude-haiku-4-5 | gpt-4o-mini | deepseek-chat
ANTHROPIC_API_KEY / OPENAI_API_KEY / DEEPSEEK_API_KEY
```
provider 接口统一返回 `LlmClassification[]`，上层逻辑不感知具体厂商。

### 投票机制（可选，提精度）
对边界项目（如 LLM quality_score 正好 2 或 3、或 requires_review）跑 **2–3 次**（可不同温度或不同 prompt 措辞）取 **majority**。成本翻倍但只作用于极少数项目，整体可忽略。简单版：只对「LLM 给 2 或 3」的复跑一次。

### Fallback 策略
- LLM provider 不可用 / 超时 / 解析失败 → **回退到纯规则评分结果**（灰色地带项目默认按规则 score ≥ 50 keep、否则 noise），并写 `raw.collector_error`（platform='llm_classify'）记录失败。
- 单个批次失败不影响其他批次（逐批 try/catch）。
- 永远不要因为 LLM 失败就批量删除/降级项目——失败时偏向保守保留。

### Prompt 设计要点
- system prompt（可缓存）：分类规则 + enum 定义 + 「只输出工具调用/JSON，不要解释」+ few-shot 2–3 例。
- user message：当前批次的项目摘要数组。
- 要求每条输出回填 `project_id` 以对齐（不能依赖顺序）。

---

## 7. 小结与建议落地顺序
1. 先加 migration 0004（新列 + status 增加 'review'）。
2. 实现 `LlmProvider` 抽象 + 一个 provider（建议先 GPT-4o mini 或 Haiku 4.5 + Batch API）。
3. 在 `run-quality-check.ts` 接 gray-zone（30–70）→ `classifyBatch` → 回写，带 input-hash 幂等。
4. 上 `llm-classify.yml`（06:30），先 `workflow_dispatch` 手动验证一轮、核对成本与准确度，再开 cron。
5. 观察一周，调阈值（30/70）与批大小（20–30），再决定是否加投票机制。

**保持成本可控的三板斧**：规则 pre-filter 只送灰色地带 + prompt/Batch 批处理 + input-hash 幂等只跑增量。
