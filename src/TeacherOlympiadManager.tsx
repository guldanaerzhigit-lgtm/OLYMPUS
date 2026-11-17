import { useEffect, useState } from "react";
import { apiPost } from "./api";

type Olympiad = { id: string; title?: string; subject?: string; grade?: number; duration?: number; status?: string; questionCount?: number; schoolId?: string; createdAt?: string };
type RankRow = { rank: number; studentName: string; score: number; maxScore: number; percentage: number };

export default function TeacherOlympiadManager({ lang, schoolId }: { lang: "kk" | "ru"; schoolId: string }) {
  const kk = lang === "kk";
  const [items, setItems] = useState<Olympiad[]>([]);
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", subject: "Математика", grade: "5", duration: "45", startDate: "" });
  const [question, setQuestion] = useState({ prompt: "", type: "single_choice", options: "A|Бірінші жауап\nB|Екінші жауап\nC|Үшінші жауап\nD|Төртінші жауап", answer: "A", points: "1" });
  const [ranking, setRanking] = useState<RankRow[]>([]);
  async function reload() {
    const data = await apiPost<{ items: Olympiad[] }>("/api/teacher/olympiads", {});
    const rows = data.items || [];
    setItems(rows);
    if (!selected && rows.length) setSelected(rows[0].id);
    else if (selected && !rows.some(o => o.id === selected)) setSelected(rows[0]?.id || "");
  }
  useEffect(() => { void reload().catch(error => setMessage(String(error))); }, [schoolId]);
  async function createOlympiad(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const data = await apiPost<Olympiad>("/api/teacher/olympiad", { ...form, grade: Number(form.grade), duration: Number(form.duration), startDate: form.startDate ? new Date(form.startDate).toISOString() : "" });
      setForm({ title: "", subject: "Математика", grade: "5", duration: "45", startDate: "" });
      await reload(); setSelected(data.id);
      setMessage(kk ? "Олимпиада жобасы құрылды. Енді сұрақ қосыңыз." : "Черновик олимпиады создан. Теперь добавьте вопросы.");
    } catch (error) { setMessage(String((error as Error).message || error)); }
    finally { setBusy(false); }
  }
  async function addQuestion(event: React.FormEvent) {
    event.preventDefault(); if (!selected) return;
    setBusy(true); setMessage("");
    try {
      const options = question.type === "single_choice" ? question.options.split("\n").map(line => {
        const [value, ...label] = line.split("|");
        return { value: value.trim(), label: label.join("|").trim() };
      }).filter(option => option.value && option.label) : [];
      await apiPost("/api/teacher/question", { olympiadId: selected, prompt: question.prompt, type: question.type, options, answer: question.answer.trim(), points: Number(question.points) });
      setQuestion(old => ({ ...old, prompt: "" }));
      await reload();
      setMessage(kk ? "Сұрақ сақталды. Дұрыс жауап оқушыға көрсетілмейді." : "Вопрос сохранён. Правильный ответ ученику не раскрывается.");
    } catch (error) { setMessage(String((error as Error).message || error)); }
    finally { setBusy(false); }
  }
  async function loadRanking(id: string) {
    setSelected(id); setRanking([]);
    try { const data = await apiPost<{ rows: RankRow[] }>("/api/olympiad/leaderboard", { olympiadId: id }); setRanking(data.rows || []); }
    catch (error) { setMessage(String((error as Error).message || error)); }
  }
  return <div className="admin-stack">
    <section className="dashboard-panel"><div className="dashboard-panel-head"><div><h2>{kk ? "Олимпиада құру" : "Создать олимпиаду"}</h2><p>{kk ? "Мектеп олимпиадасын дайындап, оған сұрақтар енгізіңіз." : "Создайте школьную олимпиаду и добавьте вопросы."}</p></div></div>
      <form className="admin-form" onSubmit={createOlympiad}>
        <label>{kk ? "Атауы" : "Название"}<input required minLength={3} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}/></label>
        <label>{kk ? "Пән" : "Предмет"}<select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}>{["Математика","Қазақ тілі","Орыс тілі","Ағылшын тілі","Информатика","Физика","Химия","Биология","Қазақстан тарихы"].map(x => <option key={x}>{x}</option>)}</select></label>
        <label>{kk ? "Сынып" : "Класс"}<select value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })}>{Array.from({ length: 11 }, (_, i) => String(i + 1)).map(x => <option key={x}>{x}</option>)}</select></label>
        <label>{kk ? "Ұзақтығы (минут)" : "Длительность (минут)"}<input type="number" min="1" max="240" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })}/></label>
        <label>{kk ? "Басталу уақыты (міндетті емес)" : "Начало (необязательно)"}<input type="datetime-local" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}/></label>
        <button className="btn btn-primary" disabled={busy}>{busy ? "…" : (kk ? "Жоба жасау" : "Создать черновик")}</button>
      </form>
    </section>
    <section className="dashboard-panel"><div className="dashboard-panel-head"><div><h2>{kk ? "Мектеп олимпиадалары" : "Олимпиады школы"}</h2><p>{kk ? "Сұрақтар тек жарияланбаған жобаға қосылады." : "Вопросы добавляются только в неопубликованный черновик."}</p></div></div>
      {items.length ? <div className="application-list">{items.map(item => <article className="application-item" key={item.id}><div className="application-info"><span className={"status-pill " + (item.status === "published" ? "approved" : "pending")}>{item.status}</span><h3>{item.title}</h3><p>{item.subject} · {item.grade} {kk ? "сынып" : "класс"} · {item.questionCount || 0} {kk ? "сұрақ" : "вопросов"}</p></div><button className="btn btn-ghost" onClick={() => loadRanking(item.id)}>{kk ? "Рейтинг" : "Рейтинг"}</button></article>)}</div> : <div className="empty-state">{kk ? "Әзірге олимпиада жоқ. Жоғарыдан жоба құрыңыз." : "Пока нет олимпиад. Создайте черновик выше."}</div>}
    </section>
    <section className="dashboard-panel"><div className="dashboard-panel-head"><div><h2>{kk ? "Сұрақ енгізу" : "Добавить вопрос"}</h2><p>{kk ? "Жарияланған соң сұрақтар өзгертілмейді." : "После публикации вопросы заблокированы для изменений."}</p></div></div>
      <form className="admin-form" onSubmit={addQuestion}>
        <label>{kk ? "Олимпиада жобасы" : "Черновик олимпиады"}<select required value={selected} onChange={e => setSelected(e.target.value)}><option value="">{kk ? "Таңдаңыз" : "Выберите"}</option>{items.filter(x => x.status === "draft").map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <label>{kk ? "Сұрақ түрі" : "Тип вопроса"}<select value={question.type} onChange={e => setQuestion({ ...question, type: e.target.value })}><option value="single_choice">{kk ? "Бір дұрыс жауап" : "Один правильный ответ"}</option><option value="short_answer">{kk ? "Қысқа жауап" : "Краткий ответ"}</option></select></label>
        <label className="teacher-wide">{kk ? "Сұрақ мәтіні" : "Текст вопроса"}<textarea required rows={3} value={question.prompt} onChange={e => setQuestion({ ...question, prompt: e.target.value })}/></label>
        {question.type === "single_choice" && <label className="teacher-wide">{kk ? "Нұсқалар (әр жолда мән|мәтін)" : "Варианты (каждая строка: значение|текст)"}<textarea rows={4} value={question.options} onChange={e => setQuestion({ ...question, options: e.target.value })}/></label>}
        <label>{kk ? "Дұрыс жауаптың мәні" : "Значение правильного ответа"}<input required value={question.answer} onChange={e => setQuestion({ ...question, answer: e.target.value })} placeholder="A"/></label>
        <label>{kk ? "Ұпай" : "Баллы"}<input type="number" min="1" max="100" value={question.points} onChange={e => setQuestion({ ...question, points: e.target.value })}/></label>
        <button className="btn btn-primary" disabled={busy || !selected || !items.some(x => x.id === selected && x.status === "draft")}>{busy ? "…" : (kk ? "Сұрақты сақтау" : "Сохранить вопрос")}</button>
      </form>
      {ranking.length > 0 && <div className="application-list" style={{ marginTop: 20 }}><h3>{kk ? "Нәтижелер рейтингі" : "Рейтинг результатов"}</h3>{ranking.map(row => <article className="application-item" key={row.rank}><strong>#{row.rank}</strong><div className="application-info"><h3>{row.studentName}</h3><p>{row.score}/{row.maxScore} · {row.percentage}%</p></div></article>)}</div>}
    </section>
    {message && <p className="dashboard-message">{message}</p>}
  </div>;
}
