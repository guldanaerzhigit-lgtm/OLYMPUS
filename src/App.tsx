import { useEffect, useState } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { addDoc, collection, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { ArrowRight, Award, BookOpen, Building2, CheckCircle2, ChevronDown, Globe2, GraduationCap, LockKeyhole, Menu, ShieldCheck, Sparkles, Trophy, Users, X } from "lucide-react";
import { auth, db, firebaseConfigured } from "./firebase";

type Lang = "kk" | "ru";
const copy = {
  kk: {
    nav: ["Олимпиадалар", "Мектептерге", "Мүмкіндіктер", "Байланыс"],
    login: "Кіру", join: "Мектепті қосу", badge: "Білім • Бәсеке • Болашақ",
    title: "Әр оқушының", accent: "жеңіске жолы", desc: "Мектеп олимпиадаларын ұйымдастыруға, оқушылардың білімін дамытуға және нәтижелерді бір платформада басқаруға арналған цифрлық кеңістік.",
    start: "Платформаға қосылу", explore: "Мүмкіндіктерді көру", schools: "Мектептер", students: "Оқушылар", olympiads: "Олимпиадалар", subjects: "Пәндер",
    why: "Бір платформа. Барлық мектеп. Ортақ мүмкіндік.", sub: "OLYMPUS мектептерге олимпиаданы жоспарлаудан бастап қорытынды нәтижеге дейінгі процесті басқаруға көмектеседі.",
    cards: [["Мектептерге арналған кабинет","Әр мектептің жеке кеңістігі, мұғалімдер мен сыныптарды басқару."],["Олимпиадалар конструкторы","Пән, сынып, уақыт және тапсырмалар бойынша олимпиада құру."],["Ашық рейтинг және нәтиже","Оқушылардың жетістіктерін бақылау, талдау және сертификаттау."]],
    access: "Кімдерге арналған?", roles: [["Платформа әкімшісі","Барлық мектептерді, өтінімдерді және олимпиадаларды басқарады."],["Мектеп әкімшісі","Мұғалімдерді, оқушыларды және мектеп ішіндегі олимпиадаларды ұйымдастырады."],["Мұғалім және оқушы","Тапсырма құрады, олимпиадаға қатысады және нәтижені көреді."]],
    joinTitle: "Мектебіңізді OLYMPUS-қа қосыңыз", joinDesc: "Шақыру арқылы тіркеліңіз немесе мектеп атынан өтінім жіберіңіз. Әкімші өтінімді қарап, мектеп кабинетін ашады.",
    apply: "Өтінім жіберу", name: "Мектеп атауы", email: "Ресми электрондық пошта", city: "Қала / аудан", contact: "Байланыс тұлғасы", sent: "Өтінім жіберілді. Әкімші қарағаннан кейін хабарлаймыз.", send: "Өтінімді жіберу",
    footer: "Мектеп олимпиадаларының жаңа деңгейі.", loginTitle: "Жүйеге кіру", password: "Құпиясөз", enter: "Кіру", noConfig: "Firebase әлі қосылмаған. Әзірлеуші .env.local файлына Firebase конфигурациясын енгізуі керек.", loginError: "Кіру мүмкін болмады. Email мен құпиясөзді тексеріңіз."
  },
  ru: {
    nav: ["Олимпиады", "Школам", "Возможности", "Контакты"],
    login: "Войти", join: "Подключить школу", badge: "Знания • Соревнование • Будущее",
    title: "Путь каждого ученика", accent: "к победе", desc: "Цифровая платформа для проведения школьных олимпиад, развития знаний учеников и управления результатами в одном пространстве.",
    start: "Присоединиться", explore: "Возможности", schools: "Школы", students: "Ученики", olympiads: "Олимпиады", subjects: "Предметы",
    why: "Одна платформа. Все школы. Равные возможности.", sub: "OLYMPUS помогает школам управлять всем циклом олимпиады — от планирования до итоговых результатов.",
    cards: [["Кабинет школы","Отдельное пространство для каждой школы, управление учителями и классами."],["Конструктор олимпиад","Создание олимпиад по предметам, классам, времени и заданиям."],["Рейтинг и результаты","Отслеживание достижений, аналитика и выдача сертификатов."]],
    access: "Для кого платформа?", roles: [["Администратор платформы","Управляет всеми школами, заявками и олимпиадами."],["Администратор школы","Организует учителей, учеников и олимпиады внутри школы."],["Учитель и ученик","Создают задания, участвуют в олимпиадах и смотрят результаты."]],
    joinTitle: "Подключите свою школу к OLYMPUS", joinDesc: "Зарегистрируйтесь по приглашению или отправьте заявку от имени школы. Администратор рассмотрит заявку и откроет кабинет.",
    apply: "Подать заявку", name: "Название школы", email: "Официальная электронная почта", city: "Город / район", contact: "Контактное лицо", sent: "Заявка отправлена. Мы сообщим после рассмотрения администратором.", send: "Отправить заявку",
    footer: "Новый уровень школьных олимпиад.", loginTitle: "Вход в систему", password: "Пароль", enter: "Войти", noConfig: "Firebase ещё не подключён. Разработчику нужно добавить конфигурацию Firebase в .env.local.", loginError: "Не удалось войти. Проверьте email и пароль."
  }
};
function Landing({lang,setLang}:{lang:Lang;setLang:(v:Lang)=>void}) {
  const t=copy[lang]; const [form,setForm]=useState({school:"",email:"",city:"",contact:""}); const [sent,setSent]=useState(false); const [error,setError]=useState("");
  async function submit(e:React.FormEvent){e.preventDefault();setError("");try{if(!db)throw new Error("Firebase is not configured");await addDoc(collection(db,"schoolApplications"),{...form,status:"pending",language:lang,createdAt:serverTimestamp()});setSent(true);}catch{setError(lang==="kk"?"Өтінімді жіберу мүмкін болмады. Кейінірек қайталап көріңіз.":"Не удалось отправить заявку. Попробуйте позже.");}}
  return <div className="site"><header className="topbar"><a className="brand" href="#"><span className="brand-mark"><Trophy size={21}/></span><span>OLYMPUS<small>SCHOOL OLYMPIAD PLATFORM</small></span></a><nav>{t.nav.map((n,i)=><a key={n} href={["#olympiads","#schools","#features","#contact"][i]}>{n}</a>)}</nav><div className="top-actions"><button className="lang" onClick={()=>setLang(lang==="kk"?"ru":"kk")}><Globe2 size={16}/>{lang==="kk"?"ҚАЗ":"РУС"}<ChevronDown size={13}/></button><Link className="login-link" to="/login"><LockKeyhole size={16}/>{t.login}</Link><a className="btn btn-primary btn-small" href="#schools">{t.join}<ArrowRight size={15}/></a></div><button className="mobile-menu" aria-label="Menu"><Menu/></button></header>
  <main><section className="hero"><div className="hero-grid"><div className="hero-copy"><div className="eyebrow"><Sparkles size={14}/>{t.badge}</div><h1>{t.title}<br/><em>{t.accent}</em></h1><p>{t.desc}</p><div className="hero-actions"><a className="btn btn-primary" href="#schools">{t.start}<ArrowRight size={17}/></a><a className="btn btn-ghost" href="#features">{t.explore}</a></div><div className="stats"><div><strong>01</strong><span>{t.schools}</span></div><i/><div><strong>02</strong><span>{t.students}</span></div><i/><div><strong>03</strong><span>{t.olympiads}</span></div></div></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-glow"/><div className="trophy-card"><div className="trophy-top"><span>OLYMPIUS AWARDS</span><span className="live-dot">● LIVE</span></div><div className="trophy-illustration"><div className="laurel">✦</div><Trophy size={112} strokeWidth={1.15}/><div className="laurel">✦</div></div><div className="award-label">KNOWLEDGE IS POWER</div><div className="award-line"/></div><div className="float-chip chip-one"><Award size={17}/><span><b>1 240+</b><small>{t.students}</small></span></div><div className="float-chip chip-two"><ShieldCheck size={18}/><span><b>{t.subjects}</b><small>OLYMPUS SYSTEM</small></span></div><div className="spark spark-a">✧</div><div className="spark spark-b">✦</div></div></div><div className="hero-bottom"><span>01 / 04</span><div className="hero-progress"><b/></div><span>OLYMPUS · 2026</span></div></section>
  <section className="section intro" id="features"><div className="section-kicker">01 — OLYMPUS PLATFORM</div><h2>{t.why}</h2><p className="section-lead">{t.sub}</p><div className="feature-grid">{t.cards.map((c,i)=><article className="feature-card" key={c[0]}><div className="feature-icon">{[<Building2/>,<BookOpen/>,<Award/>][i]}</div><span className="feature-num">0{i+1}</span><h3>{c[0]}</h3><p>{c[1]}</p><a href="#schools"><ArrowRight size={17}/></a></article>)}</div></section>
  <section className="section roles" id="olympiads"><div><div className="section-kicker">02 — ROLE BASED ACCESS</div><h2>{t.access}</h2></div><div className="role-list">{t.roles.map((r,i)=><div className="role-row" key={r[0]}><span>0{i+1}</span><div className="role-icon">{[<ShieldCheck/>,<Building2/>,<GraduationCap/>][i]}</div><div><h3>{r[0]}</h3><p>{r[1]}</p></div><ArrowRight/></div>)}</div></section>
  <section className="join-section" id="schools"><div className="join-copy"><div className="section-kicker">03 — JOIN OLYMPUS</div><h2>{t.joinTitle}</h2><p>{t.joinDesc}</p><div className="join-points"><span><CheckCircle2/> {lang==="kk"?"Шақыру арқылы тіркелу":"Регистрация по приглашению"}</span><span><CheckCircle2/> {lang==="kk"?"Өтінім арқылы қосылу":"Подключение по заявке"}</span><span><CheckCircle2/> {lang==="kk"?"Мектептің жеке кабинеті":"Отдельный кабинет школы"}</span></div></div><form className="apply-card" onSubmit={submit}><div className="apply-head"><div className="feature-icon"><Building2/></div><div><h3>{t.apply}</h3><p>OLYMPUS · SCHOOL ACCESS</p></div></div>{sent?<div className="success-state"><CheckCircle2 size={38}/><p>{t.sent}</p></div>:<><label>{t.name}<input required value={form.school} onChange={e=>setForm({...form,school:e.target.value})} placeholder={lang==="kk"?"Мектептің толық атауы":"Полное название школы"}/></label><label>{t.email}<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="school@example.kz"/></label><div className="form-row"><label>{t.city}<input required value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></label><label>{t.contact}<input required value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})}/></label></div>{error&&<p className="form-error">{error}</p>}<button className="btn btn-primary submit-btn" type="submit">{t.send}<ArrowRight size={17}/></button><small className="form-note">{lang==="kk"?"Өтінім әкімшіге тексеруге жіберіледі.":"Заявка поступит администратору на проверку."}</small></>}</form></section>
  </main><footer id="contact"><a className="brand" href="#"><span className="brand-mark"><Trophy size={20}/></span><span>OLYMPUS<small>SCHOOL OLYMPIAD PLATFORM</small></span></a><p>{t.footer}</p><span>© 2026 OLYMPUS</span></footer></div>
}
function Login({lang}:{lang:Lang}){const t=copy[lang];const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);const navigate=useNavigate();async function submit(e:React.FormEvent){e.preventDefault();setError("");if(!auth){setError(t.noConfig);return;}setBusy(true);try{await signInWithEmailAndPassword(auth,email,password);navigate("/dashboard");}catch{setError(t.loginError);}finally{setBusy(false);}}return <div className="auth-page"><Link className="brand" to="/"><span className="brand-mark"><Trophy/></span><span>OLYMPUS<small>SCHOOL OLYMPIAD PLATFORM</small></span></Link><form className="auth-card" onSubmit={submit}><div className="feature-icon"><LockKeyhole/></div><h1>{t.loginTitle}</h1><p>{lang==="kk"?"Мектеп аккаунтыңыз арқылы кіріңіз":"Войдите с помощью аккаунта вашей школы"}</p><label>{t.email}<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>{t.password}<input type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p className="form-error">{error}</p>}<button className="btn btn-primary submit-btn" disabled={busy}>{busy?"…":t.enter}<ArrowRight size={17}/></button><Link className="back-link" to="/">← {lang==="kk"?"Басты бетке":"На главную"}</Link></form></div>}

type SchoolApplication = { id: string; school?: string; email?: string; city?: string; contact?: string; status?: string };
function Dashboard({lang}:{lang:Lang}) {
  const [user,setUser]=useState<User|null>(null);
  const [role,setRole]=useState("");
  const [apps,setApps]=useState<SchoolApplication[]>([]);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const [busyId,setBusyId]=useState("");
  const kk=lang==="kk";
  useEffect(()=>{
    if(!auth||!db){setLoading(false);return;}
    const unsub=onAuthStateChanged(auth,async current=>{
      setUser(current);
      if(!current){setRole("");setApps([]);setLoading(false);return;}
      try{
        const profile=await getDoc(doc(db,"users",current.uid));
        const currentRole=profile.exists()?String(profile.data().role||""):"";
        setRole(currentRole);
        if(currentRole==="super_admin"){
          const snap=await getDocs(collection(db,"schoolApplications"));
          setApps(snap.docs.map(d=>({id:d.id,...d.data()} as SchoolApplication)).sort((a,b)=>String(a.status||"").localeCompare(String(b.status||""))));
        }
      }catch{setMessage(kk?"Деректерді жүктеу мүмкін болмады. Firestore ережелерін тексеріңіз.":"Не удалось загрузить данные. Проверьте правила Firestore.");}
      finally{setLoading(false);}
    });
    return ()=>unsub();
  },[kk]);
  async function approve(a:SchoolApplication){
    if(!db)return;
    setBusyId(a.id);setMessage("");
    try{
      const schoolRef=doc(collection(db,"schools"));
      await setDoc(schoolRef,{name:a.school||"",email:a.email||"",city:a.city||"",contact:a.contact||"",status:"active",createdAt:serverTimestamp(),approvedAt:serverTimestamp()});
      await updateDoc(doc(db,"schoolApplications",a.id),{status:"approved",schoolId:schoolRef.id,reviewedAt:serverTimestamp()});
      setApps(old=>old.map(x=>x.id===a.id?{...x,status:"approved"}:x));
      setMessage(kk?"Мектеп өтінімі мақұлданды. Мектеп құрылды.":"Заявка одобрена. Школа создана.");
    }catch{setMessage(kk?"Мақұлдау орындалмады. Firestore ережелерін тексеріңіз.":"Не удалось одобрить заявку. Проверьте правила Firestore.");}
    finally{setBusyId("");}
  }
  async function reject(a:SchoolApplication){
    if(!db)return;setBusyId(a.id);setMessage("");
    try{await updateDoc(doc(db,"schoolApplications",a.id),{status:"rejected",reviewedAt:serverTimestamp()});setApps(old=>old.map(x=>x.id===a.id?{...x,status:"rejected"}:x));}
    catch{setMessage(kk?"Өтінімді өзгерту мүмкін болмады.":"Не удалось обновить заявку.");}
    finally{setBusyId("");}
  }
  if(loading)return <div className="auth-page"><div className="auth-card">OLYMPUS · {kk?"Жүктелуде…":"Загрузка…"}</div></div>;
  if(!user)return <div className="auth-page"><div className="auth-card"><h1>{kk?"Жүйеге кіріңіз":"Войдите в систему"}</h1><Link className="btn btn-primary" to="/login">{kk?"Кіру":"Войти"}</Link></div></div>;
  if(role!=="super_admin")return <div className="auth-page"><div className="auth-card"><h1>{kk?"Қолжетімділік шектеулі":"Нет доступа"}</h1><p>{kk?"Бұл аккаунтқа Super Admin рөлі берілмеген.":"У этой учётной записи нет роли Super Admin."}</p><button className="btn btn-ghost" onClick={()=>signOut(auth!)}>{kk?"Шығу":"Выйти"}</button></div></div>;
  const pending=apps.filter(a=>(a.status||"pending")==="pending");
  return <div className="auth-page"><div className="dashboard-shell">
    <header className="dashboard-head"><Link className="brand" to="/"><span className="brand-mark"><Trophy/></span><span>OLYMPUS<small>SUPER ADMIN</small></span></Link><button className="btn btn-ghost" onClick={()=>auth&&signOut(auth)}>{kk?"Жүйеден шығу":"Выйти"}</button></header>
    <div className="dashboard-title"><div><span className="section-kicker">OLYMPUS · CONTROL CENTER</span><h1>{kk?"Басқару панелі":"Панель управления"}</h1><p>{user.email}</p></div><div className="dashboard-stat"><strong>{apps.length}</strong><span>{kk?"Барлық өтінім":"Всего заявок"}</span></div><div className="dashboard-stat"><strong>{pending.length}</strong><span>{kk?"Күтудегі өтінім":"Ожидают решения"}</span></div></div>
    {message&&<p className="dashboard-message">{message}</p>}
    <section className="dashboard-panel"><div className="dashboard-panel-head"><div><h2>{kk?"Мектеп өтінімдері":"Заявки школ"}</h2><p>{kk?"Жаңа мектептерді қарап, мақұлдаңыз немесе қабылдамаңыз.":"Проверяйте заявки новых школ, одобряйте или отклоняйте их."}</p></div></div>
    {apps.length===0?<div className="empty-state">{kk?"Әзірге өтінімдер жоқ.":"Пока заявок нет."}</div>:<div className="application-list">{apps.map(a=><article className="application-item" key={a.id}><div className="application-info"><span className={"status-pill "+(a.status||"pending")}>{a.status==="approved"?(kk?"Мақұлданды":"Одобрена"):a.status==="rejected"?(kk?"Қабылданбады":"Отклонена"):(kk?"Күтуде":"На рассмотрении")}</span><h3>{a.school||"—"}</h3><p>{a.city||"—"} · {a.contact||"—"}</p><a href={"mailto:"+a.email}>{a.email}</a></div>{(a.status||"pending")==="pending"&&<div className="application-actions"><button className="btn btn-primary" disabled={!!busyId} onClick={()=>approve(a)}>{busyId===a.id?(kk?"…":"…"):(kk?"Мақұлдау":"Одобрить")}</button><button className="btn btn-ghost" disabled={!!busyId} onClick={()=>reject(a)}>{kk?"Қабылдамау":"Отклонить"}</button></div>}</article>)}</div>}</section>
  </div></div>;
}

export default function App(){const [lang,setLang]=useState<Lang>("kk");return <Routes><Route path="/login" element={<Login lang={lang}/>}/><Route path="/dashboard" element={<Dashboard lang={lang}/>}/><Route path="*" element={<Landing lang={lang} setLang={setLang}/>}/></Routes>}
