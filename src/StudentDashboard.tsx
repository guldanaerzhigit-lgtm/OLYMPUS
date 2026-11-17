import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { Navigate } from "react-router-dom";
import { Award, Trophy } from "lucide-react";
import { auth, db } from "./firebase";

type Olympiad = { id: string; title?: string; subject?: string; grade?: string | number; status?: string; startDate?: string };
export default function StudentDashboard({ lang }: { lang: "kk" | "ru" }) {
  const [user, setUser] = useState<User | null>(null);
  const [olympiads, setOlympiads] = useState<Olympiad[]>([]);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const kk = lang === "kk";
  useEffect(() => {
    if (!auth || !db) { setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, async current => {
      setUser(current);
      if (!current) { setLoading(false); return; }
      try {
        const profile = await getDoc(doc(db, "users", current.uid));
        setAuthorized(profile.exists() && profile.data().role === "student");
        if (profile.exists() && profile.data().role === "student") {
          const snap = await getDocs(collection(db, "olympiads"));
          setOlympiads(snap.docs.map(d => ({ id: d.id, ...d.data() } as Olympiad)).filter(o => o.status === "published"));
        }
      } finally { setLoading(false); }
    });
    return () => unsub();
  }, []);
  if (loading) return <div className="auth-page"><div className="auth-card">{kk ? "Жүктелуде…" : "Загрузка…"}</div></div>;
  if (user && !authorized) return <Navigate to="/dashboard" replace />;
  if (!user) return <div className="auth-page"><div className="auth-card"><h1>{kk ? "Жүйеге кіріңіз" : "Войдите в систему"}</h1><Link className="btn btn-primary" to="/login">{kk ? "Кіру" : "Войти"}</Link></div></div>;
  return <div className="auth-page"><div className="dashboard-shell">
    <header className="dashboard-head"><Link className="brand" to="/"><span className="brand-mark"><Trophy /></span><span>OLYMPUS<small>STUDENT SPACE</small></span></Link><button className="btn btn-ghost" onClick={() => auth && signOut(auth)}>{kk ? "Шығу" : "Выйти"}</button></header>
    <div className="dashboard-title"><div><span className="section-kicker">OLYMPUS · STUDENT SPACE</span><h1>{kk ? "Оқушы кабинеті" : "Кабинет ученика"}</h1><p>{user.displayName || user.email}</p></div><div className="dashboard-stat"><strong>{olympiads.length}</strong><span>{kk ? "Қолжетімді олимпиадалар" : "Доступные олимпиады"}</span></div></div>
    <section className="dashboard-panel"><div className="dashboard-panel-head"><div><h2>{kk ? "Жарияланған олимпиадалар" : "Опубликованные олимпиады"}</h2><p>{kk ? "Қатысуға ашық олимпиадалар тізімі." : "Список олимпиад, открытых для участия."}</p></div></div>
      {olympiads.length ? olympiads.map(o => <article className="application-item" key={o.id}><div className="application-info"><h3>{o.title}</h3><p>{o.subject} · {o.grade} {kk ? "сынып" : "класс"}</p><small>{o.startDate || ""}</small></div><span className="status-pill approved"><Award size={14} /> {kk ? "Жарияланды" : "Опубликована"}</span></article>) : <div className="empty-state">{kk ? "Әзірге жарияланған олимпиада жоқ." : "Пока нет опубликованных олимпиад."}</div>}
    </section>
  </div></div>;
}
