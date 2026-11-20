// Only public service names live here; personal bookmark URLs stay in the database.
const icons: Record<string, string> = {
  'youtube.com': 'youtube', 'youtu.be': 'youtube', 'music.youtube.com': 'youtubeMusic',
  'bilibili.com': 'bilibili', 'b23.tv': 'bilibili',
  'chatgpt.com': 'chatgpt', 'chat.openai.com': 'chatgpt',
  'claude.ai': 'claude', 'gemini.google.com': 'gemini', 'github.com': 'github',
  'cloudflare.com': 'cloudflare', 'vercel.com': 'vercel',
  'mail.google.com': 'gmail', 'google.com': 'google', 'google.com.hk': 'google',
  'aistudio.google.com': 'aistudio', 'pixiv.net': 'pixiv',
  'reddit.com': 'reddit', 'grok.com': 'grok', 'deepseek.com': 'deepseek',
  'huggingface.co': 'huggingface', 'qwen.ai': 'qwen', 'doubao.com': 'doubao',
  'acfun.cn': 'acfun', 'nicovideo.jp': 'niconico', 'bsky.app': 'bluesky',
  'x.com': 'x', 'twitter.com': 'x', 'instagram.com': 'instagram',
  'mail.qq.com': 'qqmail', 'mail.163.com': 'neteasemail',
  'icloud.com': 'icloud', 'icloud.com.cn': 'icloud', 'notion.so': 'notion',
  'affine.pro': 'affine', 'neon.tech': 'neon', 'neon.com': 'neon',
  'buyee.jp': 'buyee', 'mercari.com': 'mercari', 'op.gg': 'opgg',
  'wikipedia.org': 'wikipedia', 'learn.microsoft.com': 'microsoft',
  'edx.org': 'edx', 'khanacademy.org': 'khanacademy',
};
export function siteIconSources(value: string): string[] {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return [];
    const host = url.hostname.replace(/^www\./, '');
    const match = Object.keys(icons).sort((a,b)=>b.length-a.length).find(domain=>host===domain||host.endsWith('.'+domain));
    const direct = new URL('/favicon.ico', url.origin).href;
    return match ? ['/site-icons/'+icons[match]+'.png', direct] : [direct];
  } catch { return []; }
}
