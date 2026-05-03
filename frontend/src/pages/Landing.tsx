import React from 'react';
import { Link } from 'react-router-dom';

const STEPS = [
  {
    num: '01', icon: '📋', title: 'İş Oluştur',
    desc: 'Müşteri iş ilanını ve bütçeyi belirler. Escrow hesabı otomatik açılır.',
    gradient: 'from-brand-primary/20 to-brand-primary/5',
    border: 'border-brand-primary/30',
  },
  {
    num: '02', icon: '🔒', title: 'XLM\'yi Kilitle',
    desc: 'Freighter cüzdanınızla XLM\'yi güvenli escrow hesabına yatırın.',
    gradient: 'from-stellar-cyan/20 to-stellar-cyan/5',
    border: 'border-stellar-cyan/30',
  },
  {
    num: '03', icon: '✅', title: 'Teslim Et & Öde',
    desc: 'İş tamamlanınca müşteri onaylar, XLM freelancer\'a otomatik aktarılır.',
    gradient: 'from-status-success/20 to-status-success/5',
    border: 'border-status-success/30',
  },
];

const FEATURES = [
  {
    icon: '🔒',
    title: 'Güvenli Escrow',
    desc: 'Stellar blockchain korumalı akıllı kontrat. Ödemeniz iş tamamlanana kadar bloke edilir.',
  },
  {
    icon: '⚡',
    title: 'Anında İşlem',
    desc: 'XLM transferleri 3-5 saniyede tamamlanır. Bekleme yok, gecikme yok.',
  },
  {
    icon: '💰',
    title: 'Düşük Komisyon',
    desc: 'Sadece %1 platform ücreti. Geleneksel platformların 5-20%\'ine kıyasla çok avantajlı.',
  },
  {
    icon: '⚖️',
    title: 'İtiraz Sistemi',
    desc: 'Anlaşmazlıklarda admin hakemliği. Haksız ödeme almak ya da vermek zorunda değilsiniz.',
  },
];

const STATS = [
  { value: '1,240+', label: 'Aktif Kullanıcı', icon: '👥' },
  { value: '3,890+', label: 'Tamamlanan İş', icon: '✅' },
  { value: '284K+', label: 'XLM İşlem Hacmi', icon: '💎' },
  { value: '99.2%', label: 'Başarılı Escrow', icon: '⛓️' },
];

const TESTIMONIALS = [
  {
    avatar: 'A', name: 'Ahmet Y.', role: 'Müşteri · Logo Tasarımı',
    rating: 5,
    text: 'Freelancer ile yaşadığımız anlaşmazlıkta admin devreye girdi ve XLM\'mi korudu. Sisteme güven tam!',
    gradient: 'from-brand-primary to-brand-accent',
  },
  {
    avatar: 'Z', name: 'Zeynep K.', role: 'Freelancer · Web Geliştirici',
    rating: 5,
    text: 'İşi teslim edince XLM anında hesabıma geçti. Artık ödeme almak için endişelenmiyorum.',
    gradient: 'from-stellar-cyan to-brand-secondary',
  },
  {
    avatar: 'M', name: 'Mert Ö.', role: 'Müşteri · Mobil Uygulama',
    rating: 5,
    text: 'Geleneksel platformlara göre komisyon çok düşük. Üstüne bir de blockchain güvencesi var.',
    gradient: 'from-brand-accent to-brand-primary',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-bg-primary text-white overflow-hidden">

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-24 px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-brand-primary/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/5 w-80 h-80 bg-stellar-cyan/5 rounded-full blur-3xl" />
          <div className="absolute top-1/3 right-1/5 w-64 h-64 bg-brand-accent/5 rounded-full blur-2xl" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-bg-elevated border border-brand-primary/30 rounded-full px-5 py-2 text-sm text-brand-secondary mb-8">
            <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
            Stellar Blockchain · Freighter Wallet · XLM Escrow
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Blockchain ile güvenli
            </span>
            <br />
            <span className="bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent bg-clip-text text-transparent">
              freelance çalışma
            </span>
          </h1>

          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            XLM ile anında ödeme, akıllı escrow koruması ve şeffaf iş süreci.
            <br className="hidden sm:block" />
            İş tamamlanana kadar paranız güvende kalır.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Link
              to="/register"
              className="w-full sm:w-auto bg-gradient-to-r from-brand-primary to-brand-accent hover:opacity-90 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-glow"
            >
              Hemen Başla →
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto bg-bg-elevated hover:bg-bg-card border border-bg-border text-gray-300 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all"
            >
              Giriş Yap
            </Link>
          </div>

          {/* Demo credentials */}
          <div className="inline-flex flex-col sm:flex-row items-center gap-3 bg-bg-elevated/60 border border-bg-border rounded-2xl px-5 py-3 text-xs text-gray-400">
            <span className="font-semibold text-gray-300">🔑 Demo hesaplar:</span>
            <code className="text-brand-secondary">musteri@demo.com</code>
            <span className="hidden sm:block text-gray-600">·</span>
            <code className="text-brand-secondary">freelancer@demo.com</code>
            <span className="hidden sm:block text-gray-600">·</span>
            <code className="text-gray-500">şifre: demo123</code>
          </div>
        </div>
      </section>

      {/* ── NASIL ÇALIŞIR? ── */}
      <section className="py-20 px-4 bg-bg-secondary/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-sm font-mono text-brand-secondary mb-3 tracking-widest">// HOW IT WORKS</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Nasıl Çalışır?</h2>
            <p className="text-gray-400 mt-3">3 basit adımda güvenli ödeme</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 relative">
            {/* connector line */}
            <div className="hidden sm:block absolute top-14 left-[38%] right-[38%] h-0.5 bg-gradient-to-r from-brand-primary/40 via-stellar-cyan/40 to-status-success/40" />

            {STEPS.map((step, i) => (
              <div
                key={i}
                className={`relative bg-gradient-to-br ${step.gradient} border ${step.border} rounded-2xl p-7 flex flex-col items-center text-center hover:scale-[1.02] transition-transform`}
              >
                <div className={`w-14 h-14 rounded-2xl border ${step.border} bg-bg-elevated flex items-center justify-center text-2xl mb-5 shadow-card z-10`}>
                  {step.icon}
                </div>
                <div className="font-mono text-xs text-gray-500 mb-1">{step.num}</div>
                <h3 className="text-white font-bold text-lg mb-3">{step.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ÖZELLİKLER ── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-sm font-mono text-brand-secondary mb-3 tracking-widest">// FEATURES</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Neden FreelanceChain?</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="bg-bg-card border border-bg-border rounded-2xl p-6 hover:border-brand-primary/40 hover:shadow-glow-sm transition-all group"
              >
                <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">{f.icon}</div>
                <h3 className="text-white font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── İSTATİSTİKLER ── */}
      <section className="py-16 px-4 border-y border-bg-border bg-bg-secondary/50">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {STATS.map((s, i) => (
            <div key={i}>
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className="text-3xl font-black text-white mb-1">{s.value}</div>
              <div className="text-sm text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── KULLANICI YORUMLARI ── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-sm font-mono text-brand-secondary mb-3 tracking-widest">// TESTIMONIALS</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Kullanıcılarımız Ne Diyor?</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className="bg-bg-card border border-bg-border rounded-2xl p-6 flex flex-col gap-4 hover:border-brand-primary/30 transition-all"
              >
                {/* Stars */}
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <span key={j} className={j < t.rating ? 'text-status-warning' : 'text-gray-600'}>★</span>
                  ))}
                </div>
                {/* Quote */}
                <p className="text-sm text-gray-300 leading-relaxed flex-1">
                  "{t.text}"
                </p>
                {/* Author */}
                <div className="flex items-center gap-3 pt-3 border-t border-bg-border">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-4 pb-28">
        <div className="max-w-2xl mx-auto text-center">
          <div className="relative bg-gradient-to-br from-brand-primary/20 via-bg-elevated to-brand-accent/10 border border-brand-primary/30 rounded-3xl p-10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-5xl mb-5">🚀</div>
              <h2 className="text-3xl font-bold text-white mb-4">Hemen Başla</h2>
              <p className="text-gray-400 mb-8 leading-relaxed">
                Ücretsiz kayıt ol, Stellar Testnet'te dene.
                <br />
                Gerçek XLM gerektirmez — tamamen güvenli.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/register"
                  className="w-full sm:w-auto bg-gradient-to-r from-brand-primary to-brand-accent hover:opacity-90 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-glow"
                >
                  Ücretsiz Kayıt Ol 🚀
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto bg-bg-elevated hover:bg-bg-card border border-bg-border text-gray-300 hover:text-white px-8 py-4 rounded-xl font-semibold transition-all"
                >
                  Giriş Yap
                </Link>
              </div>
              <div className="mt-6 flex items-center justify-center gap-5 text-xs text-gray-500">
                <span>✓ Ücretsiz kayıt</span>
                <span>✓ Testnet XLM</span>
                <span>✓ Anında başla</span>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
