import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { Award, Clock3, Medal, Trophy } from "lucide-react";
import { auth, db } from "./firebase";
import { apiPost } from "./api";

type Olympiad = { id: string; title?: string; subject?: string; grade?: string | number; status?: string; startDate?: string; duration?: number; schoolId?: string; questionCount?: number };
type TestQuestion = { id: string; prompt: string; type: "single_choice" | "short_answer"; options?: { value: string; label: string }[]; points?: number };
type Attempt = { attemptId: string; expiresAt: string; savedAnswers?: Record<string, string>; completedResult?: Result | null; questions: TestQuestion[]; olympiad: { id: string; title: string; duration: number } };
type Result = { olympiadId: string; olympiadTitle: string; score: number; maxScore: number; percentage: number; correctCount: number; totalQuestions: number; submittedAt: string; certificateSerial: string };
type LeaderRow = { rank: number; studentName: string; score: number; maxScore: number; percentage: number };

export default function StudentDashboard({ lang }: { lang: "kk" | "ru" }) {
  const [user, setUser] = useState<User | null>(null);
  const [olympiads, setOlympiads] = useState<Olympiad[]>([]);
  const [history, setHistory] = useState<Result[]>([]);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"available" | "results" | "archive">("available");
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const answersRef = useRef<Record<string, string>>({});
  const [remaining, setRemaining] = useState(0);
  const expiredSubmitRef = useRef(false);
  const [result, setResult] = useState<Result | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);
  const [leaderboardId, setLeaderboardId] = useState("");
  const kk = lang === "kk";

  async function refreshHistory() {
    const data = await apiPost<{ history: Result[] }>("/api/student/history", {});
    setHistory(data.history || []);
  }
  useEffect(() => {
    if (!auth || !db) { setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, async current => {
      setUser(current);
      if (!current) { setLoading(false); return; }
      try {
        const profile = await getDoc(doc(db, "users", current.uid));
        const isStudent = profile.exists() && profile.data().role === "student";
        setAuthorized(isStudent);
        if (isStudent) {
          const [snap] = await Promise.all([getDocs(collection(db, "olympiads"))]);
          setOlympiads(snap.docs.map(d => ({ id: d.id, ...d.data() } as Olympiad)).filter(o => ["published", "archived"].includes(o.status || "")));
          await refreshHistory();
        }
      } catch (error) { setMessage(String((error as Error).message || error)); }
      finally { setLoading(false); }
    });
    return () => unsub();
  }, []);

  async function startOlympiad(olympiadId: string) {
    setBusy(true); setMessage(""); setResult(null); setAnswers({}); answersRef.current = {};
    try {
      const data = await apiPost<Attempt>("/api/olympiad/start", { olympiadId });
      if (data.completedResult) {
        setResult(data.completedResult);
        setAttempt(null);
        await refreshHistory();
        setTab("results");
        return;
      }
      setAttempt(data);
      setAnswers(data.savedAnswers || {}); answersRef.current = data.savedAnswers || {};
      expiredSubmitRef.current = false;
      setTab("available");
    } catch (error) { setMessage(String((error as Error).message || error)); }
    finally { setBusy(false); }
  }
  async function saveDraft(nextAnswers: Record<string, string>) {
    if (!attempt) return;
    try { await apiPost("/api/olympiad/save", { olympiadId: attempt.olympiad.id, answers: nextAnswers }); }
    catch (error) { setMessage(String((error as Error).message || error)); }
  }
  async function submitAttempt(auto = false) {
    if (!attempt || busy) return;
    setBusy(true); setMessage("");
    try {
      const data = await apiPost<Result>("/api/olympiad/submit", { olympiadId: attempt.olympiad.id, answers: answersRef.current });
      setResult(data); setAttempt(null); setRemaining(0);
      await refreshHistory();
      setTab("results");
      setMessage(auto ? (kk ? "Уақыт аяқталды. Жауаптар тексерілді." : "Время закончилось. Ответы проверены.") : (kk ? "Жауаптар қабылданды." : "Ответы приняты."));
    } catch (error) { setMessage(String((error as Error).message || error)); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    if (!attempt) return;
    const update = () => {
      const seconds = Math.max(0, Math.ceil((new Date(attempt.expiresAt).getTime() - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds <= 0 && !expiredSubmitRef.current) {
        expiredSubmitRef.current = true;
        void submitAttempt(true);
      }
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [attempt]);

  async function showLeaderboard(olympiadId: string) {
    setLeaderboardId(olympiadId); setLeaderboard([]);
    try {
      const data = await apiPost<{ rows: LeaderRow[] }>("/api/olympiad/leaderboard", { olympiadId });
      setLeaderboard(data.rows || []);
    } catch (error) { setMessage(String((error as Error).message || error)); }
  }
  const available = olympiads.filter(o => o.status === "published");
  const archived = olympiads.filter(o => o.status === "archived");
  const formatTime = (seconds: number) => String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");

  if (loading) return <div className="auth-page"><div className="auth-card">{kk ? "Жүктелуде…" : "Загрузка…"}</div></div>;
  if (user && !authorized) return <Navigate to="/dashboard" replace />;
  if (!user) return <div className="auth-page"><div className="auth-card"><h1>{kk ? "Жүйеге кіріңіз" : "Войдите в систему"}</h1><Link className="btn btn-primary" to="/login">{kk ? "Кіру" : "Войти"}</Link></div></div>;

  return <div className="auth-page"><div className="dashboard-shell">
    <header className="dashboard-head"><Link className="brand" to="/"><span className="brand-mark"><Trophy /></span><span>OLYMPUS<small>STUDENT SPACE</small></span></Link><button className="btn btn-ghost" onClick={() => auth && signOut(auth)}>{kk ? "Шығу" : "Выйти"}</button></header>
    <div className="dashboard-title"><div><span className="section-kicker">OLYMPUS · STUDENT SPACE</span><h1>{kk ? "Оқушы кабинеті" : "Кабинет ученика"}</h1><p>{user.displayName || user.email}</p></div><div className="dashboard-stat"><strong>{available.length}</strong><span>{kk ? "Қолжетімді олимпиадалар" : "Доступные олимпиады"}</span></div><div className="dashboard-stat"><strong>{history.length}</strong><span>{kk ? "Нәтижелер" : "Результаты"}</span></div></div>
    <nav className="admin-tabs">
      <button className={tab === "available" ? "active" : ""} onClick={() => setTab("available")}>{kk ? "Олимпиадалар" : "Олимпиады"}</button>
      <button className={tab === "results" ? "active" : ""} onClick={() => setTab("results")}>{kk ? "Нәтижелерім" : "Мои результаты"}</button>
      <button className={tab === "archive" ? "active" : ""} onClick={() => setTab("archive")}>{kk ? "Архив" : "Архив"}</button>
    </nav>
    {message && <p className="dashboard-message">{message}</p>}
    {result && <section className="dashboard-panel result-panel"><span className="status-pill approved"><Award size={14}/> {kk ? "Тест аяқталды" : "Тест завершён"}</span><h2>{result.olympiadTitle}</h2><div className="admin-grid"><article className="admin-module"><h2>{kk ? "Ұпай" : "Баллы"}</h2><strong>{result.score}/{result.maxScore}</strong></article><article className="admin-module"><h2>{kk ? "Нәтиже" : "Результат"}</h2><strong>{result.percentage}%</strong></article><article className="admin-module"><h2>{kk ? "Дұрыс жауап" : "Верно"}</h2><strong>{result.correctCount}/{result.totalQuestions}</strong></article></div>{result.certificateSerial && <Link className="btn btn-primary" to={"/certificate/" + encodeURIComponent(result.certificateSerial)}>{kk ? "PDF сертификатты ашу" : "Открыть PDF сертификат"} <Award size={16}/></Link>}</section>}
    {attempt && <section className="dashboard-panel test-panel"><div className="dashboard-panel-head"><div><span className="section-kicker">{kk ? "ОНЛАЙН ТЕСТІЛЕУ" : "ОНЛАЙН ТЕСТИРОВАНИЕ"}</span><h2>{attempt.olympiad.title}</h2><p>{kk ? "Жауаптарыңызды белгілеңіз. Уақыт біткенде тест автоматты жіберіледі." : "Выберите ответы. По окончании времени тест отправится автоматически."}</p></div><div className="dashboard-stat"><strong><Clock3 size={18}/> {formatTime(remaining)}</strong><span>{kk ? "Қалған уақыт" : "Осталось"}</span></div></div>
      {attempt.questions.map((q, index) => <article className="application-item question-card" key={q.id}><div className="application-info"><span className="status-pill">{index + 1}. {q.points || 1} {kk ? "ұпай" : "балл"}</span><h3>{q.prompt}</h3>{q.type === "single_choice" ? <div className="question-options">{(q.options || []).map(option => <label key={option.value}><input type="radio" name={q.id} checked={answers[q.id] === option.value} onChange={() => { const next = { ...answersRef.current, [q.id]: option.value }; answersRef.current = next; setAnswers(next); void saveDraft(next); }}/><span>{option.label}</span></label>)}</div> : <label className="question-answer">{kk ? "Жауап" : "Ответ"}<input value={answers[q.id] || ""} onChange={event => { const next = { ...answersRef.current, [q.id]: event.target.value }; answersRef.current = next; setAnswers(next); }} onBlur={() => void saveDraft(answersRef.current)}/></label>}</div></article>)}
      <button className="btn btn-primary" disabled={busy} onClick={() => { expiredSubmitRef.current = true; void submitAttempt(false); }}>{busy ? "…" : (kk ? "Тесті аяқтап, жіберу" : "Завершить и отправить")}</button>
    </section>}
    {!attempt && tab === "available" && <section className="dashboard-panel"><div className="dashboard-panel-head"><div><h2>{kk ? "Қолжетімді олимпиадалар" : "Доступные олимпиады"}</h2><p>{kk ? "Жарияланған олимпиаданы таңдап, онлайн тест тапсырыңыз." : "Выберите опубликованную олимпиаду и пройдите тест онлайн."}</p></div></div>
      {available.length ? available.map(o => <article className="application-item" key={o.id}><div className="application-info"><span className="status-pill approved">{kk ? "Ашық" : "Открыта"}</span><h3>{o.title}</h3><p>{o.subject} · {o.grade} {kk ? "сынып" : "класс"} · {o.duration || 60} {kk ? "минут" : "мин."}</p></div><div className="application-actions"><button className="btn btn-primary" disabled={busy} onClick={() => startOlympiad(o.id)}>{kk ? "Қатысу" : "Участвовать"}</button><button className="btn btn-ghost" onClick={() => showLeaderboard(o.id)}>{kk ? "Рейтинг" : "Рейтинг"}</button></div></article>) : <div className="empty-state">{kk ? "Әзірге жарияланған олимпиада жоқ." : "Пока нет опубликованных олимпиад."}</div>}
      {leaderboardId && <div className="leaderboard-panel"><h3>{kk ? "Олимпиада рейтингі" : "Рейтинг олимпиады"}</h3>{leaderboard.length ? leaderboard.map(row => <article className="application-item" key={row.rank}><strong>#{row.rank}</strong><div className="application-info"><h3>{row.studentName}</h3><p>{row.score}/{row.maxScore} · {row.percentage}%</p></div><Medal/></article>) : <div className="empty-state">{kk ? "Әзірге нәтиже жоқ." : "Пока нет результатов."}</div>}</div>}
    </section>}
    {!attempt && tab === "results" && <section className="dashboard-panel"><div className="dashboard-panel-head"><div><h2>{kk ? "Менің нәтижелерім" : "Мои результаты"}</h2><p>{kk ? "Тапсырылған олимпиадалар және сертификаттарыңыз." : "Пройденные олимпиады и ваши сертификаты."}</p></div></div>{history.length ? history.map(item => <article className="application-item" key={item.olympiadId}><div className="application-info"><h3>{item.olympiadTitle}</h3><p>{item.score}/{item.maxScore} · {item.percentage}% · {new Date(item.submittedAt).toLocaleString()}</p></div>{item.certificateSerial && <Link className="btn btn-ghost" to={"/certificate/" + encodeURIComponent(item.certificateSerial)}>{kk ? "Сертификат PDF" : "PDF сертификат"}</Link>}</article>) : <div className="empty-state">{kk ? "Әзірге нәтиже жоқ." : "Пока результатов нет."}</div>}</section>}
    {!attempt && tab === "archive" && <section className="dashboard-panel"><div className="dashboard-panel-head"><div><h2>{kk ? "Олимпиада архиві" : "Архив олимпиад"}</h2><p>{kk ? "Аяқталған және архивтелген олимпиадалар." : "Завершённые и архивированные олимпиады."}</p></div></div>{archived.length ? archived.map(o => <article className="application-item" key={o.id}><div className="application-info"><h3>{o.title}</h3><p>{o.subject} · {o.grade} {kk ? "сынып" : "класс"}</p></div><span className="status-pill">{kk ? "Архивте" : "В архиве"}</span></article>) : <div className="empty-state">{kk ? "Архив әзірге бос." : "Архив пока пуст."}</div>}</section>}
  </div></div>;
}
