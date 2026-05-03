import React from 'react';
import { Link } from 'react-router-dom';

const clientSteps = [
  {
    number: '1',
    title: 'İş Oluştur + Escrow',
    description:
      'Projenizi tanımlayın, bütçenizi belirleyin. Stellar ağı üzerinde otomatik bir escrow hesabı açılır ve ödeme güvence altına alınır.',
  },
  {
    number: '2',
    title: 'Freelancer Seç',
    description:
      'Başvuran freelancerların profillerini ve tekliflerini inceleyin. Size en uygun adayı seçin ve iş başlasın.',
  },
  {
    number: '3',
    title: 'Onayla → Para Serbest',
    description:
      "Teslim edilen işi inceleyin ve onaylayın. Onayınızla birlikte escrow'daki ödeme anında freelancer'a aktarılır.",
  },
];

const freelancerSteps = [
  {
    number: '1',
    title: 'Tekliflere Bak',
    description:
      'Platforma kayıt olun ve size uygun projeleri filtreleyin. Bütçe, kategori ve son tarih bilgileriyle ilanları kolayca karşılaştırın.',
  },
  {
    number: '2',
    title: 'Başvur + Çalış',
    description:
      'İlgilendiğiniz işe teklif gönderin. İşveren sizi seçtikten sonra projeye başlayın, sorularınızı platforma not edin.',
  },
  {
    number: '3',
    title: 'Teslim Et → Kazanç',
    description:
      'Tamamladığınız işi teslim edin. İşveren onayladığı anda Stellar escrow ödemeniz cüzdanınıza aktarılır.',
  },
];

interface StepCardProps {
  number: string;
  title: string;
  description: string;
  accent: 'primary' | 'secondary';
}

function StepCard({ number, title, description, accent }: StepCardProps) {
  const accentClass =
    accent === 'primary'
      ? 'from-brand-primary to-brand-secondary'
      : 'from-brand-secondary to-brand-accent';

  return (
    <div className="bg-bg-card border border-bg-border rounded-2xl p-6 flex gap-4">
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${accentClass} flex items-center justify-center text-white font-bold text-sm`}
      >
        {number}
      </div>
      <div>
        <h3 className="text-text-primary font-semibold mb-1">{title}</h3>
        <p className="text-text-secondary text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-bg-primary pt-16">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-8"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
          Ana Sayfaya Dön
        </Link>

        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">
            Nasıl Çalışır?
          </h1>
          <p className="text-text-secondary max-w-xl mx-auto">
            FreelanceChain, Stellar blokzinciri üzerinde güvenli escrow ile işverenler ve
            freelancerları bir araya getirir. Adımlar basit, ödemeler güvenli.
          </p>
        </div>

        {/* Two-column steps */}
        <div className="grid lg:grid-cols-2 gap-8 mb-14">
          {/* Client column */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-current">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-text-primary">İşverenler için</h2>
            </div>
            <div className="flex flex-col gap-4">
              {clientSteps.map(step => (
                <StepCard key={step.number} {...step} accent="primary" />
              ))}
            </div>
          </div>

          {/* Freelancer column */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-secondary to-brand-accent flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-current">
                  <path d="M20 6h-2.18c.07-.44.18-.86.18-1.3C18 2.57 15.43 1 13 1c-1.4 0-2.71.56-3.65 1.55L8 4H5C3.34 4 2 5.34 2 7v11c0 1.66 1.34 3 3 3h15c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.3 0 3 .76 3 2.7 0 .44-.1.86-.27 1.3H9.04l1.63-1.7C11.24 4.42 12.04 3 13 3zm7 16H5c-.55 0-1-.45-1-1V7c0-.55.45-1 1-1h2.5l-1.6 1.67C5.34 8.3 5 9.12 5 10c0 1.65 1.35 3 3 3 .95 0 1.76-.42 2.37-1.06L12 10.27l1.63 1.67C14.24 12.58 15.05 13 16 13c1.65 0 3-1.35 3-3 0-.88-.34-1.7-.9-2.33L16.5 6H20v13z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-text-primary">Freelancerlar için</h2>
            </div>
            <div className="flex flex-col gap-4">
              {freelancerSteps.map(step => (
                <StepCard key={step.number} {...step} accent="secondary" />
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            to="/register"
            className="inline-block bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-semibold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity text-sm"
          >
            Hemen Başla
          </Link>
          <p className="text-text-secondary text-xs mt-3">
            Zaten hesabınız var mı?{' '}
            <Link to="/login" className="text-brand-secondary hover:underline">
              Giriş yapın
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
