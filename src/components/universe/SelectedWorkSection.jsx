import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Activity, Database, Cpu } from 'lucide-react';

function ShowcaseTiltMockup({ children }) {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ rx: -py * 12, ry: px * 14 });
  };

  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={() => setTilt({ rx: 0, ry: 0 })}
      animate={{ rotateX: tilt.rx, rotateY: tilt.ry }}
      transition={{ type: 'spring', stiffness: 190, damping: 20 }}
      style={{ transformPerspective: 1100, transformStyle: 'preserve-3d' }}
      className="obsidian-glass rounded-3xl p-6 sm:p-8 shadow-[0_30px_80px_rgba(0,0,0,0.65)]"
    >
      {children}
    </motion.div>
  );
}

const HEATMAP_CELLS = [
  0.35, 0.72, 0.9, 0.48, 0.85, 0.62, 0.95,
  0.55, 0.88, 0.4, 0.92, 0.7, 0.81, 0.64,
  0.78, 0.45, 0.84, 0.66, 0.91, 0.5, 0.87,
];

const SHOWCASE_PROJECTS = [
  {
    index: '01 / 03',
    title: 'Diabetes Mellitus Prediction Engine',
    desc: 'Multi-model supervised ML pipeline uniting Random Forest, ANN, and LSTM inside a Weighted Voting Ensemble — hitting 83% accuracy with ROC-AUC validation.',
    tech: ['Python', 'scikit-learn', 'TensorFlow/Keras', 'Random Forest', 'ANN', 'LSTM'],
    visual: 'gauge',
  },
  {
    index: '02 / 03',
    title: 'Library Management System',
    desc: 'Structured full-stack catalog and circulation platform powering book search, member registration, issue/return state transitions, and MySQL persistence.',
    tech: ['HTML5', 'CSS3', 'JavaScript', 'MySQL', 'DBMS', 'SDLC'],
    visual: 'heatmap',
  },
  {
    index: '03 / 03',
    title: 'Dyashin Analytics & CareerPulse AI',
    desc: 'Production data cleaning/EDA pipelines from Dyashin Technosoft paired with a Neon PostgreSQL + Gemini AI career command center deployed on Vercel.',
    tech: ['Python', 'Pandas', 'React.js', 'Gemini AI', 'Neon PostgreSQL', 'Tailwind CSS'],
    visual: 'telemetry',
  },
];

export default function SelectedWorkSection({ githubUrl }) {
  return (
    <section id="work" className="relative z-10 py-20">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 mb-12 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono-tech text-[11px] uppercase tracking-[0.26em] text-[#F5E6C8]/80 mb-2">
            Chapter III — Selected Work
          </div>
          <h2 className="font-editorial text-4xl sm:text-6xl font-semibold tracking-tight text-white">
            Spotlight Showcase
          </h2>
        </div>
        <a
          href={githubUrl}
          target="_blank"
          rel="noreferrer"
          className="obsidian-glass px-5 py-2.5 rounded-full font-mono-tech text-xs uppercase tracking-[0.16em] text-[#F5E6C8] inline-flex items-center gap-2"
        >
          View Source on GitHub <ArrowUpRight size={14} />
        </a>
      </div>

      <div className="space-y-24">
        {SHOWCASE_PROJECTS.map((proj, idx) => {
          const reversed = idx % 2 === 1;
          return (
            <div
              key={proj.index}
              className="min-h-[76vh] flex items-center max-w-7xl mx-auto px-6 sm:px-10"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
                {/* Mockup Card */}
                <div className={`lg:col-span-6 ${reversed ? 'lg:order-2' : 'lg:order-1'}`}>
                  <ShowcaseTiltMockup>
                    {proj.visual === 'gauge' && (
                      <div className="space-y-5">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                          <span className="font-mono-tech text-[11px] uppercase tracking-[0.18em] text-[#F5E6C8] flex items-center gap-2">
                            <Activity size={14} /> Ensemble ROC-AUC Telemetry
                          </span>
                          <span className="font-mono-tech text-[11px] text-emerald-300">
                            ACTIVE BENCHMARK
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-6">
                          <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                              <circle
                                cx="60"
                                cy="60"
                                r="50"
                                fill="none"
                                stroke="rgba(255,255,255,0.08)"
                                strokeWidth="8"
                              />
                              <circle
                                cx="60"
                                cy="60"
                                r="50"
                                fill="none"
                                stroke="#F5E6C8"
                                strokeWidth="8"
                                strokeDasharray="314"
                                strokeDashoffset={314 * (1 - 0.83)}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute text-center">
                              <div className="font-editorial text-3xl font-semibold text-[#F5E6C8]">
                                83%
                              </div>
                              <div className="font-mono-tech text-[9px] uppercase tracking-widest text-white/60">
                                Accuracy
                              </div>
                            </div>
                          </div>

                          <div className="flex-1 space-y-2.5 text-xs font-mono-tech">
                            {[
                              { name: 'Weighted Voting', pct: 83 },
                              { name: 'ANN Classifier', pct: 80 },
                              { name: 'Random Forest', pct: 79 },
                              { name: 'LSTM Network', pct: 78 },
                            ].map((m) => (
                              <div key={m.name}>
                                <div className="flex justify-between text-white/80 mb-1">
                                  <span>{m.name}</span>
                                  <span className="text-[#F5E6C8]">{m.pct}%</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-[#F5E6C8]/60 to-[#F5E6C8]"
                                    style={{ width: `${m.pct}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {proj.visual === 'heatmap' && (
                      <div className="space-y-5">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                          <span className="font-mono-tech text-[11px] uppercase tracking-[0.18em] text-[#F5E6C8] flex items-center gap-2">
                            <Database size={14} /> MySQL Circulation Heatmap
                          </span>
                          <span className="font-mono-tech text-[11px] text-white/60">
                            4 CORE MODULES
                          </span>
                        </div>

                        <div className="grid grid-cols-7 gap-2">
                          {HEATMAP_CELLS.map((v, i) => (
                            <div
                              key={i}
                              className="aspect-square rounded-md border border-[#F5E6C8]/15 transition-transform hover:scale-110"
                              style={{
                                backgroundColor: `rgba(245, 230, 200, ${v * 0.55})`,
                              }}
                              title={`Query Activity ${Math.round(v * 100)}%`}
                            />
                          ))}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono-tech text-[10px] text-center">
                          {['Book Search', 'Members', 'Issue Flow', 'Return Log'].map((mod) => (
                            <div
                              key={mod}
                              className="py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white/80"
                            >
                              {mod}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {proj.visual === 'telemetry' && (
                      <div className="space-y-5">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                          <span className="font-mono-tech text-[11px] uppercase tracking-[0.18em] text-[#F5E6C8] flex items-center gap-2">
                            <Cpu size={14} /> Pipeline &amp; Cloud Sync
                          </span>
                          <span className="font-mono-tech text-[11px] text-emerald-300">
                            VERCEL • NEON DB
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3 font-mono-tech text-xs">
                          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                            <div className="text-[10px] text-white/50">STAGE 01</div>
                            <div className="text-[#F5E6C8] mt-1">Pandas EDA</div>
                          </div>
                          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                            <div className="text-[10px] text-white/50">STAGE 02</div>
                            <div className="text-[#F5E6C8] mt-1">Gemini AI</div>
                          </div>
                          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                            <div className="text-[10px] text-white/50">STAGE 03</div>
                            <div className="text-[#F5E6C8] mt-1">Neon Postgres</div>
                          </div>
                        </div>

                        <div className="flex items-end gap-2 h-20 pt-2">
                          {[38, 62, 54, 84, 72, 95, 88, 76, 92].map((h, i) => (
                            <div
                              key={i}
                              className="flex-1 rounded-t bg-gradient-to-t from-[#F5E6C8]/20 to-[#F5E6C8]/85"
                              style={{ height: `${h}%` }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </ShowcaseTiltMockup>
                </div>

                {/* Editorial Text Column */}
                <div className={`lg:col-span-6 space-y-5 ${reversed ? 'lg:order-1' : 'lg:order-2'}`}>
                  <div className="font-mono-tech text-xs uppercase tracking-[0.24em] text-[#F5E6C8]">
                    {proj.index}
                  </div>
                  <h3 className="font-editorial text-3xl sm:text-5xl font-semibold text-white leading-tight">
                    {proj.title}
                  </h3>
                  <p className="text-base text-white/70 leading-relaxed max-w-xl">{proj.desc}</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {proj.tech.map((t) => (
                      <span
                        key={t}
                        className="px-3 py-1 rounded-full border border-[#F5E6C8]/25 bg-white/[0.02] font-mono-tech text-[11px] text-[#F5E6C8]/90"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
