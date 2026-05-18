import { createClient } from "@supabase/supabase-js";

// 从环境变量读取 Supabase URL 和 anon key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

/**
 * 创建 Supabase client。
 *
 * Server contexts (Next.js SSR / worker) 推荐用带 key 的 client。
 * 浏览器端用 anon key + RLS。
 */
export function createSupabaseClient(
  url?: string,
  key?: string,
) {
  const u = url ?? supabaseUrl;
  const k = key ?? supabaseKey;
  if (!u || !k) {
    throw new Error(
      "Supabase URL and key required. Set SUPABASE_URL and SUPABASE_ANON_KEY env vars.",
    );
  }
  return createClient(u, k);
}
