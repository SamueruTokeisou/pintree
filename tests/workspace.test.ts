import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanUrl, urlKey, workspaceSchema, exportBrowserHtml } from '../src/lib/workspace';

test('strips credentials and temporary tracking without destroying resource identity',()=>{
 const url=new URL(cleanUrl('https://user:pass@example.com/forum.php?sid=secret&tid=76972&utm_source=share#post-3'));
 assert.equal(url.username,'');assert.equal(url.password,'');assert.equal(url.searchParams.get('tid'),'76972');assert.equal(url.searchParams.has('sid'),false);assert.equal(url.searchParams.has('utm_source'),false);assert.equal(url.hash,'#post-3');
});
test('normalizes equivalent URLs while preserving distinct forum threads and app routes',()=>{
 assert.equal(urlKey('https://www.example.com/a/?utm_source=x'),urlKey('https://www.example.com/a'));
 assert.notEqual(urlKey('https://www.example.com/'),urlKey('https://example.com/'));
 assert.notEqual(urlKey('https://example.com/?tid=1'),urlKey('https://example.com/?tid=2'));
 assert.notEqual(urlKey('https://example.com/#/vault'),urlKey('https://example.com/#/admin'));
});
test('rejects executable bookmark schemes and excessive input',()=>{
 const bookmark={id:'one',title:'Example',url:'javascript:alert(1)',createdAt:'2026-11-20',updatedAt:'2026-11-20'};
 assert.equal(workspaceSchema.safeParse({version:1,bookmarks:[bookmark]}).success,false);
 assert.equal(workspaceSchema.safeParse({version:1,bookmarks:[{...bookmark,url:'https://example.com',title:'x'.repeat(301)}]}).success,false);
});

test('browser export preserves two folder levels, escapes content, and excludes trash',()=>{
 const base={id:'one',title:'A <script> & B',url:'https://example.com/?a=1&b=2',category:'学习与阅读',subcategory:'日语',createdAt:'2026-11-20',updatedAt:'2026-11-20'};
 const data=workspaceSchema.parse({version:1,bookmarks:[base,{...base,id:'two',title:'Removed bookmark',status:'trashed'}]});
 const html=exportBrowserHtml(data);
 assert.ok(html.includes('<H3>学习与阅读</H3>'));
 assert.ok(html.includes('<H3>日语</H3>'));
 assert.ok(html.includes('A &lt;script&gt; &amp; B'));
 assert.ok(html.includes('?a=1&amp;b=2'));
 assert.ok(!html.includes('Removed bookmark'));
});
