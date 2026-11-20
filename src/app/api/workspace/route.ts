import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { prisma } from '@/lib/prisma';
import { workspaceSchema, cleanUrl } from '@/lib/workspace';
import { randomUUID } from 'node:crypto';
export const dynamic = 'force-dynamic';
const key = 'personalWorkspace.v1';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET() {
  if (!await getServerSession(authOptions)) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key } });
    return NextResponse.json(row?.value ? JSON.parse(row.value) : { revision: null, workspace: { version: 1, bookmarks: [] } }, { headers });
  } catch { return NextResponse.json({ error: '收藏读取失败，请稍后重试' }, { status: 503 }); }
}
export async function PUT(request: Request) {
  if (!await getServerSession(authOptions)) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: '来源验证失败' }, { status: 403 });
  try {
    if (Number(request.headers.get('content-length') || 0) > 8_000_000) return NextResponse.json({ error: '文件过大' }, { status: 413 });
    const input = await request.json();
    const workspace = workspaceSchema.parse(input.workspace);
    if (new Set(workspace.bookmarks.map(b => b.id)).size !== workspace.bookmarks.length) return NextResponse.json({ error: '收藏 ID 重复' }, { status: 400 });
    workspace.bookmarks = workspace.bookmarks.map(b => ({ ...b, url: cleanUrl(b.url) }));
    const previous = await prisma.siteSetting.findUnique({ where: { key } });
    if ((previous?.value ? JSON.parse(previous.value).revision : null) !== input.revision) return NextResponse.json({ error: '另一页面更新了收藏，请刷新后重试' }, { status: 409 });
    const document = { revision: randomUUID(), workspace };
    const value = JSON.stringify(document);
    if (previous) {
      const result = await prisma.siteSetting.updateMany({ where: { key, value: previous.value }, data: { value } });
      if (!result.count) return NextResponse.json({ error: '收藏已变化，请刷新后重试' }, { status: 409 });
    } else {
      await prisma.siteSetting.create({ data: { key, value, type: 'json', group: 'personal' } });
    }
    return NextResponse.json(document, { headers });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') return NextResponse.json({ error: '收藏格式不正确，请检查网址和必填项' }, { status: 400 });
    return NextResponse.json({ error: '收藏保存失败，原有内容未被覆盖，请稍后重试' }, { status: 503 });
  }
}
