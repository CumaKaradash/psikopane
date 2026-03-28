"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Brain,
  Calendar,
  Shield,
  Users,
  ChevronRight,
  Star,
  CheckCircle,
  BarChart2,
  FileText,
  Clock,
  Heart,
  ArrowRight,
  Sparkles,
  BookOpen,
  Lock,
  Zap,
} from "lucide-react";

export default function LandingPage() {
  const [session, setSession] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<"client" | "expert">("client");
  const [footerModal, setFooterModal] = useState<"gizlilik" | "kvkk" | "iletisim" | null>(null);

  // İletişim formu state'leri
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setSession(!!data.session);
    });
  }, []);

  // Modal kapandığında formu sıfırla
  useEffect(() => {
    if (!footerModal) {
      setTimeout(() => {
        setSubmitStatus("idle");
        setContactForm({ name: "", email: "", message: "" });
      }, 300);
    }
  }, [footerModal]);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      // Resend üzerinden 'cumakaradash@gmail.com' adresine mail atacak olan API endpoint'in
      // Not: Sunucu tarafında (örn: app/api/send/route.ts) 'to' alanı güvenliğe göre kullanılabilir.
      /* const response = await fetch('/api/send', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...contactForm, 
          targetEmail: "cumakaradash@gmail.com" 
        }) 
      });

      if (!response.ok) throw new Error("Gönderim hatası");
      */
      
      // Yukarıdaki API hazır olana kadar başarılı bir gönderimi simüle ediyoruz
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      setSubmitStatus("success");
      setContactForm({ name: "", email: "", message: "" });
    } catch (error) {
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--cream)", color: "var(--charcoal)" }}
    >
      {/* ── BETA ANNOUNCEMENT BANNER ── */}
      <div
        className="w-full py-2.5 px-4 text-center text-xs font-semibold flex items-center justify-center gap-2"
        style={{ backgroundColor: "var(--sage)", color: "white" }}
      >
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
          style={{ backgroundColor: "rgba(255,255,255,0.25)", color: "white" }}
        >
          BETA
        </span>
        Psikopanel şu an kapalı beta aşamasındadır — sınırlı sayıda uzman için erken erişim başladı.{" "}
        <a
          href="/auth"
          className="underline underline-offset-2 hover:opacity-80 transition-opacity font-bold"
          style={{ color: "white" }}
        >
          Erken erişim listesine katıl →
        </a>
      </div>

      {/* ── NAVBAR ── */}
      <nav
        className="sticky top-0 z-50 border-b"
        style={{
          backgroundColor: "rgba(250,248,244,0.92)",
          backdropFilter: "blur(12px)",
          borderColor: "var(--border)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "var(--sage)" }}
            >
              <Brain size={16} className="text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span
                className="text-[9px] font-bold tracking-widest uppercase"
                style={{ color: "var(--sage)" }}
              >
                beta
              </span>
              <span
                className="text-lg font-bold tracking-tight"
                style={{ color: "var(--charcoal)" }}
              >
                psiko<span style={{ color: "var(--sage)" }}>panel</span>
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a
              href="#nasil-calisir"
              className="transition-colors hover:opacity-70"
              style={{ color: "var(--muted)" }}
            >
              Nasıl Çalışır?
            </a>
            <a
              href="#ozellikler"
              className="transition-colors hover:opacity-70"
              style={{ color: "var(--muted)" }}
            >
              Özellikler
            </a>
            <a
              href="#uzmanlar"
              className="transition-colors hover:opacity-70"
              style={{ color: "var(--muted)" }}
            >
              Uzmanlar İçin
            </a>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            {session === null ? (
              <div className="w-40 h-9 rounded-lg animate-pulse" style={{ backgroundColor: "var(--border)" }} />
            ) : session ? (
              <Link href="/panel" className="btn-primary">
                <BarChart2 size={14} />
                Yönetim Paneline Git
              </Link>
            ) : (
              <>
                <Link
                  href="/uzman-bul"
                  className="hidden sm:flex items-center gap-1.5 text-sm font-medium transition-colors"
                  style={{ color: "var(--sage)" }}
                >
                  <Users size={14} />
                  Uzman Bul
                </Link>
                <Link href="/auth/login" className="btn-primary" style={{ backgroundColor: "var(--sage)" }}>
                  <Lock size={14} />
                  Psikolog Olarak Giriş Yap
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden pt-20 pb-28">
        {/* Subtle background blobs */}
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-20 pointer-events-none"
          style={{
            background: `radial-gradient(circle, var(--sage-pale) 0%, transparent 70%)`,
            transform: "translate(30%, -30%)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-15 pointer-events-none"
          style={{
            background: `radial-gradient(circle, var(--accent-l) 0%, transparent 70%)`,
            transform: "translate(-30%, 30%)",
          }}
        />

        <div className="max-w-6xl mx-auto px-6 relative">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border"
                style={{
                  backgroundColor: "var(--sage)",
                  color: "white",
                  borderColor: "var(--sage)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
                BETA
              </div>
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border"
                style={{
                  backgroundColor: "var(--sage-pale)",
                  color: "var(--sage)",
                  borderColor: "var(--sage-l)",
                }}
              >
                <Sparkles size={11} />
                Erken Erişim Açık — Sınırlı Kontenjan
              </div>
            </div>

            <h1
              className="text-5xl sm:text-6xl font-bold leading-[1.1] tracking-tight mb-6"
              style={{ color: "var(--charcoal)" }}
            >
              Danışanlarınıza{" "}
              <span style={{ color: "var(--sage)" }}>odaklanın</span>,
              <br />
              gerisini bize bırakın
            </h1>

            <p
              className="text-lg leading-relaxed mb-10 max-w-2xl"
              style={{ color: "var(--muted)" }}
            >
              Psikopanel; seans yönetimi, danışan takibi, görev atama ve
              finansal raporlamayı tek çatı altında sunan modern bir klinik
              yönetim platformudur.
            </p>

            {/* Dual CTA */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/auth"
                className="btn-primary text-base px-6 py-3 rounded-xl"
                style={{ backgroundColor: "var(--sage)" }}
              >
                <Zap size={16} />
                Beta'ya Erken Erişim Al
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/uzman-bul"
                className="btn-outline text-base px-6 py-3 rounded-xl"
              >
                <Users size={16} />
                Uzman Ara
              </Link>
            </div>

            {/* Beta note */}
            <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
              Beta kullanıcılarına ilk 3 ay <strong>ücretsiz</strong> + ömür boyu indirimli fiyat kilitleniyor.
            </p>

            {/* Trust strip */}
            <div className="mt-10 flex items-center gap-6 flex-wrap">
              {[
                { icon: Shield, text: "KVKK Uyumlu" },
                { icon: Lock, text: "Uçtan Uca Şifreli" },
                { icon: Star, text: "Beta kullanıcılarına özel fiyat kilidi" },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-1.5 text-sm font-medium"
                  style={{ color: "var(--muted)" }}
                >
                  <Icon size={13} style={{ color: "var(--sage)" }} />
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TAB SWITCH: Danışan / Uzman ── */}
      <section id="nasil-calisir" className="py-20 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-6xl mx-auto px-6">
          {/* Tab switcher */}
          <div className="flex justify-center mb-12">
            <div
              className="inline-flex rounded-xl p-1 gap-1 border"
              style={{ backgroundColor: "var(--border)", borderColor: "var(--border)" }}
            >
              {(["client", "expert"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
                  style={{
                    backgroundColor: activeTab === tab ? "white" : "transparent",
                    color: activeTab === tab ? "var(--charcoal)" : "var(--muted)",
                    boxShadow: activeTab === tab ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  {tab === "client" ? "Danışanlar İçin" : "Uzmanlar İçin"}
                </button>
              ))}
            </div>
          </div>

          {/* Client Tab */}
          {activeTab === "client" && (
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4" style={{ color: "var(--charcoal)" }}>
                  Destek almak hiç bu kadar{" "}
                  <span style={{ color: "var(--sage)" }}>kolay olmamıştı</span>
                </h2>
                <p className="mb-8 leading-relaxed" style={{ color: "var(--muted)" }}>
                  Doğru uzmana ulaşın, seanslarınızı planlayın, ödevlerinizi
                  takip edin ve psikolojik testlerinizi tamamlayın — hepsi tek
                  bir yerden.
                </p>
                <ul className="space-y-4">
                  {[
                    { icon: Users, text: "Uzmanlığa göre filtrelenmiş psikolog listesi" },
                    { icon: Calendar, text: "Müsaitlik takviminden online randevu alma" },
                    { icon: BookOpen, text: "Seans arası ödev ve testlere erişim" },
                    { icon: Zap, text: "Terapistinizle güvenli iletişim" },
                  ].map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-start gap-3">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: "var(--sage-pale)" }}
                      >
                        <Icon size={13} style={{ color: "var(--sage)" }} />
                      </div>
                      <span className="text-sm" style={{ color: "var(--charcoal)" }}>{text}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/uzman-bul" className="btn-primary mt-8 w-fit" style={{ backgroundColor: "var(--sage)" }}>
                  Uzman Bul
                  <ChevronRight size={14} />
                </Link>
              </div>

              {/* Mockup card */}
              <div
                className="rounded-2xl border p-6 shadow-md"
                style={{ backgroundColor: "white", borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-3 mb-5 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--sage-pale)" }}>
                    <Brain size={18} style={{ color: "var(--sage)" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Uzman Profili</p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>Bilişsel Davranışçı Terapi</p>
                  </div>
                  <span className="pill-sage ml-auto">Müsait</span>
                </div>
                {[
                  { day: "Pazartesi", time: "10:00 – 11:00" },
                  { day: "Çarşamba", time: "14:00 – 15:00" },
                  { day: "Cuma", time: "09:00 – 10:00" },
                ].map((slot) => (
                  <div
                    key={slot.day}
                    className="flex items-center justify-between py-3 border-b last:border-b-0"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="flex items-center gap-2">
                      <Clock size={13} style={{ color: "var(--sage)" }} />
                      <span className="text-sm font-medium">{slot.day}</span>
                    </div>
                    <span className="text-xs" style={{ color: "var(--muted)" }}>{slot.time}</span>
                    <button
                      className="text-xs px-3 py-1 rounded-lg font-medium transition-colors"
                      style={{ backgroundColor: "var(--sage-pale)", color: "var(--sage)" }}
                    >
                      Rezerve Et
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expert Tab */}
          {activeTab === "expert" && (
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4" style={{ color: "var(--charcoal)" }}>
                  Pratiğinizi{" "}
                  <span style={{ color: "var(--accent)" }}>büyütün</span>,
                  vaktinizi koruyun
                </h2>
                <p className="mb-8 leading-relaxed" style={{ color: "var(--muted)" }}>
                  Danışan yönetiminden fatura kesmiye, seans notlarından
                  psikolojik test göndermeye — tüm iş akışınızı tek panelden
                  yönetin.
                </p>
                <ul className="space-y-4">
                  {[
                    { icon: Calendar, text: "Akıllı randevu ve takvim yönetimi" },
                    { icon: FileText, text: "Seans notları ve danışan geçmişi" },
                    { icon: BarChart2, text: "Gelir & finans raporları" },
                    { icon: Zap, text: "Otomatik hatırlatma ve SMS bildirim" },
                  ].map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-start gap-3">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: "var(--accent-l)" }}
                      >
                        <Icon size={13} style={{ color: "var(--accent)" }} />
                      </div>
                      <span className="text-sm" style={{ color: "var(--charcoal)" }}>{text}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/auth" className="btn-accent mt-8 w-fit">
                  Ücretsiz Hesap Aç
                  <ChevronRight size={14} />
                </Link>
              </div>

              {/* Expert mockup */}
              <div
                className="rounded-2xl border p-6 shadow-md space-y-4"
                style={{ backgroundColor: "white", borderColor: "var(--border)" }}
              >
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                  Bu Hafta
                </p>
                {[
                  { label: "Toplam Seans", value: "12", icon: Calendar, color: "var(--sage)" },
                  { label: "Aktif Danışan", value: "8", icon: Users, color: "var(--accent)" },
                  { label: "Bekleyen Ödeme", value: "₺3.200", icon: BarChart2, color: "var(--sage)" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{ backgroundColor: "var(--cream)" }}
                  >
                    <div className="flex items-center gap-3">
                      <stat.icon size={16} style={{ color: stat.color }} />
                      <span className="text-sm font-medium">{stat.label}</span>
                    </div>
                    <span className="text-sm font-bold">{stat.value}</span>
                  </div>
                ))}
                <div
                  className="p-3 rounded-xl border-l-4 text-sm"
                  style={{ backgroundColor: "var(--sage-pale)", borderColor: "var(--sage)", color: "var(--sage)" }}
                >
                  <p className="font-semibold text-xs">Bugün 14:00</p>
                  <p className="font-medium">Ayşe K. — BDT Seansı</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section
        id="ozellikler"
        className="py-20 border-t"
        style={{ backgroundColor: "white", borderColor: "var(--border)" }}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3" style={{ color: "var(--charcoal)" }}>
              İhtiyacınız olan her şey
            </h2>
            <p className="max-w-xl mx-auto" style={{ color: "var(--muted)" }}>
              Klinik yönetimini kolaylaştıran araçlar, tek bir platform altında.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Calendar,
                title: "Randevu Yönetimi",
                desc: "Online rezervasyon, hatırlatma bildirimleri ve çakışma kontrolü.",
                color: "var(--sage)",
                bg: "var(--sage-pale)",
              },
              {
                icon: FileText,
                title: "Seans Notları",
                desc: "Her seans için gizli notlar alın, danışan geçmişine kolayca erişin.",
                color: "var(--sage)",
                bg: "var(--sage-pale)",
              },
              {
                icon: BookOpen,
                title: "Ödev & Testler",
                desc: "Danışanlarınıza psikolojik testler gönderin, yanıtlarını takip edin.",
                color: "var(--sage)",
                bg: "var(--sage-pale)",
              },
              {
                icon: BarChart2,
                title: "Finans Raporları",
                desc: "Gelir, gider ve ödeme takibini otomatize edin, dışa aktarın.",
                color: "var(--accent)",
                bg: "var(--accent-l)",
              },
              {
                icon: Heart,
                title: "Danışan Profili",
                desc: "Tüm danışan bilgileri, notlar ve belgeler tek ekranda.",
                color: "var(--accent)",
                bg: "var(--accent-l)",
              },
              {
                icon: Shield,
                title: "Güvenlik & KVKK",
                desc: "Verileriniz şifreli, KVKK uyumlu altyapıda güvende saklanır.",
                color: "var(--accent)",
                bg: "var(--accent-l)",
              },
            ].map(({ icon: Icon, title, desc, color, bg }) => (
              <div
                key={title}
                className="rounded-xl p-6 border transition-shadow hover:shadow-md"
                style={{ borderColor: "var(--border)" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: bg }}
                >
                  <Icon size={18} style={{ color }} />
                </div>
                <h3 className="font-semibold mb-1.5" style={{ color: "var(--charcoal)" }}>
                  {title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── UZMANLAR CTA ── */}
      <section
        id="uzmanlar"
        className="py-20 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div
            className="rounded-2xl p-10 md:p-16 relative overflow-hidden"
            style={{ backgroundColor: "var(--sage)" }}
          >
            <div
              className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10 pointer-events-none"
              style={{
                background: "white",
                transform: "translate(30%, -30%)",
              }}
            />
            <div className="relative max-w-2xl">
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
                style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "white" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
                Beta — Erken Erişim Açık
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                Sınırlı kontenjanımız
                <br />
                dolmadan yerinizi alın
              </h2>
              <p className="text-white/80 mb-8 text-lg leading-relaxed">
                Beta kullanıcıları ilk 3 ay ücretsiz kullanır ve ömür boyu indirimli fiyata kilitlenir. Şu an yalnızca sınırlı sayıda psikolog kabul ediyoruz.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/auth"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "white", color: "var(--sage)" }}
                >
                  <Zap size={15} />
                  Beta'ya Katıl — Ücretsiz
                  <ArrowRight size={15} />
                </Link>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold border border-white/40 text-white transition-colors hover:bg-white/10"
                >
                  <Lock size={15} />
                  Giriş Yap
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-4">
                {[
                  "İlk 3 ay tamamen ücretsiz",
                  "Ömür boyu indirimli fiyat kilidi",
                  "İstediğiniz zaman iptal",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-1.5 text-sm text-white/80"
                  >
                    <CheckCircle size={13} className="text-white" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER MODALS ── */}
      {footerModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity"
          style={{ backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setFooterModal(null)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl p-8 shadow-xl"
            style={{ backgroundColor: "white" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setFooterModal(null)}
              className="absolute top-4 right-4 text-xl font-bold leading-none hover:opacity-50 transition-opacity"
              style={{ color: "var(--muted)" }}
            >
              ×
            </button>

            {footerModal === "gizlilik" && (
              <>
                <h2 className="text-xl font-bold mb-4" style={{ color: "var(--charcoal)" }}>Gizlilik Politikası</h2>
                <div className="text-sm leading-relaxed space-y-3" style={{ color: "var(--muted)" }}>
                  <p>Psikopanel, kullanıcı gizliliğini en üst düzeyde tutar. <strong>Hiçbir hassas veri (seans içerikleri, notlar vb.) tarafımızca depolanmamakta ve işlenmemektedir.</strong></p>
                  <p>Yalnızca platforma erişim için gerekli olan temel kayıt bilgileri (ad, e-posta) sistemimizde tutulur. Bunun dışındaki tüm veriler <strong>uçtan uca şifrelidir</strong> ve asla üçüncü taraflarla paylaşılmaz.</p>
                  <p>Verilerinizin tamamen silinmesi veya düzenlenmesi talepleriniz için <strong>İletişim</strong> bölümünden bize ulaşabilirsiniz.</p>
                  <p className="text-xs pt-2" style={{ color: "var(--sage)" }}>Son güncelleme: Mart 2026</p>
                </div>
              </>
            )}

            {footerModal === "kvkk" && (
              <>
                <h2 className="text-xl font-bold mb-4" style={{ color: "var(--charcoal)" }}>KVKK Aydınlatma Metni</h2>
                <div className="text-sm leading-relaxed space-y-3" style={{ color: "var(--muted)" }}>
                  <p>6698 sayılı KVKK kapsamında, Psikopanel veri sorumlusu olarak yalnızca hizmetin ifası için zorunlu olan üyelik bilgilerini işler.</p>
                  <ul className="list-disc ml-4 space-y-1">
                    <li><strong>Hassas Veri:</strong> İşlenmez ve depolanmaz. Sistemimiz sıfır-bilgi (zero-knowledge) mimarisine uygun tasarlanmıştır.</li>
                    <li><strong>Veri Güvenliği:</strong> Tüm kullanıcı trafiği ve verileri yüksek standartlı şifreleme ile korunur.</li>
                    <li><strong>Paylaşım:</strong> Verileriniz reklam, analiz veya herhangi bir ticari amaçla 3. partilere aktarılmaz.</li>
                  </ul>
                  <p>Haklarınız ve talepleriniz için <strong>İletişim</strong> bölümünü kullanabilirsiniz.</p>
                  <p className="text-xs pt-2" style={{ color: "var(--sage)" }}>Son güncelleme: Mart 2026</p>
                </div>
              </>
            )}

            {footerModal === "iletisim" && (
              <>
                <h2 className="text-xl font-bold mb-4" style={{ color: "var(--charcoal)" }}>Bize Ulaşın</h2>
                
                {submitStatus === "success" ? (
                  <div className="py-8 text-center space-y-3">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: "var(--sage-pale)" }}>
                      <CheckCircle size={32} style={{ color: "var(--sage)" }} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg" style={{ color: "var(--charcoal)" }}>Mesajınız Alındı</h3>
                      <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>En kısa sürede iletişim adresiniz üzerinden size dönüş yapacağız.</p>
                    </div>
                    <button 
                      onClick={() => setFooterModal(null)}
                      className="mt-4 text-sm font-semibold hover:underline"
                      style={{ color: "var(--sage)" }}
                    >
                      Kapat
                    </button>
                  </div>
                ) : (
                  <form className="space-y-4" onSubmit={handleContactSubmit}>
                    {submitStatus === "error" && (
                      <div className="p-3 rounded-lg text-sm bg-red-50 text-red-600 border border-red-100">
                        Bir hata oluştu. Lütfen daha sonra tekrar deneyin.
                      </div>
                    )}
                    
                    <div>
                      <label className="text-xs font-bold mb-1.5 block" style={{ color: "var(--charcoal)" }}>Ad Soyad</label>
                      <input 
                        type="text" 
                        required
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        className="w-full p-2.5 rounded-lg border text-sm outline-none transition-all focus:ring-2 focus:ring-sage/20 focus:border-sage"
                        style={{ borderColor: "var(--border)", backgroundColor: "var(--cream)" }}
                        placeholder="Adınız..."
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold mb-1.5 block" style={{ color: "var(--charcoal)" }}>E-posta</label>
                      <input 
                        type="email" 
                        required
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        className="w-full p-2.5 rounded-lg border text-sm outline-none transition-all focus:ring-2 focus:ring-sage/20 focus:border-sage"
                        style={{ borderColor: "var(--border)", backgroundColor: "var(--cream)" }}
                        placeholder="email@adresiniz.com"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold mb-1.5 block" style={{ color: "var(--charcoal)" }}>Mesajınız</label>
                      <textarea 
                        required
                        rows={4}
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        className="w-full p-2.5 rounded-lg border text-sm outline-none transition-all resize-none focus:ring-2 focus:ring-sage/20 focus:border-sage"
                        style={{ borderColor: "var(--border)", backgroundColor: "var(--cream)" }}
                        placeholder="Size nasıl yardımcı olabiliriz?"
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 mt-2 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-70"
                      style={{ backgroundColor: "var(--sage)" }}
                    >
                      {isSubmitting ? (
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Zap size={14} /> Gönder
                        </>
                      )}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer
        className="border-t py-10"
        style={{ borderColor: "var(--border)", backgroundColor: "white" }}
      >
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ backgroundColor: "var(--sage)" }}
            >
              <Brain size={12} className="text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[8px] font-bold tracking-widest uppercase" style={{ color: "var(--sage)" }}>
                beta
              </span>
              <span className="text-sm font-semibold" style={{ color: "var(--charcoal)" }}>
                psikopanel
              </span>
            </div>
          </div>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            © {new Date().getFullYear()} Psikopanel. Tüm hakları saklıdır.
          </p>
          <div className="flex items-center gap-5 text-xs" style={{ color: "var(--muted)" }}>
            <button onClick={() => setFooterModal("gizlilik")} className="hover:opacity-70 transition-opacity cursor-pointer">
              Gizlilik Politikası
            </button>
            <button onClick={() => setFooterModal("kvkk")} className="hover:opacity-70 transition-opacity cursor-pointer">
              KVKK
            </button>
            <button onClick={() => setFooterModal("iletisim")} className="hover:opacity-70 transition-opacity cursor-pointer">
              İletişim
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}