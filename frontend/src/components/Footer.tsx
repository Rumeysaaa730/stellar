import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-bg-border bg-bg-secondary mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center">
                <span className="text-white text-sm">⛓</span>
              </div>
              <span className="font-bold text-white text-lg">FreelanceChain</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              Stellar blockchain ile güvenli escrow ödemeleri. Müşteriler ve freelancerlar için güvenilir platform.
            </p>
            <div className="inline-flex items-center gap-2 bg-bg-elevated border border-bg-border rounded-lg px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-brand-secondary animate-pulse" />
              <span className="text-xs text-gray-400">Stellar Blockchain ile güçlendirilmiştir</span>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Platform</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Nasıl Çalışır', to: '/#how' },
                { label: 'Güvenlik', to: '/#security' },
                { label: 'Komisyon', to: '/#fees' },
                { label: 'SSS', to: '/#faq' },
                { label: 'İletişim', to: '/#contact' },
              ].map(item => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social & Support */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Topluluk</h4>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                  </svg>
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  Twitter
                </a>
              </li>
              <li>
                <a
                  href="mailto:destek@freelancechain.io"
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                  </svg>
                  Destek
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-bg-border mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} FreelanceChain. Tüm hakları saklıdır.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current text-brand-secondary">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l5 2.18V11c0 3.5-2.33 6.79-5 7.93C9.33 17.79 7 14.5 7 11V7.18L12 5z"/>
            </svg>
            Stellar Testnet üzerinde çalışmaktadır
          </div>
        </div>
      </div>
    </footer>
  );
}
