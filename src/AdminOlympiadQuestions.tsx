import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { apiPost } from "./api";
import { db } from "./firebase";

type Olympiad = { id: string; title?: string; status?: string; questionCount?: number };
export default function AdminOlympiadQuestions({ lang }: { lang: "kk" | "ru" }) {
  const kk = lang === "kk";
  const [items, setItems] = useState<Olympiad[]>([]);
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ prompt: "", type: "single_choice", options: "A|Бірінші жауап\nB|Екінші жауап\nC|Үшінші жауап\nD|Төртінші жауап", answer: "A", points: "1" });
  async function reload() {
    if (!db) return;
    const snap = await getDocs(collection(db, "olympiads"));
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() } as Olympiad)).filter(o => o.status === "draft");
    setItems(rows);
    if (!selected && rows.length) setSelected(rows[0].id);
  }
  useEffect(() => { void reload().catch(e => setMessage(String(e))); }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true); setMessage("");
    try {
      const options = form.type === "single_choice" ? form.options.split("\n").map(line => {
        const [value, ...label] = line.split("|");
        return { value: value.trim(), label: label.join("|").trim() };
      }).filter(option => option.value && option.label) : [];
      await apiPost("/api/admin/question", { olympiadId: selected, prompt: form.prompt, type: form.type, options, answer: form.answer.trim(), points: Number(form.points) });
      setForm(old => ({ ...old, prompt: "" }));
      await reload();
      setMessage(kk ? "Сұрақ қосылды. Енді жариялауға болады." : "Вопрос добавлен. Теперь можно публиковать.");
    } catch (e) { setMessage(String((e as Error).message || e)); }
    finally { setBusy(false); }
  }
  return <section className="dashboard-panel admin-stack"><div className="dashboard-panel-head"><div><h2>{kk ? "Олимпиадаға сұрақ қосу" : "Добавить вопросы к олимпиаде"}</h2><p>{kk ? "Жарияланбаған жобаға сұрақтар қосыңыз. Жарияланған соң дұрыс жауаптар өзгертілмейді." : "Добавьте вопросы в черновик. После публикации ответы защищены от изменений."}</p></div><button type="button" className="btn btn-ghost" onClick={() => void reload()}>{kk ? "Тізімді жаңарту" : "Обновить список"}</button></div>
    <div className="application-list">{items.map(item => <article className="application-item" key={item.id}><div className="application-info"><h3>{item.title}</h3><p>{item.questionCount || 0} {kk ? "сұрақ" : "вопросов"}</p></div></article>)}</div>
    <form className="admin-form" onSubmit={submit}>
      <label>{kk ? "Олимпиада жобасы" : "Черновик олимпиады"}<select required value={selected} onChange={e => setSelected(e.target.value)}><option value="">{kk ? "Таңдаңыз" : "Выберите"}</option>{items.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      <label>{kk ? "Сұрақ түрі" : "Тип вопроса"}<select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="single_choice">{kk ? "Бір дұрыс жауап" : "Один правильный ответ"}</option><option value="short_answer">{kk ? "Қысқа жауап" : "Краткий ответ"}</option></select></label>
      <label className="teacher-wide">{kk ? "Сұрақ мәтіні" : "Текст вопроса"}<textarea required rows={3} value={form.prompt} onChange={e => setForm({ ...form, prompt: e.target.value })}/></label>
      {form.type === "single_choice" && <label className="teacher-wide">{kk ? "Нұсқалар (әр жолда мән|мәтін)" : "Варианты (каждая строка: значение|текст)"}<textarea rows={4} value={form.options} onChange={e => setForm({ ...form, options: e.target.value })}/></label>}
      <label>{kk ? "Дұрыс жауап мәні" : "Значение правильного ответа"}<input required value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })}/></label>
      <label>{kk ? "Ұпай" : "Баллы"}<input type="number" min="1" max="100" value={form.points} onChange={e => setForm({ ...form, points: e.target.value })}/></label>
      <button className="btn btn-primary" disabled={busy || !selected}>{busy ? "…" : (kk ? "Сұрақты сақтау" : "Сохранить вопрос")}</button>
    </form>
    {message && <p className="dashboard-message">{message}</p>}
  </section>;
}
