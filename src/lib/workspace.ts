import { z } from 'zod';
export const categories = [
  { name: '学习与阅读', subtitle: '语言、知识与书页', icon: 'BookOpen', color: '#4c6eae' },
  { name: '创作与素材', subtitle: '把灵感变成作品', icon: 'Palette', color: '#b36c40' },
  { name: 'AI 与自动化', subtitle: '让工具多做一点', icon: 'Sparkles', color: '#8261ad' },
  { name: '开发与服务器', subtitle: '代码与数字基础设施', icon: 'Code2', color: '#467d85' },
  { name: '影音与 ACG', subtitle: '故事、音乐与同好', icon: 'Clapperboard', color: '#b25e7b' },
  { name: '游戏', subtitle: '另一个世界的入口', icon: 'Gamepad2', color: '#7d8644' },
  { name: '日常与工具', subtitle: '日常事务，顺手完成', icon: 'Coffee', color: '#537fa4' },
  { name: '我的空间', subtitle: '自己的数字小天地', icon: 'House', color: '#397b59' },
];
export const bookmarkSchema = z.object({
  id: z.string().min(1).max(120), title: z.string().min(1).max(300),
  url: z.string().max(4096).url().refine(value => /^https?:\/\//i.test(value)),
  description: z.string().max(1500).default(''), category: z.string().max(80).default('待整理'),
  subcategory: z.string().max(80).default(''), tags: z.array(z.string().max(60)).max(30).default([]),
  favorite: z.boolean().default(false), pinOrder: z.number().int().min(0).max(9999).default(100), status: z.enum(['active', 'inbox', 'archived', 'trashed']).default('active'),
  kind: z.enum(['site', 'article', 'video', 'project']).default('site'),
  createdAt: z.string().max(80), updatedAt: z.string().max(80),
  originalFolder: z.string().max(500).optional(), sources: z.array(z.string().max(100)).max(10).optional(),
  reviewNote: z.string().max(500).optional(),
});
export const workspaceSchema = z.object({ version: z.literal(1), bookmarks: z.array(bookmarkSchema).max(10000) });
export type NavBookmark = z.infer<typeof bookmarkSchema>;
export type WorkspaceData = z.infer<typeof workspaceSchema>;
export function cleanUrl(value: string) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('仅支持 http 或 https 网址');
  url.username = ''; url.password = '';
  const sensitive = /^(sid|session|sessionid|token|access_token|auth|authorization|password|passwd|pwd|key|api_key|chk|email|userid|security_verify_img)$/i;
  for (const key of Array.from(url.searchParams.keys())) {
    if (sensitive.test(key) || /^(utm_|spm|fbclid|gclid|_t$|nlc$)/i.test(key)) url.searchParams.delete(key);
  }
  return url.toString();
}
export function urlKey(value: string) {
  const url = new URL(cleanUrl(value));
  url.hostname = url.hostname.replace(/^www\./, '');
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  url.searchParams.sort();
  return url.toString();
}
