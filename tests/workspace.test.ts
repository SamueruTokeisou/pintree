import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanUrl, urlKey, workspaceSchema } from '../src/lib/workspace';

test('strips credentials and temporary tracking without destroying resource identity',()=>{
 const url=new URL(cleanUrl('https://user:pass@example.com/forum.php?sid=secret&tid=76972&utm_source=share#post-3'));
 assert.equal(url.username,'');assert.equal(url.password,'');assert.equal(url.searchParams.get('tid'),'76972');assert.equal(url.searchParams.has('sid'),false);assert.equal(url.searchParams.has('utm_source'),false);assert.equal(url.hash,'#post-3');
});
test('normalizes equivalent URLs while preserving distinct forum threads and app routes',()=>{
 assert.equal(urlKey('https://www.example.com/a/?utm_source=x'),urlKey('https://example.com/a'));
 assert.notEqual(urlKey('https://example.com/?tid=1'),urlKey('https://example.com/?tid=2'));
 assert.notEqual(urlKey('https://example.com/#/vault'),urlKey('https://example.com/#/admin'));
});
test('rejects executable bookmark schemes and excessive input',()=>{
 const bookmark={id:'one',title:'Example',url:'javascript:alert(1)',createdAt:'2026-11-20',updatedAt:'2026-11-20'};
 assert.equal(workspaceSchema.safeParse({version:1,bookmarks:[bookmark]}).success,false);
 assert.equal(workspaceSchema.safeParse({version:1,bookmarks:[{...bookmark,url:'https://example.com',title:'x'.repeat(301)}]}).success,false);
});
