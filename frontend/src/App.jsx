import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from './api'

const Icon = ({ name, size = 22 }) => {
  const icons = {
    arrow: <><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></>,
    chat: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></>,
    close: <><path d="m18 6-12 12M6 6l12 12"/></>,
    expand: <><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>,
    user: <><path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
    search: <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>,
    card: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M21 19V5a2 2 0 0 0-2-2h-6"/></>,
    home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
    apply: <><path d="M8 3v4M16 3v4M5 9h14M6 5h12a2 2 0 0 1 2 2v12H4V7a2 2 0 0 1 2-2Z"/><path d="m9 14 2 2 4-4"/></>,
    payments: <><path d="M3 6h18M3 10h18M6 15h5M4 4h16a1 1 0 0 1 1 1v14H3V5a1 1 0 0 1 1-1Z"/></>,
    help: <><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.3 2.3 0 1 1 3.5 2c-.9.5-1.3 1-1.3 2M12 17h.01"/></>,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

const money = (value) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value)
const shortDate = (value) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
const route = () => window.location.pathname
const go = (path) => { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')) }

function Brand({ light = false }) {
  return <div className={`brand ${light ? 'brand-light' : ''}`}><span className="brand-mark">♞</span><span>Lloyds Banking</span></div>
}

function Portal() {
  return <main className="portal">
    <header className="portal-header"><Brand light /></header>
    <section className="portal-content">
      <div className="portal-copy"><span className="eyebrow">Personal banking</span><h1>Banking that moves at your pace.</h1><p>See your accounts, follow every transaction and get help whenever you need it.</p></div>
      <div className="portal-actions"><p>Already a customer?</p><button className="button button-dark" onClick={() => go('/login')}>Log in to online banking <span>→</span></button><small>Secure access to your Lloyds Banking accounts</small></div>
    </section>
    <div className="portal-orb orb-one"/><div className="portal-orb orb-two"/>
    <footer>Protected by bank-grade encryption <span>•</span> Privacy <span>•</span> Accessibility</footer>
  </main>
}

function Login({ admin = false }) {
  const [values, setValues] = useState(admin ? { username: '', password: '' } : { email: '', password: '' })
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const submit = async (event) => {
    event.preventDefault(); setError(''); setBusy(true)
    try {
      const result = admin ? await api.adminLogin(values.username, values.password) : await api.login(values.email, values.password)
      localStorage.setItem(admin ? 'lloyds_admin_token' : 'lloyds_token', result.token)
      go(admin ? '/admin' : '/home')
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  return <main className="login-page">
    <section className="login-brand-panel"><Brand light /><div><span className="eyebrow pale">Secure banking</span><h1>{admin ? 'Operations access.' : 'Good to see you again.'}</h1><p>{admin ? 'Review customer information and banking-assistant conversations.' : 'Your accounts are just a secure sign-in away.'}</p></div><p className="security-note"><Icon name="shield" /> Your connection is encrypted</p></section>
    <section className="login-form-panel"><button className="back-link" onClick={() => go('/')}><Icon name="arrow" size={18}/> Back</button><form className="login-form" onSubmit={submit}><span className="eyebrow">{admin ? 'Administration' : 'Online banking'}</span><h2>{admin ? 'Admin sign in' : 'Log in'}</h2><p>Enter your {admin ? 'administrator credentials' : 'registered details'} below.</p>
      <label>{admin ? 'Username' : 'Email address'}<input autoFocus type={admin ? 'text' : 'email'} value={admin ? values.username : values.email} onChange={e => setValues({...values, [admin ? 'username' : 'email']: e.target.value})} required /></label>
      <label>Password<input type="password" value={values.password} onChange={e => setValues({...values, password: e.target.value})} required /></label>
      {error && <div className="form-error">{error}</div>}<button className="button button-primary" disabled={busy}>{busy ? 'Signing in…' : 'Continue'}</button>
      {!admin && <button type="button" className="text-button" onClick={() => alert('Please contact Lloyds Banking support to reset your login details.')}>Forgotten your login details?</button>}
    </form></section>
  </main>
}

function AppHeader({ name, admin = false }) {
  const logout = () => { localStorage.removeItem(admin ? 'lloyds_admin_token' : 'lloyds_token'); go(admin ? '/admin/login' : '/') }
  return <header className="app-header"><Brand/><div className="header-user"><span>{admin ? 'Administrator' : name}</span><button className="icon-button" onClick={logout} aria-label="Log out"><Icon name="logout"/></button></div></header>
}

function ChatWidget() {
  const [open, setOpen] = useState(false); const [expanded, setExpanded] = useState(false); const [input, setInput] = useState(''); const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Hello. How can I help with your banking today?' }]); const bottom = useRef()
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])
  const closeChat = (event) => {
    event.preventDefault()
    event.stopPropagation()
    setExpanded(false)
    setOpen(false)
  }
  const send = async (event) => { event.preventDefault(); const text = input.trim(); if (!text || busy) return; setInput(''); setMessages(m => [...m, {role:'user', text}]); setBusy(true); try { const result = await api.chat(text); setMessages(m => [...m, {role:'assistant', text: result.response}]) } catch(e) { setMessages(m => [...m, {role:'assistant', text: 'I’m sorry, I couldn’t reach banking support. Please try again.'}]) } finally { setBusy(false) } }
  return <>
    {!open && <button type="button" className="chat-launcher" onClick={() => setOpen(true)} aria-label="Open banking assistant"><Icon name="chat"/></button>}
    {open && <section className={`chat-panel ${expanded ? 'chat-expanded' : ''}`} aria-label="Lloyds Banking assistant">
      <div className="chat-head">
        <div><span className="online-dot"/>Lloyds assistant<small>Banking help</small></div>
        <div>
          <button type="button" onClick={() => setExpanded(value => !value)} aria-label={expanded ? 'Restore chat size' : 'Expand chat'}><Icon name="expand" size={19}/></button>
          <button type="button" onClick={closeChat} aria-label="Close chat"><Icon name="close" size={20}/></button>
        </div>
      </div>
      <div className="chat-messages">{messages.map((m,i)=><div className={`chat-message ${m.role}`} key={i}>{m.text}</div>)}{busy && <div className="chat-message assistant typing"><i/><i/><i/></div>}<div ref={bottom}/></div>
      <form className="chat-input" onSubmit={send}><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask about your accounts…"/><button type="submit" aria-label="Send"><Icon name="send" size={19}/></button></form>
    </section>}
  </>
}

function Home() {
  const [data, setData] = useState(null); const [error, setError] = useState(''); const [notice, setNotice] = useState(true); const [tab, setTab] = useState('Summary')
  useEffect(() => { api.me().then(setData).catch(e => { setError(e.message); if (e.message.includes('sign') || e.message.includes('expired')) go('/login') }) }, [])
  if (!data) return <Loading text={error || 'Loading your accounts'} />
  const current = data.accounts.filter(account => account.type === 'current')
  const savings = data.accounts.filter(account => account.type === 'savings')
  const showMock = (label) => alert(`${label} is available in the full Lloyds Banking service.`)
  return <div className="app-shell lloyds-shell"><header className="mobile-header"><div className="mobile-greeting"><span className="mini-logo">♞</span><b>Hi {data.customer.name.split(' ')[0]}</b></div><div><button aria-label="Help" onClick={()=>showMock('Help')}><Icon name="help" size={20}/></button><button aria-label="Profile" onClick={()=>showMock('Profile')}><Icon name="user" size={20}/></button><button aria-label="Log out" onClick={()=>{localStorage.removeItem('lloyds_token');go('/')}}><Icon name="logout" size={20}/></button></div></header><main className="mobile-dashboard"><nav className="summary-tabs">{['Summary','Everyday','Save & Invest','Borrow'].map(item=><button key={item} className={tab===item?'active':''} onClick={()=>setTab(item)}>{item}</button>)}</nav>{notice&&<section className="service-notice"><button aria-label="Dismiss notice" onClick={()=>setNotice(false)}>×</button><p>Some parts of our service aren’t working at the moment</p><button onClick={()=>showMock('Service status')}>Find out more</button></section>}<section className="account-groups">{current.length>0&&<AccountGroup title="Everyday" accounts={current}/>} {savings.length>0&&<AccountGroup title="Save & Invest" accounts={savings}/>}</section></main><BottomNav/><ChatWidget/></div>
}

function AccountGroup({title,accounts}) { return <section className="account-group"><header><b>{title}</b><span>→</span></header>{accounts.map(account=><button className="account-list-row" key={account.account_id} onClick={()=>go(`/account/${account.account_id}`)}><span className="round-account-icon">♞</span><span className="account-list-name"><b>{account.type==='current'?'Classic':'Standard Saver'}</b><small>{account.type==='current'?'Current Account':'Savings Account'} · •••• {account['account number'].slice(-4)}</small></span><strong>{money(account.balance)}</strong><span className="row-arrow">›</span></button>)}</section> }

function BottomNav() { const mock=(label)=>alert(`${label} is available in the full Lloyds Banking service.`); return <nav className="bottom-nav"><button className="active" onClick={()=>go('/home')}><Icon name="home" size={21}/><span>Home</span></button><button onClick={()=>mock('Apply')}><Icon name="apply" size={21}/><span>Apply</span></button><button onClick={()=>mock('Payments')}><Icon name="payments" size={21}/><span>Payments</span></button><button onClick={()=>mock('Search')}><Icon name="search" size={21}/><span>Search</span></button><button onClick={()=>mock('Cards')}><Icon name="card" size={21}/><span>Cards</span></button></nav> }

function AccountDetail({ id }) {
  const [data, setData] = useState(null); const [filter,setFilter]=useState('all'); useEffect(()=>{ api.account(id).then(setData).catch(()=>go('/home')) },[id])
  if (!data) return <Loading text="Loading account" />
  const {account, transactions} = data
  const visible=transactions.filter(txn=>filter==='all'||txn.type===filter)
  const mock=(label)=>alert(`${label} is available in the full Lloyds Banking service.`)
  return <div className="app-shell lloyds-shell"><header className="detail-top"><button aria-label="Back" onClick={()=>go('/home')}><Icon name="arrow" size={21}/></button><b>{account.type==='current'?'Classic':'Standard Saver'}</b><div><button aria-label="Information" onClick={()=>mock('Account information')}><Icon name="help" size={19}/></button><button aria-label="More options" onClick={()=>mock('More options')}>•••</button></div></header><main className="detail-page"><section className="balance-panel"><div><h1>{money(account.balance)}</h1><span>Balance after pending</span></div><div><h2>£0.00</h2><span>Overdraft limit</span></div><small>Account •••• {account['account number'].slice(-4)}</small></section><section className="insight-grid"><button onClick={()=>mock('Rewards')}><span>Rewards</span><b className="pink">♧</b></button><button onClick={()=>mock('Spending insights')}><span>Spending<br/>Insights</span><b className="purple">◒</b></button></section><section className="transaction-panel"><div className="month-filter"><b>September</b><span>All</span></div><div className="transaction-tools"><div><button className={filter==='credit'?'active':''} onClick={()=>setFilter(filter==='credit'?'all':'credit')}>In</button><button className={filter==='debit'?'active':''} onClick={()=>setFilter(filter==='debit'?'all':'debit')}>Out</button></div><div><button aria-label="Download" onClick={()=>mock('Download transactions')}>⇩</button><button aria-label="Search" onClick={()=>mock('Transaction search')}><Icon name="search" size={20}/></button></div></div>{visible.map(txn=><div className="mobile-transaction" key={txn.txn_id}><span className={`transaction-icon ${txn.type}`}>{txn.type==='credit'?'↓':'↑'}</span><div><small>{shortDate(txn.date)}</small><b>{txn.description}</b></div><strong className={txn.type}>{txn.type==='credit'?'+':'−'} {money(txn.amount)}<small>{money(txn['balance after'])}</small></strong><span>›</span></div>)}</section></main><BottomNav/><ChatWidget/></div>
}

function Admin() {
  const [customers,setCustomers]=useState([]); const [conversations,setConversations]=useState([]); const [selected,setSelected]=useState(null); const [detail,setDetail]=useState(null); const [search,setSearch]=useState('')
  useEffect(()=>{ Promise.all([api.customers(),api.conversations()]).then(([c,ch])=>{setCustomers(c);setConversations(ch)}).catch(()=>go('/admin/login')) },[])
  useEffect(()=>{ if(selected) api.customer(selected).then(setDetail) },[selected])
  const filtered=useMemo(()=>{const n=search.toLowerCase(); return conversations.filter(c=>(c.customer_name+' '+c.question+' '+c.response).toLowerCase().includes(n))},[conversations,search])
  return <div className="admin-shell"><AppHeader admin/><main className="admin-main"><section className="admin-title"><div><span className="eyebrow">Operations</span><h1>Customer support</h1><p>Review customer accounts and assistant conversations.</p></div></section><div className="admin-layout"><aside className="customer-list"><h2>Customers</h2>{customers.map(c=><button key={c.customer_id} className={selected===c.customer_id?'selected':''} onClick={()=>setSelected(c.customer_id)}><span>{c.name.split(' ').map(x=>x[0]).join('')}</span><div><b>{c.name}</b><small>{c.accounts.length} account{c.accounts.length!==1?'s':''}</small></div></button>)}</aside><section className="admin-content">{detail ? <CustomerDetail data={detail} close={()=>{setSelected(null);setDetail(null)}}/> : <><div className="conversation-tools"><div><h2>Assistant conversations</h2><p>{filtered.length} conversations</p></div><label className="search-box"><Icon name="search" size={19}/><input placeholder="Search by customer or message" value={search} onChange={e=>setSearch(e.target.value)}/></label></div><div className="conversation-list">{filtered.length ? filtered.map(c=><article key={c.conversation_id}><div className="conversation-meta"><b>{c.customer_name}</b><span>{new Date(c.timestamp).toLocaleString('en-IN')}</span></div><div className="conversation-pair"><div><small>Customer</small><p>{c.question}</p></div><div><small>Assistant</small><p>{c.response}</p></div></div></article>) : <div className="empty-state"><Icon name="chat" size={30}/><h3>No conversations found</h3><p>Customer chats will appear here.</p></div>}</div></>}</section></div></main></div>
}

function CustomerDetail({data,close}) { return <div className="customer-detail"><button className="back-link" onClick={close}><Icon name="arrow" size={18}/> Conversations</button><div className="detail-profile"><span>{data.customer.name.split(' ').map(x=>x[0]).join('')}</span><div><h2>{data.customer.name}</h2><p>{data.customer.email} · {data.customer.phone}</p></div><b>{data.customer['KYC status']}</b></div><div className="profile-facts"><div><span>Customer since</span><b>{shortDate(data.customer['join date'])}</b></div><div><span>Date of birth</span><b>{shortDate(data.customer.DOB)}</b></div><div><span>Address</span><b>{data.customer.address}</b></div></div><h3>Accounts</h3><div className="admin-account-grid">{data.accounts.map(a=><div key={a.account_id}><span>{a.type}</span><b>{money(a.balance)}</b><small>•••• {a['account number'].slice(-4)}</small></div>)}</div><h3>Transactions</h3><div className="compact-transactions">{data.transactions.map(t=><div key={t.txn_id}><span>{shortDate(t.date)}</span><b>{t.description}</b><strong className={t.type}>{t.type==='credit'?'+':'−'}{money(t.amount)}</strong></div>)}</div></div> }

function Loading({text}) { return <div className="loading"><Brand/><span className="loader"/><p>{text}</p></div> }

export default function App() {
  const [path,setPath]=useState(route()); useEffect(()=>{const h=()=>setPath(route()); window.addEventListener('popstate',h); return()=>window.removeEventListener('popstate',h)},[])
  if(path==='/') return <Portal/>; if(path==='/login') return <Login/>; if(path==='/home') return <Home/>; if(path.startsWith('/account/')) return <AccountDetail id={path.split('/')[2]}/>; if(path==='/admin/login') return <Login admin/>; if(path==='/admin') return <Admin/>; return <Portal/>
}
