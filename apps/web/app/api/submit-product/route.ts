import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { submitProduct } from '@/lib/db';

export const dynamic = 'force-dynamic';

const GITHUB_RE = /^https?:\/\/(www\.)?github\.com\/[^/\s]+\/[^/\s]+\/?$/i;

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * POST /api/submit-product
 * Body: { productName, description, productUrl, githubUrl? }
 * Records a product submission for the signed-in user; an async worker reviews
 * it. 401 when not signed in, 400 on validation failure.
 */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ success: false, error: 'unauthenticated' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: 'bad_request' }, { status: 400 });
  }

  const productName = String(body.productName ?? '').trim();
  const description = String(body.description ?? '').trim();
  const productUrl = String(body.productUrl ?? '').trim();
  const githubUrlRaw = String(body.githubUrl ?? '').trim();

  if (!productName || productName.length > 120) {
    return NextResponse.json({ success: false, error: 'Product name is required (≤120 chars).' }, { status: 400 });
  }
  if (description.length < 50 || description.length > 500) {
    return NextResponse.json({ success: false, error: 'Description must be 50–500 characters.' }, { status: 400 });
  }
  if (!isHttpUrl(productUrl)) {
    return NextResponse.json({ success: false, error: 'Product URL must be a valid http(s) URL.' }, { status: 400 });
  }
  if (githubUrlRaw && !GITHUB_RE.test(githubUrlRaw)) {
    return NextResponse.json(
      { success: false, error: 'GitHub URL must look like https://github.com/owner/repo.' },
      { status: 400 },
    );
  }

  try {
    const { id } = await submitProduct(
      user.id,
      productName,
      description,
      productUrl,
      githubUrlRaw || null,
    );
    return NextResponse.json({ success: true, submissionId: id });
  } catch (err) {
    console.error('submit-product failed', err);
    return NextResponse.json({ success: false, error: 'submit_failed' }, { status: 500 });
  }
}
