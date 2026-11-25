import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Award } from 'lucide-react';

const CERT_CARDS = [
  {
    code: 'CERT 01',
    title: 'Software Testing',
    issuer: 'NPTEL — IIT Bangalore',
    detail: 'Verified mastery of software test design, SDLC quality assurance, and defect verification.',
  },
  {
    code: 'CERT 02',
    title: 'Multi-Track Virtual Internship',
    issuer: 'VTU Centre for Online Education',
    detail: 'Elite Gold Certification (12 Credits) in Python, Cybersecurity, React.js & Full Stack Development.',
  },
  {
    code: 'CERT 03',
    title: 'Python & Data Analytics Internship',
    issuer: 'Dyashin Technosoft Pvt. Ltd., Bengaluru',
    detail: 'Completed live industry analytics track covering Pandas preprocessing, EDA, and visual reporting.',
  },
  {
    code: 'DEGREE 04',
    title: 'B.E. Information Science & Engineering',
    issuer: 'JNNCE, Shivamogga (2023 – 2026)',
    detail: 'Undergraduate engineering degree with CGPA 7.56 focused on software, data, and ML.',
  },
  {
    code: 'DIPLOMA 05',
    title: 'Diploma in Information Science',
    issuer: 'D.S. Dinakar National Polytechnic (2022)',
    detail: 'Foundational CS, DBMS, networking, and structured programming.',
  },
];

export default function CertificationsCarousel() {
  const [activeIdx, setActiveIdx] = useState(1);

  const prev = () => setActiveIdx((i) => (i - 1 + CERT_CARDS.length) % CERT_CARDS.length);
  const next = () => setActiveIdx((i) => (i + 1) % CERT_CARDS.length);

  return (
    <section className="relative z-10 py-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 text-center mb-14">
        <div className="font-mono-tech text-[11px] uppercase tracking-[0.26em] text-[#F5E6C8]/80 mb-2">
          Chapter VII — Credentials
        </div>
        <h2 className="font-editorial text-4xl sm:text-6xl font-semibold text-white">
          Certifications
        </h2>
      </div>

      {/* Subtle connecting constellation line */}
      <div className="relative max-w-6xl mx-auto px-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-[#F5E6C8]/30 to-transparent"
        />

        <div className="relative h-[320px] flex items-center justify-center" style={{ perspective: '1200px' }}>
          {CERT_CARDS.map((card, idx) => {
            let offset = idx - activeIdx;
            if (offset > Math.floor(CERT_CARDS.length / 2)) offset -= CERT_CARDS.length;
            if (offset < -Math.floor(CERT_CARDS.length / 2)) offset += CERT_CARDS.length;

            const isCenter = offset === 0;
            const visible = Math.abs(offset) <= 2;
            if (!visible) return null;

            const translateX = offset * 240;
            const translateZ = -Math.abs(offset) * 120;
            const rotateY = -offset * 18;
            const opacity = isCenter ? 1 : Math.abs(offset) === 1 ? 0.65 : 0.3;

            return (
              <div
                key={card.code}
                onClick={() => setActiveIdx(idx)}
                style={{
                  transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg)`,
                  opacity,
                  zIndex: 20 - Math.abs(offset),
                  transition: 'all 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
                className={`absolute w-[290px] sm:w-[340px] rounded-2xl p-6 cursor-pointer border backdrop-blur-xl ${
                  isCenter
                    ? 'bg-[#0c0c12]/90 border-[#F5E6C8]/60 shadow-[0_0_50px_rgba(245,230,200,0.18)]'
                    : 'bg-[#08080c]/80 border-white/10 hover:border-[#F5E6C8]/35'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono-tech text-[10px] uppercase tracking-[0.22em] text-[#F5E6C8]">
                    {card.code}
                  </span>
                  <Award size={16} className={isCenter ? 'text-[#F5E6C8]' : 'text-white/40'} />
                </div>
                <h3 className="font-editorial text-2xl font-semibold text-white mb-1.5">
                  {card.title}
                </h3>
                <div className="font-mono-tech text-[11px] text-[#F5E6C8]/80 mb-3">
                  {card.issuer}
                </div>
                <p className="text-xs text-white/65 leading-relaxed">{card.detail}</p>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={prev}
            aria-label="Previous certificate"
            className="w-10 h-10 rounded-full obsidian-glass flex items-center justify-center text-[#F5E6C8] cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="font-mono-tech text-xs text-white/60">
            0{activeIdx + 1} / 0{CERT_CARDS.length}
          </span>
          <button
            onClick={next}
            aria-label="Next certificate"
            className="w-10 h-10 rounded-full obsidian-glass flex items-center justify-center text-[#F5E6C8] cursor-pointer"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
