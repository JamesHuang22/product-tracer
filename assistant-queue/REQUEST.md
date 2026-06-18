## Task: Remove "This video" / "本视频" preamble from LLM output

### Context
The YouTube Insights LLM prompt currently generates summaries that start with "This video analyzes..." or "本视频分析了..." — this feels like reading a video description, not a news digest. The user wants the insights to **start directly with the content**, skipping the video preamble.

### What to change

**`apps/worker/src/scripts/youtube-insights.ts`**
Update the **system prompt / user prompt** to instruct the LLM:

- **English (`key_insight`)**: Write as if the reader already knows this is derived from a video. Do NOT start with "This video", "The video", "In this video", etc. Just say what the content is. 
  - ❌ "This video analyzes the AI supply chain's reliance on Chinese engineers..."
  - ✅ "AI supply chain's unavoidable reliance on Chinese engineers and manufacturing, despite geopolitical tensions. Anthropic's policy controversy tests regulatory compliance..."
- **Chinese (`key_insight_zh`)**: Same rule. Do NOT start with "本视频"、"这个视频"、"本期视频" 等。
  - ❌ "本视频分析了AI供应链在政治紧张局势下..."
  - ✅ "AI供应链在政治紧张局势下仍绕不开中国工程师和制造体系的现实，并拆解了Anthropic政策风波背后的监管服从度测试..."

Add this to the system prompt: "Write as a news digest paragraph, not a video description. Never start with 'This video', 'The video', '本视频', or similar preamble. The reader knows this comes from a video — just give the substance."

### Scope
- DO touch: apps/worker/src/scripts/youtube-insights.ts
- Do NOT touch: apps/web/, assistant-queue/ files, packages/db/
- Git author: JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>

### Verification
```
pnpm --filter @product-tracer/worker typecheck
```

### After completing
1. Create PR → wait for all CI checks ✅ → merge to main
2. Verify: curl -sI https://product-tracer.vercel.app/ returns HTTP 200
3. Update CHANGELOG.md (new entry)
4. Write summary to assistant-queue/RESPONSE.md

---

Execute. Write RESPONSE.md when done.
