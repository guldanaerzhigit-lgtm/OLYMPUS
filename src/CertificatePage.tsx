import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Award, CheckCircle2, ShieldCheck } from "lucide-react";
import { apiGetPublic } from "./api";

type Certificate = { valid: boolean; serial: string; studentName: string; olympiadTitle: string; subject: string; grade: string | number; score: number; maxScore: number; percentage: number; issuedAt: string };
export default function CertificatePage() {
  const { serial = "" } = useParams();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiGetPublic<Certificate>("/api/certificates/verify?serial=" + encodeURIComponent(serial))
      .then(setCertificate).catch(e => setError(String((e as Error).message || e))).finally(() => setLoading(false));
  }, [serial]);
  if (loading) return <div className="auth-page"><div className="auth-card">Сертификат тексерілуде…</div></div>;
  if (error || !certificate?.valid) return <div className="auth-page"><div className="auth-card"><h1>Сертификат табылмады</h1><p>{error || "Бұл сертификат жарамсыз."}</p><Link className="btn btn-primary" to="/">Басты бетке</Link></div></div>;
  return <main className="certificate-page">
    <div className="certificate-toolbar"><Link className="btn btn-ghost" to="/student">← Оқушы кабинетіне</Link><button className="btn btn-primary" onClick={() => window.print()}>PDF ретінде сақтау / Басып шығару</button></div>
    <article className="certificate-sheet">
      <div className="certificate-frame">
        <div className="certificate-brand"><Award size={42}/><span>OLYMPUS<small>SCHOOL OLYMPIAD PLATFORM</small></span></div>
        <div className="certificate-kicker">РЕСМИ СЕРТИФИКАТ · OFFICIAL CERTIFICATE</div>
        <h1>СЕРТИФИКАТ</h1>
        <p className="certificate-subtitle">Осы сертификат төмендегі қатысушының олимпиадаға қатысып, нәтижеге қол жеткізгенін растайды</p>
        <h2>{certificate.studentName}</h2>
        <div className="certificate-rule"/>
        <p className="certificate-description">{certificate.olympiadTitle}</p>
        <p className="certificate-meta">{certificate.subject} · {certificate.grade} сынып</p>
        <div className="certificate-score"><strong>{certificate.score} / {certificate.maxScore}</strong><span>{certificate.percentage}%</span></div>
        <div className="certificate-footer"><div><span>Берілген күні</span><strong>{new Date(certificate.issuedAt).toLocaleDateString("kk-KZ")}</strong></div><div className="certificate-seal"><ShieldCheck size={30}/><span>ТЕКСЕРІЛГЕН</span></div><div><span>Сертификат нөмірі</span><strong>{certificate.serial}</strong></div></div>
        <div className="certificate-verify">Тексеру: {window.location.origin}/api/certificates/verify?serial={encodeURIComponent(certificate.serial)}</div>
      </div>
    </article>
  </main>;
}
