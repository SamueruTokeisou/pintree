'use client';
import { signIn } from 'next-auth/react';
import { useState, type FormEvent } from 'react';
import { Bookmark, LockKeyhole, Loader2 } from 'lucide-react';
import '@/components/workspace/workspace.css';
export default function LoginPage() {
  const [loading,setLoading]=useState(false),[error,setError]=useState('');
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setLoading(true);setError('');
    const data=new FormData(event.currentTarget);
    try { const result=await signIn('credentials',{email:data.get('email'),password:data.get('password'),redirect:false});
      if(result?.error) setError('邮箱或密码不正确，请使用原 Pintree 管理员账号。');
      else window.location.href='/';
    } catch {setError('登录失败，请稍后重试。');} finally {setLoading(false);}
  }
  return <main className="nav-login nav-app"><section className="nav-login-art"><a href="/" className="nav-brand"><span className="nav-brand-mark"><Bookmark size={25}/></span><span><b>栞 <i>shiori</i></b><small>Samueru 的上网工作台</small></span></a><div className="nav-login-statement"><span className="nav-eyebrow">YOUR OWN CORNER OF THE INTERNET</span><h1>每一次发现，<br/>都值得<br/><em>好好收藏。</em></h1><p>给熟悉的入口一个位置，<br/>也给偶然的灵感留一枚书签。</p><div className="nav-login-drawing"><Bookmark size={70} strokeWidth={1}/><span>keep what matters.</span></div></div><small>栞 · 为下一次相遇，留一枚书签。</small></section><section className="nav-login-panel"><form onSubmit={submit} className="nav-login-form"><div className="nav-login-lock"><LockKeyhole size={25}/></div><span className="nav-eyebrow">WELCOME BACK, SAMUERU</span><h2>打开你的私人收藏</h2><p>使用原 Pintree 管理员账号登录。</p><label>邮箱<input name="email" type="email" autoComplete="username" required/></label><label>密码<input name="password" type="password" autoComplete="current-password" required/></label>{error&&<p role="alert" className="nav-form-error">{error}</p>}<button className="nav-primary" disabled={loading}>{loading?<><Loader2 size={18} className="nav-spin"/>正在登录…</>:'进入工作台'}</button><small><LockKeyhole size={13}/> 收藏仅在登录后可见</small></form></section></main>;
}
