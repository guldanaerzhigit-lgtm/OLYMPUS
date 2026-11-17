import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { ArrowRight, LockKeyhole, Trophy } from "lucide-react";
import { auth } from "./firebase";

type CompleteResult = { uid: string; email: string; role: string };
export default function InviteRegistration({ lang }: { lang: "kk" | "ru" }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const kk = lang === "kk";
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (!token) { setError(kk ? "Шақыру сілтемесі жарамсыз." : "Ссылка-приглашение недействительна."); return; }
    if (password.length < 8 || password !== confirmPassword) { setError(kk ? "Құпиясөздерді тексеріңіз (кемінде 8 таңба)." : "Проверьте пароли (не менее 8 символов)."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/register-invite", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, displayName: displayName.trim(), password }) });
      const data = await response.json() as CompleteResult & { error?: string };
      if (!response.ok) throw new Error(data.error || "Registration failed");
      await signInWithEmailAndPassword(auth, data.email, password);
      navigate(data.role === "school_admin" ? "/school" : data.role === "teacher" ? "/teacher" : "/student");
    } catch (err) {
      const msg = String((err as Error).message || "");
      if (msg.toLowerCase().includes("already exists") || msg.includes("EMAIL_EXISTS")) setError(kk ? "Бұл email бұрын тіркелген. Бұрынғы аккаунтпен кіріңіз." : "Этот email уже зарегистрирован. Войдите в существующий аккаунт.");
      else setError(kk ? "Тіркелу орындалмады. Шақыру сілтемесін тексеріңіз." : "Не удалось зарегистрироваться. Проверьте ссылку-приглашение.");
    } finally { setBusy(false); }
  }
  return <div className="auth-page">
    <Link className="brand" to="/"><span className="brand-mark"><Trophy /></span><span>OLYMPUS<small>SCHOOL OLYMPIAD PLATFORM</small></span></Link>
    <form className="auth-card" onSubmit={submit}>
      <div className="feature-icon"><LockKeyhole /></div>
      <h1>{kk ? "Шақыру арқылы тіркелу" : "Регистрация по приглашению"}</h1>
      <p>{kk ? "Аты-жөніңізді енгізіп, аккаунт құпиясөзін жасаңыз." : "Укажите имя и создайте пароль для аккаунта."}</p>
      {!token && <p className="form-error">{kk ? "Шақыру токені сілтемеде жоқ." : "В ссылке отсутствует токен приглашения."}</p>}
      <label>{kk ? "Аты-жөні" : "ФИО"}<input required minLength={2} value={displayName} onChange={e => setDisplayName(e.target.value)} /></label>
      <label>{kk ? "Құпиясөз (кемінде 8 таңба)" : "Пароль (не менее 8 символов)"}<input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
      <label>{kk ? "Құпиясөзді қайталаңыз" : "Повторите пароль"}<input required type="password" minLength={8} autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></label>
      {error && <p className="form-error">{error}</p>}
      <button className="btn btn-primary submit-btn" disabled={busy || !token}>{busy ? "…" : (kk ? "Аккаунт ашу" : "Создать аккаунт")}<ArrowRight size={17} /></button>
      <Link className="back-link" to="/login">{kk ? "Аккаунтыңыз бар ма? Кіру" : "Уже есть аккаунт? Войти"}</Link>
    </form>
  </div>;
}
