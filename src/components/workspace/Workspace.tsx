'use client';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { signOut } from 'next-auth/react';
import { Bookmark, Search, Plus, Star, Archive, Inbox, Trash2, LayoutGrid, List, Menu, X, Download, Upload, Settings2, LogOut, BookOpen, Palette, Sparkles, Code2, Clapperboard, Gamepad2, Coffee, House, FolderOpen, Pencil, RotateCcw, Check, Loader2, LockKeyhole, BookmarkPlus, ChevronRight, Clock3, Sun, Moon } from 'lucide-react';
import { categories, cleanUrl, urlKey, workspaceSchema, exportBrowserHtml, type NavBookmark, type WorkspaceData } from '@/lib/workspace';
import './workspace.css';

const iconMap: Record<string, typeof Bookmark> = { BookOpen, Palette, Sparkles, Code2, Clapperboard, Gamepad2, Coffee, House };
const views = [
  { id: 'home', label: '我的首页', icon: House }, { id: 'all', label: '全部收藏', icon: Bookmark },
  { id: 'favorites', label: '常用入口', icon: Star }, { id: 'inbox', label: '待整理', icon: Inbox },
  { id: 'archived', label: '归档', icon: Archive }, { id: 'trashed', label: '回收站', icon: Trash2 },
];
const topics = [
  { title: '日语听读', note: '从一句话，到一个新世界', icon: BookOpen, tag: '日语', color: 'blue' },
  { title: '字幕与音频', note: '听见、记录，再分享', icon: Clapperboard, tag: '字幕与音频', color: 'rose' },
  { title: '服务器维护', note: '照顾自己的数字空间', icon: Code2, tag: '运维', color: 'green' },
];
function matchesTag(b: NavBookmark, tag: string) { return tag === '字幕与音频' ? b.tags.some(t => ['字幕', '音频', '语音'].includes(t)) : b.tags.includes(tag); }
const blank: WorkspaceData = { version: 1, bookmarks: [] };
function hostname(url: string) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } }
function download(name: string, content: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Workspace() {
  const [data, setData] = useState<WorkspaceData>(blank);
  const [revision, setRevision] = useState<string | null>(null);
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [view, setView] = useState('home'), [query, setQuery] = useState(''), [sub, setSub] = useState(''), [tag, setTag] = useState('');
  const [layout, setLayout] = useState('grid'), [sort, setSort] = useState('default'), [kind, setKind] = useState('all');
  const [mobile, setMobile] = useState(false), [settings, setSettings] = useState(false), [dark, setDark] = useState(false);
  const [editing, setEditing] = useState<Partial<NavBookmark> | null>(null);
  const [importing, setImporting] = useState<NavBookmark[] | null>(null);
  const [importInfo, setImportInfo] = useState('');
  const searchRef = useRef<HTMLInputElement>(null), fileRef = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  useEffect(() => {
    const theme = localStorage.getItem('samueru-theme') === 'dark'; setDark(theme);
    const preferredLayout = localStorage.getItem('samueru-layout'); if (preferredLayout) setLayout(preferredLayout);
    fetch('/api/workspace', { cache: 'no-store' }).then(async response => {
      if (response.status === 401) { window.location.href = '/login'; return; }
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setData(workspaceSchema.parse(result.workspace)); setRevision(result.revision);
    }).catch(e => setError(e.message || '读取失败')).finally(() => setLoading(false));
    function keyboard(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchRef.current?.focus(); }
      if (event.key === 'Escape') { setMobile(false); setEditing(null); setSettings(false); setImporting(null); }
    }
    window.addEventListener('keydown', keyboard); return () => window.removeEventListener('keydown', keyboard);
  }, []);
  useEffect(() => { if (notice) { const timer = setTimeout(() => setNotice(''), 4500); return () => clearTimeout(timer); } }, [notice]);
  useEffect(() => {
    const open = !!(editing || settings || importing || mobile);
    if (!open) return;
    const oldOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const focusBefore = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]') || document.querySelector<HTMLElement>('.nav-sidebar');
    const focusables = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,textarea,a[href]') || []).filter(e => e.getClientRects().length);
    focusables()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return; const elements = focusables(); const first = elements[0], last = elements[elements.length-1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', trap); focusBefore?.focus(); };
  }, [editing, settings, importing, mobile]);

  async function save(next: WorkspaceData, message: string) {
    if (busy.current) return false; busy.current = true; setSaving(true); setError('');
    try {
      const response = await fetch('/api/workspace', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision, workspace: next }) });
      if (response.status === 401) { window.location.href = '/login'; return false; }
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setData(result.workspace); setRevision(result.revision); setNotice(message); return true;
    } catch (e) { setError(e instanceof Error ? e.message : '保存失败'); return false; }
    finally { setSaving(false); busy.current = false; }
  }
  function navigate(id: string) { setView(id); setSub(''); setTag(''); setQuery(''); setKind('all'); setMobile(false); }
  async function update(bookmark: NavBookmark, changes: Partial<NavBookmark>, message: string) {
    await save({ ...data, bookmarks: data.bookmarks.map(b => b.id === bookmark.id ? { ...b, ...changes, updatedAt: new Date().toISOString() } : b) }, message);
  }
  const active = data.bookmarks.filter(b => b.status === 'active' || b.status === 'inbox');
  const favorite = active.filter(b => b.favorite).sort((a,b) => a.pinOrder - b.pinOrder);
  const category = categories.find(c => c.name === view);
  const counts: Record<string, number> = {
    all: active.length, favorites: favorite.length, inbox: data.bookmarks.filter(b => b.status === 'inbox').length,
    archived: data.bookmarks.filter(b => b.status === 'archived').length, trashed: data.bookmarks.filter(b => b.status === 'trashed').length,
  };
  const filtered = useMemo(() => {
    let bookmarks = data.bookmarks.filter(b => {
      if (view === 'archived' || view === 'trashed') return b.status === view;
      if (!['active', 'inbox'].includes(b.status)) return false;
      if (view === 'favorites') return b.favorite;
      if (view === 'inbox') return b.status === 'inbox';
      if (categories.some(c => c.name === view)) return b.category === view;
      return true;
    });
    if (sub) bookmarks = bookmarks.filter(b => b.subcategory === sub);
    if (tag) bookmarks = bookmarks.filter(b => matchesTag(b, tag));
    if (kind !== 'all') bookmarks = bookmarks.filter(b => b.kind === kind);
    const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    if (words.length) bookmarks = bookmarks.filter(b => words.every(w => [b.title, b.description, b.url, b.category, b.subcategory, ...b.tags].join(' ').toLocaleLowerCase().includes(w)));
    if (sort === 'name') bookmarks.sort((a,b) => a.title.localeCompare(b.title, 'zh-CN'));
    else if (sort === 'recent') bookmarks.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    else bookmarks.sort((a,b) => Number(b.favorite)-Number(a.favorite) || categories.findIndex(c=>c.name===a.category)-categories.findIndex(c=>c.name===b.category));
    return bookmarks;
  }, [data, view, query, sub, tag, sort, kind]);
  const home = view === 'home' && !query && !tag;
  const pageTitle = category?.name || views.find(v=>v.id===view)?.label || '专题收藏';
  const subcategories = [...new Set(active.filter(b=>b.category===view).map(b=>b.subcategory).filter(Boolean))];
  const tags = [...new Set(filtered.flatMap(b=>b.tags))].slice(0,16);
  function startAdd() { setEditing({ category: category?.name || '待整理', subcategory: '', title: '', url: '', description: '', tags: [], status: category ? 'active' : 'inbox', kind:'site', favorite:false }); }
  async function submitBookmark(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing) return;
    const form = new FormData(event.currentTarget);
    try {
      const url = cleanUrl(String(form.get('url')).trim());
      if (data.bookmarks.some(b=>b.id!==editing.id && b.status!=='trashed' && urlKey(b.url)===urlKey(url))) { setError('已经收藏过这个网址，请编辑已有收藏。'); return; }
      const now = new Date().toISOString();
      const item: NavBookmark = {
        ...editing, id: editing.id || crypto.randomUUID(), title: String(form.get('title')).trim(), url,
        description:String(form.get('description')).trim(), category:String(form.get('category')), subcategory:String(form.get('subcategory')).trim(),
        tags:[...new Set(String(form.get('tags')).split(/[,，]/).map(v=>v.trim()).filter(Boolean))],
        favorite:form.get('favorite')==='on', pinOrder:Number(form.get('pinOrder') || 100), status:String(form.get('status')) as NavBookmark['status'], kind:String(form.get('kind')) as NavBookmark['kind'],
        createdAt: editing.createdAt || now, updatedAt:now,
      };
      if (await save({ ...data, bookmarks: editing.id ? data.bookmarks.map(b=>b.id===editing.id?item:b) : [...data.bookmarks,item] }, editing.id?'收藏已更新':'已收进收藏')) setEditing(null);
    } catch { setError('请输入有效的 http 或 https 网址。'); }
  }
  async function readImport(file?: File) {
    if (!file) return;
    try {
      if (file.size > 8_000_000) throw new Error('文件不能超过 8 MB');
      const text = await file.text(); let items: NavBookmark[];
      if (file.name.toLowerCase().endsWith('.json')) {
        const json = JSON.parse(text); items = workspaceSchema.parse(json.workspace || json).bookmarks;
      } else {
        const doc = new DOMParser().parseFromString(text, 'text/html');
        const links = Array.from(doc.querySelectorAll('a[href]'));
        items = links.filter(a=>/^https?:\/\//i.test(a.getAttribute('href')||'')).map(a=>({
          id:crypto.randomUUID(), title:(a.textContent||hostname(a.getAttribute('href')!)).trim(), url:cleanUrl(a.getAttribute('href')!),
          description:'', category:'待整理', subcategory:'', tags:[], status:'inbox', kind:'site', favorite:false, pinOrder:100,
          createdAt: new Date().toISOString(), updatedAt:new Date().toISOString(), sources:['浏览器导入'],
        }));
        if (!items.length) throw new Error('文件里没有可导入的收藏');
      }
      const known = new Set(data.bookmarks.filter(b=>b.status!=='trashed').map(b=>urlKey(b.url)));
      const fresh: NavBookmark[] = [];
      for (const b of items) { const key=urlKey(b.url); if (!known.has(key)) { known.add(key); fresh.push({...b,id:crypto.randomUUID(),url:cleanUrl(b.url)}); } }
      setImportInfo('发现 '+items.length+' 条收藏，跳过 '+(items.length-fresh.length)+' 条重复，将新增 '+fresh.length+' 条。');
      setImporting(fresh); setSettings(false);
    } catch(e) { setError(e instanceof Error ? e.message : '文件读取失败'); }
    finally { if(fileRef.current) fileRef.current.value=''; }
  }
  function exportHtml() {
    const html = exportBrowserHtml(data);
    download('Samueru-收藏夹.html',html,'text/html;charset=utf-8'); setNotice('已导出浏览器收藏夹');
  }
  function card(b: NavBookmark) {
    const color = categories.find(c=>c.name===b.category)?.color || '#567165';
    return <article className="nav-card" key={b.id}>
      <a className="nav-card-main" href={b.url} target="_blank" rel="noopener noreferrer" title={b.title+' · '+b.url}>
        <span className="nav-letter" style={{color,background:color+'12'}}>{b.title.replace(/^[^\p{L}\p{N}]+/u,'').slice(0,1).toUpperCase() || '栞'}</span>
        <span className="nav-card-copy"><strong>{b.title}</strong><span>{b.description || b.subcategory || hostname(b.url)}</span><small>{hostname(b.url)}</small></span>
      </a>
      <div className="nav-card-bottom">
        <button className="nav-category-label" onClick={()=>{navigate(b.category);setSub(b.subcategory);}}>{b.subcategory || b.category}</button>
        <div className="nav-card-actions">
          {b.status==='trashed' ? <button disabled={saving} aria-label={'恢复 '+b.title} title="恢复" onClick={()=>update(b,{status:'inbox'},'已恢复到待整理')}><RotateCcw size={15}/></button> : <>
            <button disabled={saving} className={b.favorite?'starred':''} aria-label={(b.favorite?'取消常用 ':'设为常用 ')+b.title} title={b.favorite?'取消常用':'设为常用'} onClick={()=>update(b,{favorite:!b.favorite},b.favorite?'已移出常用':'已设为常用')}><Star size={15} fill={b.favorite?'currentColor':'none'}/></button>
            <button aria-label={'编辑 '+b.title} title="编辑" onClick={()=>setEditing(b)}><Pencil size={15}/></button>
          </>}
        </div>
      </div>
    </article>;
  }
  return <div className={'nav-app'+(dark?' nav-dark':'')}>
    {mobile && <button className="nav-shade" aria-label="关闭导航" onClick={()=>setMobile(false)}/>}
    <aside className={'nav-sidebar'+(mobile?' open':'')}>
      <a className="nav-brand" href="/" aria-label="栞，返回首页"><span className="nav-brand-mark"><Bookmark size={25}/></span><span><b>栞 <i>shiori</i></b><small>Samueru 的上网工作台</small></span></a>
      <nav aria-label="收藏导航"><div className="nav-section-label">我的收藏</div>
        {views.slice(0,4).map(v=><button key={v.id} className={'nav-item'+(view===v.id?' selected':'')} onClick={()=>navigate(v.id)}><v.icon size={18}/><span>{v.label}</span>{counts[v.id]!==undefined&&<em>{counts[v.id]}</em>}</button>)}
        <div className="nav-section-label nav-section-gap">按主题探索</div>
        {categories.map(c=>{const Icon=iconMap[c.icon];return <button key={c.name} className={'nav-item'+(view===c.name?' selected':'')} onClick={()=>navigate(c.name)}><Icon size={18}/><span>{c.name}</span><em>{active.filter(b=>b.category===c.name).length}</em></button>;})}
        <div className="nav-section-label nav-section-gap">收好，留待以后</div>
        {views.slice(4).map(v=><button key={v.id} className={'nav-item'+(view===v.id?' selected':'')} onClick={()=>navigate(v.id)}><v.icon size={18}/><span>{v.label}</span><em>{counts[v.id]}</em></button>)}
      </nav>
      <div className="nav-sidebar-bottom"><button className="nav-item" onClick={()=>setSettings(true)}><Settings2 size={18}/><span>整理与备份</span></button><div className="nav-private"><LockKeyhole size={13}/> 私人空间 · 登录后可见</div></div>
    </aside>
    <div className="nav-main">
      <header className="nav-topbar"><div><button className="nav-mobile-toggle nav-icon-button" onClick={()=>setMobile(true)} aria-label="打开导航"><Menu size={21}/></button><span className="nav-breadcrumb">我的收藏 <ChevronRight size={14}/> <b>{tag || pageTitle}</b></span></div>
        <div className="nav-top-actions"><span className="nav-save-state">{saving?<><Loader2 size={14} className="nav-spin"/> 保存中</>:<><LockKeyhole size={13}/> 仅自己可见</>}</span><button className="nav-icon-button" aria-label={dark?'切换浅色':'切换深色'} onClick={()=>{setDark(!dark);localStorage.setItem('samueru-theme',String(!dark?'dark':'light'));}}>{dark?<Sun size={18}/>:<Moon size={18}/>}</button><button className="nav-avatar" onClick={()=>setSettings(true)} aria-label="个人设置">S</button></div>
      </header>
      <main className="nav-content">
        {home?<section className="nav-welcome"><span className="nav-eyebrow">A LITTLE CORNER OF THE INTERNET</span><h1>收藏有归处，<span>灵感随时可达。</span></h1><p>熟悉的入口，值得留下的发现。欢迎回到你的数字小天地。</p></section>:<section className="nav-page-heading"><span className="nav-eyebrow">YOUR PERSONAL COLLECTION</span><h1>{query?'搜索收藏':tag || pageTitle}</h1><p>{category?.subtitle || (view==='inbox'?'先收下，再慢慢找到它的位置。':view==='archived'?'暂时放下，需要时依然找得到。':view==='trashed'?'移出的收藏留在这里，可以随时恢复。':'每一个收藏，都有再次相遇的理由。')}</p></section>}
        <div className="nav-search"><Search size={22}/><input ref={searchRef} aria-label="搜索收藏" placeholder="找一个网站、一篇文章，或一点灵感…" value={query} onChange={e=>setQuery(e.target.value)}/>{query?<button className="nav-icon-button" aria-label="清除搜索" onClick={()=>setQuery('')}><X size={18}/></button>:<kbd>Ctrl K</kbd>}</div>
        {error&&<div className="nav-alert" role="alert">{error}<button onClick={()=>setError('')} aria-label="关闭错误提示"><X size={16}/></button></div>}
        {loading?<div className="nav-empty"><Loader2 className="nav-spin" size={28}/><h2>正在打开你的收藏…</h2></div>:home?<>
          <section className="nav-block"><div className="nav-block-heading"><h2><Star size={19}/> 常用入口 <small>{favorite.length}</small></h2><button onClick={()=>navigate('favorites')}>查看全部 <ChevronRight size={15}/></button></div>
            {favorite.length?<div className="nav-card-grid">{favorite.slice(0,12).map(card)}</div>:<div className="nav-empty nav-empty-small"><Star size={26}/><h3>把常用网站放在这里</h3><p>点击收藏卡片上的星标，就能在首页快速打开。</p><button className="nav-secondary" onClick={()=>navigate('all')}>浏览全部收藏</button></div>}
          </section>
          <section className="nav-block"><div className="nav-block-heading"><h2><FolderOpen size={19}/> 按主题探索</h2><span>{active.length} 个值得保留的入口</span></div><div className="nav-category-grid">{categories.map(c=>{const Icon=iconMap[c.icon];return <button key={c.name} className="nav-category-card" onClick={()=>navigate(c.name)}><span className="nav-category-icon" style={{color:c.color,background:c.color+'12'}}><Icon size={23}/></span><strong>{c.name}</strong><p>{c.subtitle}</p><span>{active.filter(b=>b.category===c.name).length} 个收藏 <ChevronRight size={14}/></span></button>;})}</div></section>
          <section className="nav-block"><div className="nav-block-heading"><h2><Sparkles size={19}/> 此刻，想做什么？</h2><span>跨分类的专题小径</span></div><div className="nav-topic-grid">{topics.map(t=><button key={t.tag} className={'nav-topic '+t.color} onClick={()=>{navigate('all');setTag(t.tag);}}><t.icon size={27}/><strong>{t.title}</strong><span>{t.note}</span><small>{active.filter(b=>matchesTag(b,t.tag)).length} 个收藏</small></button>)}</div></section>
          <section className="nav-block"><div className="nav-block-heading"><h2><Clock3 size={19}/> 最近收下</h2><button onClick={()=>{navigate('all');setSort('recent');}}>查看全部 <ChevronRight size={15}/></button></div><div className="nav-card-grid">{[...active].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,4).map(card)}</div></section>
          {!!counts.inbox&&<button className="nav-inbox-banner" onClick={()=>navigate('inbox')}><Inbox size={22}/><span><strong>{counts.inbox} 个收藏，等你安放</strong><small>抽一点时间，让下一次查找更轻松。</small></span><ChevronRight size={20}/></button>}
        </>:<>
          {!!subcategories.length&&<div className="nav-chip-row"><button className={!sub?'active':''} onClick={()=>setSub('')}>全部主题</button>{subcategories.map(s=><button className={sub===s?'active':''} key={s} onClick={()=>setSub(s)}>{s}</button>)}</div>}
          <div className="nav-results-toolbar"><div><b>{filtered.length}</b> 个收藏 {tag&&<button className="nav-active-tag" onClick={()=>setTag('')}>#{tag} <X size={13}/></button>}</div><div>
            <select aria-label="内容类型" value={kind} onChange={e=>setKind(e.target.value)}><option value="all">所有类型</option><option value="site">网站入口</option><option value="article">文章与资料</option><option value="video">视频</option><option value="project">项目</option></select>
            <select aria-label="排序方式" value={sort} onChange={e=>setSort(e.target.value)}><option value="default">常用优先</option><option value="recent">最近添加</option><option value="name">名称排序</option></select>
            <div className="nav-view-switch">{[{id:'grid',icon:LayoutGrid,label:'卡片视图'},{id:'list',icon:List,label:'列表视图'}].map(v=><button key={v.id} aria-label={v.label} aria-pressed={layout===v.id} className={layout===v.id?'active':''} onClick={()=>{setLayout(v.id);localStorage.setItem('samueru-layout',v.id);}}><v.icon size={17}/></button>)}</div>
          </div></div>
          {!tag&&tags.length>0&&<div className="nav-tags">{tags.map(t=><button key={t} onClick={()=>setTag(t)}>#{t}</button>)}</div>}
          {filtered.length?<div className={'nav-card-grid'+(layout==='list'?' nav-list':'')}>{filtered.map(card)}</div>:<div className="nav-empty"><Search size={32}/><h2>{query?'还没找到这个收藏':'这里还留着位置'}</h2><p>{query?'试试网站名称、用途、标签或域名。':'收下一个新发现，或者从备份导入收藏。'}</p><button className="nav-secondary" onClick={startAdd}><Plus size={16}/> 添加收藏</button></div>}
        </>}
        <footer className="nav-footer"><span>栞 <i>shiori</i> · 为下一次相遇，留一枚书签。</span><span>Samueru 的私人收藏</span></footer>
      </main>
      <button className="nav-add-float" disabled={loading||saving} onClick={startAdd}><Plus size={20}/><span>收下新发现</span></button>
    </div>
    {notice&&<div className="nav-toast" role="status"><Check size={18}/>{notice}</div>}
    <input ref={fileRef} type="file" className="nav-hidden" accept=".json,.html,.htm" aria-label="导入收藏文件" onChange={e=>readImport(e.target.files?.[0])}/>
    {editing&&<div className="nav-modal-backdrop" onClick={e=>{if(e.target===e.currentTarget&&!saving)setEditing(null);}}><section className="nav-modal" role="dialog" aria-modal="true" aria-labelledby="edit-title"><div className="nav-modal-title"><div><span className="nav-eyebrow">KEEP SOMETHING GOOD</span><h2 id="edit-title">{editing.id?'整理这个收藏':'收下一个新发现'}</h2></div><button className="nav-icon-button" onClick={()=>setEditing(null)} aria-label="关闭编辑"><X size={21}/></button></div>
      {error&&<p className="nav-form-error" role="alert">{error}</p>}
      <form onSubmit={submitBookmark} className="nav-form"><label>名称<input name="title" defaultValue={editing.title} required maxLength={300}/></label><label>网址<input name="url" type="url" defaultValue={editing.url} placeholder="https://" required/></label><label>一句话说明<textarea name="description" defaultValue={editing.description} rows={2} maxLength={1500} placeholder="下次来这里，可以做什么？"/></label>
        <div className="nav-form-row"><label>主分类<select name="category" defaultValue={editing.category}><option>待整理</option>{categories.map(c=><option key={c.name}>{c.name}</option>)}</select></label><label>二级主题<input name="subcategory" defaultValue={editing.subcategory} maxLength={80} list="nav-subcategories"/><datalist id="nav-subcategories">{[...new Set(active.map(b=>b.subcategory))].filter(Boolean).map(s=><option key={s}>{s}</option>)}</datalist></label></div>
        <label>标签<input name="tags" defaultValue={editing.tags?.join(', ')} placeholder="日语, 字幕, 工具（用逗号分隔）"/></label>
        <div className="nav-form-row"><label>状态<select name="status" defaultValue={editing.status}><option value="active">已整理</option><option value="inbox">待整理</option><option value="archived">归档</option></select></label><label>内容类型<select name="kind" defaultValue={editing.kind}><option value="site">网站入口</option><option value="article">文章与资料</option><option value="video">视频</option><option value="project">项目</option></select></label></div>
        <div className="nav-form-row"><label className="nav-check-label"><input type="checkbox" name="favorite" defaultChecked={editing.favorite}/>设为常用入口</label><label>常用顺序（小的在前）<input name="pinOrder" type="number" min="0" max="9999" defaultValue={editing.pinOrder ?? 100}/></label></div>
        {editing.reviewNote&&<p className="nav-review-note">{editing.reviewNote}</p>}
        <div className="nav-modal-actions">{editing.id&&<button type="button" className="nav-trash-button" disabled={saving} onClick={async()=>{if(await save({...data,bookmarks:data.bookmarks.map(b=>b.id===editing.id?{...b,status:'trashed',updatedAt:new Date().toISOString()}:b)},'已移至回收站，可以随时恢复'))setEditing(null);}}><Trash2 size={16}/>移到回收站</button>}<button className="nav-secondary" type="button" onClick={()=>setEditing(null)}>取消</button><button className="nav-primary" disabled={saving}>{saving?'正在保存…':'保存收藏'}</button></div>
      </form></section></div>}
    {settings&&<div className="nav-modal-backdrop"><section className="nav-modal nav-settings" role="dialog" aria-modal="true" aria-labelledby="settings-title"><div className="nav-modal-title"><div><span className="nav-eyebrow">A WELL-KEPT COLLECTION</span><h2 id="settings-title">整理与备份</h2></div><button className="nav-icon-button" onClick={()=>setSettings(false)} aria-label="关闭设置"><X size={21}/></button></div>
      <p className="nav-settings-intro">收藏保存在你的私人工作台。导出一份备份，让它们始终属于你。</p>
      <button className="nav-settings-row" onClick={()=>fileRef.current?.click()}><Upload size={22}/><span><strong>导入收藏</strong><small>浏览器 HTML 或工作台 JSON，自动跳过重复网址</small></span><ChevronRight size={18}/></button>
      <button className="nav-settings-row" onClick={()=>{download('Samueru-工作台备份-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(data,null,2));setNotice('已导出完整备份');}}><Download size={22}/><span><strong>完整备份 · JSON</strong><small>保留分类、标签、常用和归档状态，含回收站</small></span><ChevronRight size={18}/></button>
      <button className="nav-settings-row" onClick={exportHtml}><BookmarkPlus size={22}/><span><strong>导出浏览器收藏夹 · HTML</strong><small>可导入 Edge、Chrome 等浏览器</small></span><ChevronRight size={18}/></button>
      <div className="nav-settings-hint"><LockKeyhole size={18}/><span>仅登录后可以查看和管理。备份可能包含个人链接，请妥善保存。</span></div>
      <div className="nav-settings-footer"><a href="/admin/collections">原 Pintree 后台</a><button onClick={()=>signOut({callbackUrl:'/login'})}><LogOut size={16}/>退出登录</button></div>
    </section></div>}
    {importing&&<div className="nav-modal-backdrop"><section className="nav-modal nav-settings" role="dialog" aria-modal="true" aria-labelledby="import-title"><div className="nav-modal-title"><h2 id="import-title">把收藏带回来</h2><button className="nav-icon-button" aria-label="取消导入" onClick={()=>setImporting(null)}><X size={20}/></button></div><p>{importInfo}</p><p className="nav-settings-intro">本次导入只添加新收藏，现有内容会保留。浏览器 HTML 中的新收藏会进入待整理。</p>{error&&<p role="alert" className="nav-form-error">{error}</p>}<div className="nav-modal-actions"><button className="nav-secondary" onClick={()=>setImporting(null)}>取消</button><button className="nav-primary" disabled={saving||!importing.length} onClick={async()=>{if(await save({...data,bookmarks:[...data.bookmarks,...importing]},'收藏已导入'))setImporting(null);}}>导入 {importing.length} 个收藏</button></div></section></div>}
  </div>;
}
