import { useEffect, useState } from "react";
import { BarChart3, Medal, School, Trophy, Users } from "lucide-react";
import { apiPost } from "./api";

type Analytics = {
  schools: number;
  olympiads: number;
  publishedOlympiads: number;
  archivedOlympiads: number;
  totalParticipants: number;
  averagePercentage: number;
  activeSchools: number;
  subjects: Record<string, number>;
  topParticipants: { rank: number; studentName: string; olympiadTitle: string; subject: string; percentage: number; score: number; maxScore: number }[];
};
export default function AdminPlatformAnalytics({ lang }: { lang: "kk" | "ru" }) {
  const kk = lang === "kk";
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiPost<Analytics>("/api/admin/analytics", {}).then(setData).catch(e => setError(String((e as Error).message || e))).finally(() => setLoading(false));
  }, []);
  if (loading) return <section className="dashboard-panel"><p>{kk ? "Олимпиада аналитикасы жүктелуде…" : "Загрузка аналитики олимпиад…"}</p></section>;
  if (error || !data) return <section className="dashboard-panel"><p className="form-error">{error || (kk ? "Деректер жоқ." : "Нет данных.")}</p></section>;
  return <section className="dashboard-panel admin-stack">
    <div className="dashboard-panel-head"><div><h2>{kk ? "OLYMPUS платформасының аналитикасы" : "Аналитика платформы OLYMPUS"}</h2><p>{kk ? "Олимпиадалардың нәтижелері мен қатысу көрсеткіштері." : "Результаты и показатели участия в олимпиадах."}</p></div><BarChart3/></div>
    <div className="admin-grid">
      <article className="admin-module"><School/><h2>{kk ? "Белсенді мектептер" : "Активные школы"}</h2><strong>{data.activeSchools}</strong></article>
      <article className="admin-module"><Trophy/><h2>{kk ? "Жарияланған олимпиадалар" : "Опубликованные олимпиады"}</h2><strong>{data.publishedOlympiads}</strong></article>
      <article className="admin-module"><Users/><h2>{kk ? "Қатысушылар" : "Участники"}</h2><strong>{data.totalParticipants}</strong></article>
      <article className="admin-module"><Medal/><h2>{kk ? "Орташа нәтиже" : "Средний результат"}</h2><strong>{data.averagePercentage}%</strong></article>
    </div>
    <div><h3>{kk ? "Пәндер бойынша қатысу" : "Участие по предметам"}</h3>{Object.keys(data.subjects).length ? Object.entries(data.subjects).sort((a,b)=>b[1]-a[1]).map(([subject,count])=><article className="application-item" key={subject}><strong>{subject}</strong><span>{count} {kk ? "қатысу" : "участий"}</span></article>) : <div className="empty-state">{kk ? "Әзірге нәтиже жоқ." : "Пока нет результатов."}</div>}</div>
    <div><h3>{kk ? "Үздік 10 нәтиже" : "Топ-10 результатов"}</h3>{data.topParticipants.length ? data.topParticipants.map(row=><article className="application-item" key={row.rank}><strong>#{row.rank}</strong><div className="application-info"><h3>{row.studentName}</h3><p>{row.olympiadTitle} · {row.subject}</p></div><span className="status-pill approved">{row.percentage}% · {row.score}/{row.maxScore}</span></article>) : <div className="empty-state">{kk ? "Жоғары орындар әзірге анықталған жоқ." : "Пока нет результатов для рейтинга."}</div>}</div>
  </section>;
}
