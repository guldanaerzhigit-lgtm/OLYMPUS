import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { addDoc, collection, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { ArrowRight, Award, BookOpen, Building2, CheckCircle2, ChevronDown, Globe2, GraduationCap, LockKeyhole, Menu, ShieldCheck, Sparkles, Trophy, Users, X } from "lucide-react";
import { auth, db, firebaseConfigured } from "./firebase";
import { createInvitation } from "./invitations";
import InviteRegistration from "./InviteRegistration";
import StudentDashboard from "./StudentDashboard";
import * as XLSX from "xlsx";

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
type SchoolRecord = { id: string; name?: string; city?: string; email?: string; status?: string };
type OlympiadRecord = { id: string; title?: string; subject?: string; grade?: string; status?: string; duration?: number; startDate?: string };
type InviteRecord = { id: string; email?: string; role?: string; schoolId?: string; status?: string };

function Dashboard({lang}:{lang:Lang}) {
  const [user,setUser]=useState<User|null>(null);
  const [role,setRole]=useState("");
  const [apps,setApps]=useState<SchoolApplication[]>([]);
  const [schools,setSchools]=useState<SchoolRecord[]>([]);
  const [olympiads,setOlympiads]=useState<OlympiadRecord[]>([]);
  const [invites,setInvites]=useState<InviteRecord[]>([]);
  const [tab,setTab]=useState("overview");
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const [busyId,setBusyId]=useState("");
  const [olympiadForm,setOlympiadForm]=useState({title:"",subject:"Математика",grade:"5",duration:"60",startDate:""});
  const [inviteForm,setInviteForm]=useState({email:"",schoolId:"",role:"school_admin"});
  const kk=lang==="kk";
  const label=(kk?{overview:"Шолу",schools:"Мектептер",applications:"Өтінімдер",olympiads:"Олимпиадалар",invites:"Шақырулар"}:{overview:"Обзор",schools:"Школы",applications:"Заявки",olympiads:"Олимпиады",invites:"Приглашения"});
  async function reloadData(){
    if(!db)return;
    const [a,s,o,i]=await Promise.all([
      getDocs(collection(db,"schoolApplications")),
      getDocs(collection(db,"schools")),
      getDocs(collection(db,"olympiads")),
      getDocs(collection(db,"invitations"))
    ]);
    setApps(a.docs.map(d=>({id:d.id,...d.data()} as SchoolApplication)));
    setSchools(s.docs.map(d=>({id:d.id,...d.data()} as SchoolRecord)));
    setOlympiads(o.docs.map(d=>({id:d.id,...d.data()} as OlympiadRecord)));
    setInvites(i.docs.map(d=>({id:d.id,...d.data()} as InviteRecord)));
  }
  useEffect(()=>{
    if(!auth||!db){setLoading(false);return;}
    const unsub=onAuthStateChanged(auth,async current=>{
      setUser(current);
      if(!current){setRole("");setApps([]);setLoading(false);return;}
      try{
        const profile=await getDoc(doc(db,"users",current.uid));
        const currentRole=profile.exists()?String(profile.data().role||""):"";
        setRole(currentRole);
        if(currentRole==="super_admin")await reloadData();
      }catch{setMessage(kk?"Деректерді жүктеу мүмкін болмады. Firestore ережелерін тексеріңіз.":"Не удалось загрузить данные. Проверьте правила Firestore.");}
      finally{setLoading(false);}
    });
    return ()=>unsub();
  },[kk]);
  async function approve(a:SchoolApplication){
    if(!db)return;setBusyId(a.id);setMessage("");
    try{
      const schoolRef=doc(collection(db,"schools"));
      await setDoc(schoolRef,{name:a.school||"",email:a.email||"",city:a.city||"",contact:a.contact||"",status:"active",createdAt:serverTimestamp(),approvedAt:serverTimestamp()});
      await updateDoc(doc(db,"schoolApplications",a.id),{status:"approved",schoolId:schoolRef.id,reviewedAt:serverTimestamp()});
      await reloadData();setMessage(kk?"Мектеп өтінімі мақұлданды. Мектеп құрылды.":"Заявка одобрена. Школа создана.");
    }catch{setMessage(kk?"Мақұлдау орындалмады. Firestore ережелерін тексеріңіз.":"Не удалось одобрить заявку. Проверьте правила Firestore.");}
    finally{setBusyId("");}
  }
  async function reject(a:SchoolApplication){
    if(!db)return;setBusyId(a.id);setMessage("");
    try{await updateDoc(doc(db,"schoolApplications",a.id),{status:"rejected",reviewedAt:serverTimestamp()});await reloadData();}
    catch{setMessage(kk?"Өтінімді өзгерту мүмкін болмады.":"Не удалось обновить заявку.");}
    finally{setBusyId("");}
  }
  async function createOlympiad(e:React.FormEvent){
    e.preventDefault();if(!db)return;setMessage("");
    try{
      await addDoc(collection(db,"olympiads"),{...olympiadForm,grade:Number(olympiadForm.grade),duration:Number(olympiadForm.duration),status:"draft",createdBy:user?.uid||"",createdAt:serverTimestamp()});
      setOlympiadForm({title:"",subject:"Математика",grade:"5",duration:"60",startDate:""});
      await reloadData();setMessage(kk?"Олимпиада жобасы сақталды.":"Черновик олимпиады сохранён.");
    }catch{setMessage(kk?"Олимпиаданы сақтау мүмкін болмады. Ережелерді тексеріңіз.":"Не удалось сохранить олимпиаду. Проверьте правила.");}
  }
  async function publishOlympiad(o:OlympiadRecord){
    if(!db)return;setBusyId(o.id);
    try{await updateDoc(doc(db,"olympiads",o.id),{status:"published",publishedAt:serverTimestamp()});await reloadData();}
    catch{setMessage(kk?"Жариялау мүмкін болмады.":"Не удалось опубликовать.");}
    finally{setBusyId("");}
  }
  async function createInvite(e:React.FormEvent){
    e.preventDefault();setMessage("");
    try{
      const data=await createInvitation({email:inviteForm.email.trim(),schoolId:inviteForm.schoolId,role:"school_admin",language:lang});
      setInviteForm({email:"",schoolId:"",role:"school_admin"});await reloadData();
      setMessage((kk?"Шақыру дайын. ":"Приглашение создано. ")+(data.emailSent?(kk?"Email жіберілді. ":"Письмо отправлено. "):(kk?"Email қызметі қосылмаған, сілтемені қолмен жіберіңіз: ":"Email-сервис не подключён, отправьте ссылку вручную: "))+data.inviteUrl);
    }catch(err){setMessage((kk?"Шақыру жіберілмеді: ":"Не удалось создать приглашение: ")+String((err as Error).message||""));}
  }
  if(loading)return <div className="auth-page"><div className="auth-card">OLYMPUS · {kk?"Жүктелуде…":"Загрузка…"}</div></div>;
  if(!user)return <div className="auth-page"><div className="auth-card"><h1>{kk?"Жүйеге кіріңіз":"Войдите в систему"}</h1><Link className="btn btn-primary" to="/login">{kk?"Кіру":"Войти"}</Link></div></div>;
  if(role==="school_admin")return <Navigate to="/school" replace/>;
  if(role==="teacher")return <Navigate to="/teacher" replace/>;
  if(role==="student")return <Navigate to="/student" replace/>;
  if(role!=="super_admin")return <div className="auth-page"><div className="auth-card"><h1>{kk?"Қолжетімділік шектеулі":"Нет доступа"}</h1><p>{kk?"Бұл аккаунтқа Super Admin рөлі берілмеген.":"У этой учётной записи нет роли Super Admin."}</p><button className="btn btn-ghost" onClick={()=>signOut(auth!)}>{kk?"Шығу":"Выйти"}</button></div></div>;
  const pending=apps.filter(a=>(a.status||"pending")==="pending");
  const activeSchools=schools.filter(s=>s.status==="active");
  return <div className="auth-page"><div className="dashboard-shell">
    <header className="dashboard-head"><Link className="brand" to="/"><span className="brand-mark"><Trophy/></span><span>OLYMPUS<small>SUPER ADMIN</small></span></Link><button className="btn btn-ghost" onClick={()=>auth&&signOut(auth)}>{kk?"Жүйеден шығу":"Выйти"}</button></header>
    <div className="dashboard-title"><div><span className="section-kicker">OLYMPUS · CONTROL CENTER</span><h1>{kk?"Басқару панелі":"Панель управления"}</h1><p>{user.email}</p></div>
      <div className="dashboard-stat"><strong>{schools.length}</strong><span>{kk?"Мектептер":"Школы"}</span></div>
      <div className="dashboard-stat"><strong>{pending.length}</strong><span>{kk?"Күтудегі өтінім":"Ожидают решения"}</span></div>
      <div className="dashboard-stat"><strong>{olympiads.length}</strong><span>{kk?"Олимпиадалар":"Олимпиады"}</span></div>
    </div>
    <nav className="admin-tabs">{(["overview","schools","applications","olympiads","invites"] as const).map(k=><button key={k} className={tab===k?"active":""} onClick={()=>setTab(k)}>{label[k]}</button>)}</nav>
    {message&&<p className="dashboard-message">{message}</p>}
    {tab==="overview"&&<section className="admin-grid">
      <article className="admin-module"><span className="section-kicker">01 · SCHOOLS</span><h2>{kk?"Мектептер":"Школы"}</h2><strong>{schools.length}</strong><p>{kk?"Тіркелген мектептер":"Зарегистрированные школы"}</p><button className="btn btn-primary" onClick={()=>setTab("schools")}>{kk?"Ашу":"Открыть"} <ArrowRight size={15}/></button></article>
      <article className="admin-module"><span className="section-kicker">02 · APPLICATIONS</span><h2>{kk?"Өтінімдер":"Заявки"}</h2><strong>{pending.length}</strong><p>{kk?"Әкімшінің шешімін күтуде":"Ожидают решения администратора"}</p><button className="btn btn-primary" onClick={()=>setTab("applications")}>{kk?"Қарау":"Проверить"} <ArrowRight size={15}/></button></article>
      <article className="admin-module"><span className="section-kicker">03 · OLYMPIADS</span><h2>{kk?"Олимпиадалар":"Олимпиады"}</h2><strong>{olympiads.length}</strong><p>{kk?"Жасалған олимпиадалар":"Созданные олимпиады"}</p><button className="btn btn-primary" onClick={()=>setTab("olympiads")}>{kk?"Басқару":"Управлять"} <ArrowRight size={15}/></button></article>
    </section>}
    {tab==="schools"&&<section className="dashboard-panel"><div className="dashboard-panel-head"><div><h2>{kk?"Мектептер тізімі":"Список школ"}</h2><p>{kk?"Мақұлданған мектептердің орталық тізімі.":"Центральный список одобренных школ."}</p></div></div>
      {schools.length===0?<div className="empty-state">{kk?"Әзірге мектеп жоқ.":"Пока школ нет."}</div>:<div className="application-list">{schools.map(s=><article className="application-item" key={s.id}><div className="application-info"><span className="status-pill approved">{s.status||"active"}</span><h3>{s.name||"—"}</h3><p>{s.city||"—"} · {s.email||"—"}</p><small>ID: {s.id}</small></div></article>)}</div>}
    </section>}
    {tab==="applications"&&<section className="dashboard-panel"><div className="dashboard-panel-head"><div><h2>{kk?"Мектеп өтінімдері":"Заявки школ"}</h2><p>{kk?"Жаңа мектептерді қарап, мақұлдаңыз немесе қабылдамаңыз.":"Проверяйте заявки новых школ, одобряйте или отклоняйте их."}</p></div></div>
      {apps.length===0?<div className="empty-state">{kk?"Әзірге өтінімдер жоқ.":"Пока заявок нет."}</div>:<div className="application-list">{apps.map(a=><article className="application-item" key={a.id}><div className="application-info"><span className={"status-pill "+(a.status||"pending")}>{a.status==="approved"?(kk?"Мақұлданды":"Одобрена"):a.status==="rejected"?(kk?"Қабылданбады":"Отклонена"):(kk?"Күтуде":"На рассмотрении")}</span><h3>{a.school||"—"}</h3><p>{a.city||"—"} · {a.contact||"—"}</p><a href={"mailto:"+a.email}>{a.email}</a></div>{(a.status||"pending")==="pending"&&<div className="application-actions"><button className="btn btn-primary" disabled={!!busyId} onClick={()=>approve(a)}>{busyId===a.id?"…":(kk?"Мақұлдау":"Одобрить")}</button><button className="btn btn-ghost" disabled={!!busyId} onClick={()=>reject(a)}>{kk?"Қабылдамау":"Отклонить"}</button></div>}</article>)}</div>}
    </section>}
    {tab==="olympiads"&&<div className="admin-stack"><section className="dashboard-panel"><div className="dashboard-panel-head"><div><h2>{kk?"Жаңа олимпиада құру":"Создать олимпиаду"}</h2><p>{kk?"Алдымен жобаны сақтаңыз, содан кейін жариялауға болады.":"Сначала сохраните черновик, затем его можно опубликовать."}</p></div></div>
      <form className="admin-form" onSubmit={createOlympiad}><label>{kk?"Олимпиада атауы":"Название олимпиады"}<input required value={olympiadForm.title} onChange={e=>setOlympiadForm({...olympiadForm,title:e.target.value})}/></label><label>{kk?"Пән":"Предмет"}<select value={olympiadForm.subject} onChange={e=>setOlympiadForm({...olympiadForm,subject:e.target.value})}>{["Математика","Қазақ тілі","Орыс тілі","Ағылшын тілі","Информатика","Физика","Химия","Биология","История Казахстана"].map(x=><option key={x}>{x}</option>)}</select></label><label>{kk?"Сынып":"Класс"}<select value={olympiadForm.grade} onChange={e=>setOlympiadForm({...olympiadForm,grade:e.target.value})}>{Array.from({length:11},(_,i)=>String(i+1)).map(x=><option key={x} value={x}>{x}</option>)}</select></label><label>{kk?"Ұзақтығы (минут)":"Длительность (минут)"}<input type="number" min="5" max="240" required value={olympiadForm.duration} onChange={e=>setOlympiadForm({...olympiadForm,duration:e.target.value})}/></label><label>{kk?"Өткізу күні":"Дата проведения"}<input type="datetime-local" value={olympiadForm.startDate} onChange={e=>setOlympiadForm({...olympiadForm,startDate:e.target.value})}/></label><button className="btn btn-primary">{kk?"Жобаны сақтау":"Сохранить черновик"} <ArrowRight size={15}/></button></form>
    </section><section className="dashboard-panel"><div className="dashboard-panel-head"><div><h2>{kk?"Олимпиадалар тізімі":"Список олимпиад"}</h2></div></div>{olympiads.length===0?<div className="empty-state">{kk?"Әзірге олимпиада жоқ.":"Пока олимпиад нет."}</div>:<div className="application-list">{olympiads.map(o=><article className="application-item" key={o.id}><div className="application-info"><span className={"status-pill "+(o.status==="published"?"approved":"pending")}>{o.status||"draft"}</span><h3>{o.title}</h3><p>{o.subject} · {o.grade} {kk?"сынып":"класс"} · {o.duration} {kk?"минут":"мин."}</p><small>{o.startDate||""}</small></div>{o.status!=="published"&&<button className="btn btn-primary" disabled={!!busyId} onClick={()=>publishOlympiad(o)}>{kk?"Жариялау":"Опубликовать"}</button>}</article>)}</div>}</section></div>}
    {tab==="invites"&&<div className="admin-stack"><section className="dashboard-panel"><div className="dashboard-panel-head"><div><h2>{kk?"Әкімші шақыруын дайындау":"Подготовить приглашение администратора"}</h2><p>{kk?"Шақыру email арқылы жіберіледі. Сілтеме 72 сағат жарамды және бір рет қолданылады.":"Приглашение отправляется по email. Ссылка действует 72 часа и используется один раз."}</p></div></div>
      <form className="admin-form" onSubmit={createInvite}><label>Email<input required type="email" value={inviteForm.email} onChange={e=>setInviteForm({...inviteForm,email:e.target.value})}/></label><label>{kk?"Мектеп":"Школа"}<select required value={inviteForm.schoolId} onChange={e=>setInviteForm({...inviteForm,schoolId:e.target.value})}><option value="">{kk?"Мектепті таңдаңыз":"Выберите школу"}</option>{schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>{kk?"Рөл":"Роль"}<select value={inviteForm.role} onChange={e=>setInviteForm({...inviteForm,role:e.target.value})}><option value="school_admin">{kk?"Мектеп әкімшісі":"Администратор школы"}</option></select></label><button className="btn btn-primary" disabled={!schools.length}>{kk?"Шақыру жазбасын сақтау":"Сохранить приглашение"} <ArrowRight size={15}/></button></form>
      <p className="admin-notice">{kk?"Қауіпсіздік: рөлді беру және Firebase Auth аккаунтын ашу браузерден орындалмайды. Келесі серверлік кезеңде шақыруды тексеру, бір реттік токен және email жіберу қосылады.":"Безопасность: назначение роли и создание аккаунта Firebase Auth не выполняются из браузера. На следующем серверном этапе добавим проверку приглашения, одноразовый токен и отправку email."}</p>
    </section><section className="dashboard-panel"><div className="dashboard-panel-head"><div><h2>{kk?"Шақырулар тарихы":"История приглашений"}</h2></div></div>{invites.length===0?<div className="empty-state">{kk?"Шақырулар жоқ.":"Приглашений пока нет."}</div>:<div className="application-list">{invites.map(i=><article className="application-item" key={i.id}><div className="application-info"><span className="status-pill">{i.status||"pending"}</span><h3>{i.email}</h3><p>{i.role} · {schools.find(s=>s.id===i.schoolId)?.name||i.schoolId}</p></div></article>)}</div>}</section></div>}
  </div></div>;
}



type SchoolMember = { id:string; displayName?:string; fullName?:string; email?:string; grade?:string; className?:string; subject?:string; status?:string };
type SchoolClass = { id:string; name?:string; grade?:string; academicYear?:string; studentCount?:number };
function SchoolAdmin({lang}:{lang:Lang}) {
  const [user,setUser]=useState<User|null>(null);
  const [schoolId,setSchoolId]=useState("");
  const [schoolName,setSchoolName]=useState("");
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState("overview");
  const [classes,setClasses]=useState<SchoolClass[]>([]);
  const [teachers,setTeachers]=useState<SchoolMember[]>([]);
  const [students,setStudents]=useState<SchoolMember[]>([]);
  const [message,setMessage]=useState("");
  const [className,setClassName]=useState("");
  const [grade,setGrade]=useState("5");
  const [studentForm,setStudentForm]=useState({fullName:"",grade:"5",className:"",email:""});
  const [teacherForm,setTeacherForm]=useState({email:"",subject:""});
  const kk=lang==="kk";
  const labels=kk?{overview:"Шолу",classes:"Сыныптар",teachers:"Мұғалімдер",students:"Оқушылар"}:{overview:"Обзор",classes:"Классы",teachers:"Учителя",students:"Ученики"};
  async function reload(sid:string){
    if(!db)return;
    const [c,t,s]=await Promise.all([
      getDocs(collection(db,"schools",sid,"classes")),
      getDocs(collection(db,"schools",sid,"teacherInvites")),
      getDocs(collection(db,"schools",sid,"students"))
    ]);
    setClasses(c.docs.map(d=>({id:d.id,...d.data()} as SchoolClass)));
    setTeachers(t.docs.map(d=>({id:d.id,...d.data()} as SchoolMember)));
    setStudents(s.docs.map(d=>({id:d.id,...d.data()} as SchoolMember)));
  }
  useEffect(()=>{
    if(!auth||!db){setLoading(false);return;}
    const unsub=onAuthStateChanged(auth,async current=>{
      setUser(current);
      if(!current){setLoading(false);return;}
      try{
        const p=await getDoc(doc(db,"users",current.uid));
        if(!p.exists()||p.data().role!=="school_admin"||!p.data().schoolId){setSchoolId("");setLoading(false);return;}
        const sid=String(p.data().schoolId);setSchoolId(sid);
        const school=await getDoc(doc(db,"schools",sid));
        setSchoolName(school.exists()?String(school.data().name||""):"");
        await reload(sid);
      }catch{setMessage(kk?"Деректерді жүктеу қатесі.":"Ошибка загрузки данных.");}
      finally{setLoading(false);}
    });
    return ()=>unsub();
  },[kk]);
  async function addClass(e:React.FormEvent){
    e.preventDefault();if(!db||!schoolId)return;
    try{await addDoc(collection(db,"schools",schoolId,"classes"),{name:className.trim(),grade:Number(grade),academicYear:"2026–2027",studentCount:0,createdAt:serverTimestamp(),createdBy:user?.uid||""});setClassName("");await reload(schoolId);setMessage(kk?"Сынып қосылды.":"Класс добавлен.");}
    catch{setMessage(kk?"Сыныпты қосу мүмкін болмады.":"Не удалось добавить класс.");}
  }
  async function addStudent(e:React.FormEvent){
    e.preventDefault();if(!db||!schoolId)return;
    try{
      if(studentForm.email.trim()){
        const data=await createInvitation({email:studentForm.email.trim(),schoolId,role:"student",displayName:studentForm.fullName,grade:studentForm.grade,className:studentForm.className,language:lang});
        await addDoc(collection(db,"schools",schoolId,"students"),{...studentForm,grade:Number(studentForm.grade),status:"invited",invitationId:data.invitationId,createdAt:serverTimestamp(),createdBy:user?.uid||""});
        setMessage((kk?"Оқушыға шақыру дайын. ":"Приглашение ученику создано. ")+(data.emailSent?(kk?"Email жіберілді. ":"Письмо отправлено. "):(kk?"Сілтемені қолмен жіберіңіз: ":"Отправьте ссылку вручную: "))+data.inviteUrl);
      }else{
        await addDoc(collection(db,"schools",schoolId,"students"),{...studentForm,grade:Number(studentForm.grade),status:"pending_account",createdAt:serverTimestamp(),createdBy:user?.uid||""});
        setMessage(kk?"Оқушы тізімге қосылды. Email енгізсеңіз, оған шақыру жіберіледі.":"Ученик добавлен. Укажите email, чтобы отправить приглашение.");
      }
      setStudentForm({fullName:"",grade:"5",className:"",email:""});await reload(schoolId);
    }catch(err){setMessage((kk?"Оқушыны қосу мүмкін болмады: ":"Не удалось добавить ученика: ")+String((err as Error).message||""));}
  }
  async function inviteTeacher(e:React.FormEvent){
    e.preventDefault();if(!db||!schoolId)return;
    try{
      const data=await createInvitation({email:teacherForm.email.trim(),schoolId,role:"teacher",subject:teacherForm.subject,language:lang});
      await addDoc(collection(db,"schools",schoolId,"teacherInvites"),{email:teacherForm.email.trim().toLowerCase(),subject:teacherForm.subject,status:"pending",invitationId:data.invitationId,createdAt:serverTimestamp(),createdBy:user?.uid||""});
      setTeacherForm({email:"",subject:""});await reload(schoolId);
      setMessage((kk?"Мұғалімге шақыру дайын. ":"Приглашение учителю создано. ")+(data.emailSent?(kk?"Email жіберілді. ":"Письмо отправлено. "):(kk?"Email қызметі қосылмаған, сілтемені қолмен жіберіңіз: ":"Email-сервис не подключён, отправьте ссылку вручную: "))+data.inviteUrl);
    }catch(err){setMessage((kk?"Шақыру жіберілмеді: ":"Не удалось создать приглашение: ")+String((err as Error).message||""));}
  }
  if(loading)return <div className="auth-page"><div className="auth-card">{kk?"Жүктелуде…":"Загрузка…"}</div></div>;
  if(!user)return <div className="auth-page"><div className="auth-card"><h1>{kk?"Жүйеге кіріңіз":"Войдите в систему"}</h1><Link className="btn btn-primary" to="/login">{kk?"Кіру":"Войти"}</Link></div></div>;
  if(!schoolId)return <div className="auth-page"><div className="auth-card"><h1>{kk?"Мектеп әкімшісіне қолжетімділік жоқ":"Нет доступа администратора школы"}</h1><p>{kk?"Аккаунтыңызға мектеп әкімшісі рөлі мен schoolId тағайындалуы керек.":"Аккаунту нужно назначить роль school_admin и schoolId."}</p><button className="btn btn-ghost" onClick={()=>auth&&signOut(auth)}>{kk?"Шығу":"Выйти"}</button></div></div>;
  return <div className="auth-page"><div className="dashboard-shell">
    <header className="dashboard-head"><Link className="brand" to="/"><span className="brand-mark"><Trophy/></span><span>OLYMPUS<small>SCHOOL ADMIN</small></span></Link><button className="btn btn-ghost" onClick={()=>auth&&signOut(auth)}>{kk?"Шығу":"Выйти"}</button></header>
    <div className="dashboard-title"><div><span className="section-kicker">OLYMPUS · SCHOOL SPACE</span><h1>{schoolName|| (kk?"Мектеп кабинеті":"Кабинет школы")}</h1><p>{user.email}</p></div><div className="dashboard-stat"><strong>{classes.length}</strong><span>{kk?"Сыныптар":"Классы"}</span></div><div className="dashboard-stat"><strong>{teachers.length}</strong><span>{kk?"Мұғалімдер":"Учителя"}</span></div><div className="dashboard-stat"><strong>{students.length}</strong><span>{kk?"Оқушылар":"Ученики"}</span></div></div>
    <nav className="admin-tabs">{(["overview","classes","teachers","students"] as const).map(k=><button key={k} className={tab===k?"active":""} onClick={()=>setTab(k)}>{labels[k]}</button>)}</nav>
    {message&&<p className="dashboard-message">{message}</p>}
    {tab==="overview"&&<section className="admin-grid"><article className="admin-module"><span className="section-kicker">01 · CLASSES</span><h2>{labels.classes}</h2><strong>{classes.length}</strong><p>{kk?"Мектеп сыныптары":"Учебные классы школы"}</p><button className="btn btn-primary" onClick={()=>setTab("classes")}>{kk?"Ашу":"Открыть"} <ArrowRight size={15}/></button></article><article className="admin-module"><span className="section-kicker">02 · TEACHERS</span><h2>{labels.teachers}</h2><strong>{teachers.length}</strong><p>{kk?"Мұғалім шақырулары":"Приглашения учителей"}</p><button className="btn btn-primary" onClick={()=>setTab("teachers")}>{kk?"Ашу":"Открыть"} <ArrowRight size={15}/></button></article><article className="admin-module"><span className="section-kicker">03 · STUDENTS</span><h2>{labels.students}</h2><strong>{students.length}</strong><p>{kk?"Оқушылар тізімі":"Список учеников"}</p><button className="btn btn-primary" onClick={()=>setTab("students")}>{kk?"Ашу":"Открыть"} <ArrowRight size={15}/></button></article></section>}
    {tab==="classes"&&<section className="dashboard-panel"><div className="dashboard-panel-head"><div><h2>{kk?"Сыныптар":"Классы"}</h2><p>{kk?"Мектептің оқу сыныптарын құрыңыз.":"Создавайте учебные классы школы."}</p></div></div><form className="admin-form" onSubmit={addClass}><label>{kk?"Сынып атауы":"Название класса"}<input required placeholder="5 «А»" value={className} onChange={e=>setClassName(e.target.value)}/></label><label>{kk?"Сынып деңгейі":"Параллель"}<select value={grade} onChange={e=>setGrade(e.target.value)}>{Array.from({length:11},(_,i)=>String(i+1)).map(v=><option key={v}>{v}</option>)}</select></label><button className="btn btn-primary">{kk?"Сынып қосу":"Добавить класс"}</button></form><div className="application-list" style={{marginTop:22}}>{classes.length?classes.map(c=><article className="application-item" key={c.id}><div className="application-info"><h3>{c.name}</h3><p>{c.grade} {kk?"сынып":"класс"} · {c.academicYear}</p></div><span className="status-pill approved">{c.studentCount||0} {kk?"оқушы":"учеников"}</span></article>):<div className="empty-state">{kk?"Сыныптар әлі қосылмаған.":"Классы пока не добавлены."}</div>}</div></section>}
    {tab==="teachers"&&<div className="admin-stack"><section className="dashboard-panel"><div className="dashboard-panel-head"><div><h2>{kk?"Мұғалімді шақыру":"Пригласить учителя"}</h2><p>{kk?"Мұғалімнің email мекенжайын және пәнін енгізіңіз.":"Укажите email учителя и предмет."}</p></div></div><form className="admin-form" onSubmit={inviteTeacher}><label>Email<input required type="email" value={teacherForm.email} onChange={e=>setTeacherForm({...teacherForm,email:e.target.value})}/></label><label>{kk?"Пәні":"Предмет"}<input required value={teacherForm.subject} onChange={e=>setTeacherForm({...teacherForm,subject:e.target.value})}/></label><button className="btn btn-primary">{kk?"Шақыру жазбасын жасау":"Создать приглашение"}</button></form><p className="admin-notice">{kk?"Шақыру қауіпсіз сервер арқылы жіберіледі. Мұғалім сілтемені ашып, құпиясөз орнатқан соң аккаунты автоматты түрде ашылады.":"Приглашение отправляется через защищённую серверную функцию. Учитель создаст аккаунт по ссылке, задав пароль."}</p></section><section className="dashboard-panel"><h2>{kk?"Шақырылған мұғалімдер":"Приглашённые учителя"}</h2>{teachers.length?teachers.map(t=><article className="application-item" key={t.id}><div className="application-info"><h3>{t.email}</h3><p>{t.subject}</p></div><span className="status-pill">{t.status||"pending"}</span></article>):<div className="empty-state">{kk?"Шақырулар жоқ.":"Приглашений пока нет."}</div>}</section></div>}
    {tab==="students"&&<section className="dashboard-panel"><div className="dashboard-panel-head"><div><h2>{kk?"Оқушы қосу":"Добавить ученика"}</h2><p>{kk?"Оқушыны мектеп тізіміне енгізіңіз.":"Добавьте ученика в школьный список."}</p></div></div><form className="admin-form" onSubmit={addStudent}><label>{kk?"Оқушының аты-жөні":"ФИО ученика"}<input required value={studentForm.fullName} onChange={e=>setStudentForm({...studentForm,fullName:e.target.value})}/></label><label>{kk?"Сынып":"Класс"}<select value={studentForm.grade} onChange={e=>setStudentForm({...studentForm,grade:e.target.value})}>{Array.from({length:11},(_,i)=>String(i+1)).map(v=><option key={v}>{v}</option>)}</select></label><label>{kk?"Сынып әрпі":"Обозначение класса"}<input required placeholder="5 «А»" value={studentForm.className} onChange={e=>setStudentForm({...studentForm,className:e.target.value})}/></label><label>Email ({kk?"міндетті емес":"необязательно"})<input type="email" value={studentForm.email} onChange={e=>setStudentForm({...studentForm,email:e.target.value})}/></label><button className="btn btn-primary">{kk?"Оқушыны қосу / шақыру":"Добавить / пригласить ученика"}</button></form><div className="application-list" style={{marginTop:22}}>{students.length?students.map(s=><article className="application-item" key={s.id}><div className="application-info"><h3>{s.fullName}</h3><p>{s.grade} {kk?"сынып":"класс"} · {s.className}</p></div><span className="status-pill">{s.status||"pending_account"}</span></article>):<div className="empty-state">{kk?"Оқушылар тізімі бос.":"Список учеников пуст."}</div>}</div></section>}
  </div></div>;
}


type TeacherTask = { id:string; title?:string; subject?:string; grade?:number|string; question?:string; points?:number; status?:string };
function TeacherDashboard({lang}:{lang:Lang}) {
 const [user,setUser]=useState<User|null>(null),[schoolId,setSchoolId]=useState(""),[schoolName,setSchoolName]=useState("");
 const [loading,setLoading]=useState(true),[tasks,setTasks]=useState<TeacherTask[]>([]),[studentsCount,setStudentsCount]=useState(0);
 const [tab,setTab]=useState("overview"),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 const [taskForm,setTaskForm]=useState({title:"",subject:"Математика",grade:"5",question:"",type:"short_answer",answer:"",options:"",points:"1"});
 const kk=lang==="kk";
 const labels=kk?{overview:"Шолу",tasks:"Тапсырмалар",create:"Тапсырма құру",import:"Оқушыларды импорттау"}:{overview:"Обзор",tasks:"Задания",create:"Создать задание",import:"Импорт учеников"};
 async function reload(sid:string){if(!db)return;const [t,s]=await Promise.all([getDocs(collection(db,"schools",sid,"tasks")),getDocs(collection(db,"schools",sid,"students"))]);setTasks(t.docs.map(d=>({id:d.id,...d.data()} as TeacherTask)));setStudentsCount(s.size);}
 useEffect(()=>{if(!auth||!db){setLoading(false);return;}const unsub=onAuthStateChanged(auth,async current=>{setUser(current);if(!current){setLoading(false);return;}try{const p=await getDoc(doc(db,"users",current.uid));if(!p.exists()||p.data().role!=="teacher"||!p.data().schoolId){setSchoolId("");setLoading(false);return;}const sid=String(p.data().schoolId);setSchoolId(sid);const school=await getDoc(doc(db,"schools",sid));setSchoolName(school.exists()?String(school.data().name||""):"");await reload(sid);}catch{setMessage(kk?"Деректерді жүктеу қатесі.":"Ошибка загрузки данных.");}finally{setLoading(false);}});return ()=>unsub();},[kk]);
 async function createTask(e:React.FormEvent){e.preventDefault();if(!db||!schoolId||!user)return;setBusy(true);setMessage("");try{const options=taskForm.options.split("|").map(x=>x.trim()).filter(Boolean);await addDoc(collection(db,"schools",schoolId,"tasks"),{title:taskForm.title.trim(),subject:taskForm.subject,grade:Number(taskForm.grade),question:taskForm.question.trim(),type:taskForm.type,answer:taskForm.answer.trim(),options:taskForm.type==="single_choice"?options:[],points:Number(taskForm.points),status:"draft",createdBy:user.uid,createdAt:serverTimestamp()});setTaskForm({...taskForm,title:"",question:"",answer:"",options:""});await reload(schoolId);setMessage(kk?"Тапсырма сақталды.":"Задание сохранено.");}catch{setMessage(kk?"Тапсырманы сақтау мүмкін болмады.":"Не удалось сохранить задание.");}finally{setBusy(false);}}
 async function importStudents(e:React.ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];if(!file||!db||!schoolId)return;setBusy(true);setMessage("");try{const workbook=XLSX.read(await file.arrayBuffer(),{type:"array"});const sheet=workbook.Sheets[workbook.SheetNames[0]];const rows=XLSX.utils.sheet_to_json<Record<string,unknown>>(sheet,{defval:""});const normalized=rows.map(row=>{const entries=Object.fromEntries(Object.entries(row).map(([k,v])=>[k.toLowerCase().trim().replace(/[\s_-]+/g,""),String(v??"").trim()]));const fullName=entries["fullname"]||entries["фио"]||entries["атыжөні"]||entries["name"]||"";const grade=entries["grade"]||entries["сынып"]||entries["класс"]||"";const className=entries["classname"]||entries["сыныпатауы"]||entries["классатауы"]||grade;const email=entries["email"]||entries["почта"]||"";return {fullName,grade:String(grade).replace(/[^0-9]/g,""),className,email};}).filter(x=>x.fullName&&x.grade);if(!normalized.length)throw new Error("format");for(let i=0;i<normalized.length;i+=450){const batch=writeBatch(db);normalized.slice(i,i+450).forEach(student=>{const ref=doc(collection(db,"schools",schoolId,"students"));batch.set(ref,{...student,grade:Number(student.grade),status:"pending_account",createdAt:serverTimestamp(),createdBy:user?.uid||"",source:"spreadsheet_import"});});await batch.commit();}await reload(schoolId);setMessage(kk?String(normalized.length)+" оқушы импортталды.":"Импортировано учеников: "+normalized.length+".");}catch{setMessage(kk?"Файлды оқу мүмкін болмады. Бағандар: fullName, grade, className, email.":"Не удалось прочитать файл. Столбцы: fullName, grade, className, email.");}finally{setBusy(false);e.target.value="";}}
 function downloadTemplate(){const ws=XLSX.utils.aoa_to_sheet([["fullName","grade","className","email"],["Айдана Нұр","5","5 А",""],["Иван Петров","6","6 Б","ivan@example.kz"]]);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Students");XLSX.writeFile(wb,"olympus_students_template.xlsx");}
 if(loading)return <div className="auth-page"><div className="auth-card">{kk?"Жүктелуде…":"Загрузка…"}</div></div>;
 if(!user)return <div className="auth-page"><div className="auth-card"><h1>{kk?"Жүйеге кіріңіз":"Войдите в систему"}</h1><Link className="btn btn-primary" to="/login">{kk?"Кіру":"Войти"}</Link></div></div>;
 if(!schoolId)return <div className="auth-page"><div className="auth-card"><h1>{kk?"Мұғалім кабинетіне қолжетімділік жоқ":"Нет доступа учителя"}</h1><p>{kk?"Аккаунтыңызға teacher рөлі мен schoolId тағайындалуы керек.":"Аккаунту нужно назначить роль teacher и schoolId."}</p><button className="btn btn-ghost" onClick={()=>auth&&signOut(auth)}>{kk?"Шығу":"Выйти"}</button></div></div>;
 return <div className="auth-page"><div className="dashboard-shell">
 <header className="dashboard-head"><Link className="brand" to="/"><span className="brand-mark"><Trophy/></span><span>OLYMPUS<small>TEACHER SPACE</small></span></Link><button className="btn btn-ghost" onClick={()=>auth&&signOut(auth)}>{kk?"Шығу":"Выйти"}</button></header>
 <div className="dashboard-title"><div><span className="section-kicker">OLYMPUS · TEACHER SPACE</span><h1>{kk?"Мұғалім кабинеті":"Кабинет учителя"}</h1><p>{schoolName} · {user.email}</p></div><div className="dashboard-stat"><strong>{tasks.length}</strong><span>{kk?"Тапсырмалар":"Задания"}</span></div><div className="dashboard-stat"><strong>{studentsCount}</strong><span>{kk?"Оқушылар":"Ученики"}</span></div></div>
 <nav className="admin-tabs">{(["overview","tasks","create","import"] as const).map(k=><button key={k} className={tab===k?"active":""} onClick={()=>setTab(k)}>{labels[k]}</button>)}</nav>{message&&<p className="dashboard-message">{message}</p>}
 {tab==="overview"&&<section className="admin-grid"><article className="admin-module"><span className="section-kicker">01 · TASKS</span><h2>{labels.tasks}</h2><strong>{tasks.length}</strong><p>{kk?"Жасалған тапсырмалар":"Созданные задания"}</p><button className="btn btn-primary" onClick={()=>setTab("tasks")}>{kk?"Ашу":"Открыть"} <ArrowRight size={15}/></button></article><article className="admin-module"><span className="section-kicker">02 · STUDENTS</span><h2>{kk?"Оқушылар":"Ученики"}</h2><strong>{studentsCount}</strong><p>{kk?"Мектеп оқушылары":"Ученики школы"}</p><button className="btn btn-primary" onClick={()=>setTab("import")}>{kk?"Импорттау":"Импортировать"} <ArrowRight size={15}/></button></article><article className="admin-module"><span className="section-kicker">03 · BUILDER</span><h2>{labels.create}</h2><p>{kk?"Жаңа сұрақ пен жауап нұсқаларын дайындаңыз.":"Подготовьте вопрос и варианты ответа."}</p><button className="btn btn-primary" onClick={()=>setTab("create")}>{kk?"Құру":"Создать"} <ArrowRight size={15}/></button></article></section>}
 {tab==="create"&&<section className="dashboard-panel"><div className="dashboard-panel-head"><div><h2>{labels.create}</h2><p>{kk?"Тапсырма мектептің ортақ қорына сақталады.":"Задание сохраняется в общей базе школы."}</p></div></div><form className="admin-form teacher-task-form" onSubmit={createTask}>
 <label>{kk?"Тапсырма атауы":"Название задания"}<input required value={taskForm.title} onChange={e=>setTaskForm({...taskForm,title:e.target.value})}/></label><label>{kk?"Пән":"Предмет"}<select value={taskForm.subject} onChange={e=>setTaskForm({...taskForm,subject:e.target.value})}>{["Математика","Қазақ тілі","Орыс тілі","Ағылшын тілі","Информатика","Физика","Химия","Биология","История Казахстана"].map(x=><option key={x}>{x}</option>)}</select></label>
 <label>{kk?"Сынып":"Класс"}<select value={taskForm.grade} onChange={e=>setTaskForm({...taskForm,grade:e.target.value})}>{Array.from({length:11},(_,i)=>String(i+1)).map(x=><option key={x}>{x}</option>)}</select></label><label>{kk?"Тапсырма түрі":"Тип задания"}<select value={taskForm.type} onChange={e=>setTaskForm({...taskForm,type:e.target.value})}><option value="short_answer">{kk?"Қысқа жауап":"Краткий ответ"}</option><option value="single_choice">{kk?"Бір дұрыс жауап":"Один правильный ответ"}</option></select></label>
 <label className="teacher-wide">{kk?"Сұрақ мәтіні":"Текст вопроса"}<textarea required rows={4} value={taskForm.question} onChange={e=>setTaskForm({...taskForm,question:e.target.value})}/></label>{taskForm.type==="single_choice"&&<label className="teacher-wide">{kk?"Жауап нұсқалары (| арқылы бөліңіз)":"Варианты ответов (разделите |)"}<input required placeholder="A | B | C | D" value={taskForm.options} onChange={e=>setTaskForm({...taskForm,options:e.target.value})}/></label>}
 <label>{kk?"Дұрыс жауап":"Правильный ответ"}<input required value={taskForm.answer} onChange={e=>setTaskForm({...taskForm,answer:e.target.value})}/></label><label>{kk?"Ұпай":"Баллы"}<input type="number" min="1" max="100" required value={taskForm.points} onChange={e=>setTaskForm({...taskForm,points:e.target.value})}/></label><button className="btn btn-primary" disabled={busy}>{busy?"…":(kk?"Тапсырманы сақтау":"Сохранить задание")}</button></form></section>}
 {tab==="tasks"&&<section className="dashboard-panel"><div className="dashboard-panel-head"><div><h2>{labels.tasks}</h2><p>{kk?"Мұғалім жасаған тапсырмалар.":"Задания, созданные учителем."}</p></div></div>{tasks.length?tasks.map(t=><article className="application-item" key={t.id}><div className="application-info"><span className="status-pill">{t.status||"draft"}</span><h3>{t.title}</h3><p>{t.subject} · {t.grade} {kk?"сынып":"класс"} · {t.points||1} {kk?"ұпай":"балл"}</p><small>{t.question}</small></div></article>):<div className="empty-state">{kk?"Әзірге тапсырмалар жоқ.":"Пока заданий нет."}</div>}</section>}
 {tab==="import"&&<section className="dashboard-panel"><div className="dashboard-panel-head"><div><h2>{labels.import}</h2><p>{kk?"Excel (.xlsx, .xls) немесе CSV файлынан оқушыларды бірден қосыңыз.":"Добавьте учеников из Excel (.xlsx, .xls) или CSV одним файлом."}</p></div></div><div className="spreadsheet-import"><div><strong>{kk?"Excel үлгісі":"Шаблон Excel"}</strong><p>{kk?"Бағандар: fullName, grade, className, email. Міндеттілері: fullName және grade.":"Столбцы: fullName, grade, className, email. Обязательные: fullName и grade."}</p><button type="button" className="btn btn-ghost" onClick={downloadTemplate}>{kk?"Үлгіні жүктеу":"Скачать шаблон"} <ArrowRight size={15}/></button></div><label className="btn btn-primary import-file">{busy?"…":(kk?"Excel файлын таңдау":"Выбрать Excel-файл")}<input type="file" accept=".xlsx,.xls,.csv" disabled={busy} onChange={importStudents}/></label></div></section>}
 </div></div>;
}

export default function App(){const [lang,setLang]=useState<Lang>("kk");return <Routes><Route path="/login" element={<Login lang={lang}/>}/><Route path="/register-invite" element={<InviteRegistration lang={lang}/>}/><Route path="/dashboard" element={<Dashboard lang={lang}/>}/><Route path="/school" element={<SchoolAdmin lang={lang}/>}/><Route path="/teacher" element={<TeacherDashboard lang={lang}/>}/><Route path="/student" element={<StudentDashboard lang={lang}/>}/><Route path="*" element={<Landing lang={lang} setLang={setLang}/>}/></Routes>}