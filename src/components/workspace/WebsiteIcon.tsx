'use client';
import { useState } from 'react';
import { siteIconSources } from '@/lib/site-icons';

export function WebsiteIcon({ url, title, color }: { url: string; title: string; color: string }) {
  const sources = siteIconSources(url);
  const [sourceIndex, setSourceIndex] = useState(0);
  const source = sources[sourceIndex];
  const letter = title.replace(/^[^\p{L}\p{N}]+/u,'').slice(0,1).toUpperCase() || '栞';
  return <span className={'nav-letter nav-site-icon'+(source?' has-image':'')} style={{color,background:color+'12'}}>
    {source ? <img src={source} width={28} height={28} alt="" aria-hidden="true" loading="lazy" decoding="async" referrerPolicy="no-referrer" draggable={false} onError={()=>setSourceIndex(index=>index+1)}/> : letter}
  </span>;
}
