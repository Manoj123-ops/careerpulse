import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Heart,
  Users,
  Download,
  Mail,
  ArrowUpRight,
  Lock,
  LayoutDashboard,
  Check,
  Copy,
  UserPlus,
  Sparkles,
  Code2,
  Cpu,
  Database,
  BarChart3,
  ShieldCheck,
  Terminal,
  Layers,
  GitBranch,
  Flame,
  Eye,
  Phone,
  X,
} from 'lucide-react';
import TrailerSceneCanvas from './TrailerSceneCanvas.jsx';
import { DEFAULT_SITE_CONTENT } from '../data/defaultSiteContent.js';
import { downloadCvPdf } from '../utils/cvPdf.js';
import { apiRequest } from '../utils/apiClient.js';

gsap.registerPlugin(ScrollTrigger);

const TOOL_ICONS = [
  Code2,
  Layers,
  Database,
  BarChart3,
  Cpu,
  Sparkles,
  Terminal,
  BarChart3,
  ShieldCheck,
  Code2,
  GitBranch,
  Flame,
];

function mergeSiteContent(cms) {
  const base = DEFAULT_SITE_CONTENT;
  if (!cms || typeof cms !== 'object') return base;
  return {
    brandName: cms.brandName || base.brandName,
    brandMicroText: cms.brandMicroText || base.brandMicroText,
    navBadge: cms.navBadge || base.navBadge,
    hero: { ...base.hero, ...(cms.hero || {}) },
    universe: {
      ...base.universe,
      ...(cms.universe || {}),
      tools: Array.isArray(cms.universe?.tools) && cms.universe.tools.length > 0 ? cms.universe.tools : base.universe.tools,
    },
    journey: {
      ...base.journey,
      ...(cms.journey || {}),
      milestones:
        Array.isArray(cms.journey?.milestones) && cms.journey.milestones.length > 0
          ? cms.journey.milestones
          : base.journey.milestones,
    },
    showcase: {
      ...base.showcase,
      ...(cms.showcase || {}),
      panels:
        Array.isArray(cms.showcase?.panels) && cms.showcase.panels.length > 0
          ? cms.showcase.panels
          : base.showcase.panels,
    },
    poster: { ...base.poster, ...(cms.poster || {}) },
  };
}

function getOrCreateVisitorId() {
  try {
    let id = localStorage.getItem('mk_visitor_id');
    if (!id) {
      id = `vis_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem('mk_visitor_id', id);
    }
    return id;
  } catch {
    return `vis_${Date.now().toString(36)}`;
  }
}

function getDeviceSummary() {
  const ua = navigator.userAgent || '';
  let browser = 'Browser';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Safari/')) browser = 'Safari';

  let os = 'Desktop';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  return `${browser} on ${os} • ${window.innerWidth}×${window.innerHeight}`;
}

export default function PublicPortfolio({
  cv,
  siteContent: rawSiteContent,
  profilePhoto,
  silhouettePhoto,
  editorialPhoto,
  initialEngagement,
  isAdminAuthenticated,
  onOpenAdminLogin,
  onEnterAdminPortal,
}) {
  const content = useMemo(() => mergeSiteContent(rawSiteContent), [rawSiteContent]);

  const scrollRef = useRef(0);
  const pointerRef = useRef({ x: 0, y: 0 });
  const posterSectionRef = useRef(null);
  const journeySectionRef = useRef(null);

  const [scrollPct, setScrollPct] = useState(0);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [portraitReady, setPortraitReady] = useState(false);
  const [nameRevealed, setNameRevealed] = useState(false);
  const [activeMilestoneIdx, setActiveMilestoneIdx] = useState(4); // Highlight 2026 Industry chapter by default
  const [posterWipe, setPosterWipe] = useState(0); // 0 = Full Movie Poster, 100 = Full Editorial Portrait Reveal
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // Visitor & Like state backed by Neon DB
  const [totalVisitors, setTotalVisitors] = useState(initialEngagement?.totalVisitors || 0);
  const [totalLikes, setTotalLikes] = useState(initialEngagement?.totalLikes || 0);
  const [recentVisitors, setRecentVisitors] = useState(initialEngagement?.recentVisitors || []);
  const [viewerLiked, setViewerLiked] = useState(() => {
    try {
      return localStorage.getItem('mk_viewer_liked') === '1';
    } catch {
      return false;
    }
  });
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [checkInForm, setCheckInForm] = useState({ name: '', company: '', role: '' });
  const [likeBurst, setLikeBurst] = useState(false);

  const heroCutoutSrc = profilePhoto || '/portrait-cutout.png';
  const posterPortraitSrc = profilePhoto || '/portrait.jpg';
  const backSilhouetteSrc = silhouettePhoto || '/silhouette-back.png';
  const editorialRevealSrc = editorialPhoto || '/editorial-reveal.jpg';

  const tools = content.universe.tools;
  const leftTools = tools.slice(0, 6);
  const rightTools = tools.slice(6, 12);

  const leftPanels = content.showcase.panels.filter((p) => p.zone === 'left');
  const rightPanels = content.showcase.panels.filter((p) => p.zone === 'right');
  const bottomPanels = content.showcase.panels.filter((p) => p.zone === 'bottom' || (!p.zone && Number(p.num) >= 7));

  useEffect(() => {
    if (initialEngagement) {
      setTotalVisitors(initialEngagement.totalVisitors || 0);
      setTotalLikes(initialEngagement.totalLikes || 0);
      setRecentVisitors(initialEngagement.recentVisitors || []);
    }
  }, [initialEngagement]);

  // Sequence: Portrait fades/scales in first, then giant crimson name slides/reveals behind it
  useEffect(() => {
    const t1 = setTimeout(() => setPortraitReady(true), 120);
    const t2 = setTimeout(() => setNameRevealed(true), 680);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Record visit in Neon DB once per session
  useEffect(() => {
    const visitorId = getOrCreateVisitorId();
    const alreadyLoggedSession = sessionStorage.getItem('mk_visit_logged');
    const action = alreadyLoggedSession ? 'sync' : 'visit';

    apiRequest('/api/public-portfolio', {
      method: 'POST',
      body: {
        visitorId,
        action,
        deviceSummary: getDeviceSummary(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
        browserLang: navigator.language || '',
        referrer: document.referrer || 'Direct',
      },
    })
      .then((res) => {
        if (!alreadyLoggedSession) {
          sessionStorage.setItem('mk_visit_logged', '1');
        }
        if (typeof res.totalVisitors === 'number') setTotalVisitors(res.totalVisitors);
        if (typeof res.totalLikes === 'number') setTotalLikes(res.totalLikes);
        if (Array.isArray(res.recentVisitors)) setRecentVisitors(res.recentVisitors);
        if (typeof res.viewerLiked === 'boolean') {
          setViewerLiked(res.viewerLiked);
          localStorage.setItem('mk_viewer_liked', res.viewerLiked ? '1' : '0');
        }
      })
      .catch(() => {
        // graceful non-blocking fallback
      });
  }, []);

  // Lenis + GSAP ScrollTrigger synchronization
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
      smoothWheel: true,
      wheelMultiplier: 0.95,
    });
    lenis.on('scroll', ScrollTrigger.update);

    const onTick = (time) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    const mainTrigger = ScrollTrigger.create({
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        scrollRef.current = self.progress;
        setScrollPct(Math.round(self.progress * 100));
      },
    });

    const journeyTrigger = journeySectionRef.current
      ? ScrollTrigger.create({
          trigger: journeySectionRef.current,
          start: 'top 65%',
          end: 'bottom 45%',
          onUpdate: (self) => {
            const count = content.journey.milestones.length || 6;
            const idx = Math.min(count - 1, Math.max(0, Math.floor(self.progress * count)));
            setActiveMilestoneIdx(idx);
          },
        })
      : null;

    return () => {
      mainTrigger.kill();
      if (journeyTrigger) journeyTrigger.kill();
      gsap.ticker.remove(onTick);
      lenis.destroy();
    };
  }, [content.journey.milestones.length]);

  const handleMouseMove = (e) => {
    const nx = (e.clientX / window.innerWidth - 0.5) * 2;
    const ny = (e.clientY / window.innerHeight - 0.5) * 2;
    pointerRef.current = { x: nx, y: ny };
    setPointer({ x: nx, y: ny });
  };

  const handleToggleLike = async () => {
    const visitorId = getOrCreateVisitorId();
    const nextLiked = !viewerLiked;
    setViewerLiked(nextLiked);
    setTotalLikes((n) => Math.max(0, n + (nextLiked ? 1 : -1)));
    if (nextLiked) {
      setLikeBurst(true);
      setTimeout(() => setLikeBurst(false), 600);
    }

    try {
      localStorage.setItem('mk_viewer_liked', nextLiked ? '1' : '0');
      const res = await apiRequest('/api/public-portfolio', {
        method: 'POST',
        body: {
          visitorId,
          action: nextLiked ? 'like' : 'unlike',
          deviceSummary: getDeviceSummary(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
        },
      });
      if (typeof res.totalVisitors === 'number') setTotalVisitors(res.totalVisitors);
      if (typeof res.totalLikes === 'number') setTotalLikes(res.totalLikes);
      if (Array.isArray(res.recentVisitors)) setRecentVisitors(res.recentVisitors);
    } catch {
      // keep optimistic UI
    }
  };

  const handleVisitorCheckIn = async (e) => {
    e.preventDefault();
    const visitorId = getOrCreateVisitorId();
    try {
      const res = await apiRequest('/api/public-portfolio', {
        method: 'POST',
        body: {
          visitorId,
          action: 'checkin',
          visitorName: checkInForm.name,
          visitorCompany: checkInForm.company,
          visitorRole: checkInForm.role,
          deviceSummary: getDeviceSummary(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
        },
      });
      if (typeof res.totalVisitors === 'number') setTotalVisitors(res.totalVisitors);
      if (typeof res.totalLikes === 'number') setTotalLikes(res.totalLikes);
      if (Array.isArray(res.recentVisitors)) setRecentVisitors(res.recentVisitors);
      setShowCheckIn(false);
      setCheckInForm({ name: '', company: '', role: '' });
    } catch {
      setShowCheckIn(false);
    }
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const activeBeamLeftPercent =
    content.journey.milestones.length > 1
      ? 6 + (activeMilestoneIdx / (content.journey.milestones.length - 1)) * 76
      : 45;

  return (
    <div className="trailer-root" onMouseMove={handleMouseMove}>
      {/* Fixed 3D WebGL Movie Trailer Scene + Grain + Vignette */}
      <TrailerSceneCanvas scrollRef={scrollRef} pointerRef={pointerRef} />
      <div className="trailer-cinema-grain" aria-hidden="true" />
      <div className="trailer-vignette" aria-hidden="true" />
      <div className="trailer-progress-bar" style={{ width: `${scrollPct}%` }} />

      {/* ═══════════════════════════════════════════════════════════
          STICKY TRANSPARENT GLASS NAVBAR
         ═══════════════════════════════════════════════════════════ */}
      <header className="trailer-nav">
        <button
          onClick={() => scrollToSection('home')}
          className="text-left flex flex-col cursor-pointer bg-transparent border-0 p-0"
        >
          <span className="font-anton text-base sm:text-lg tracking-wider text-white leading-none">
            {content.brandName}
          </span>
          <span className="text-[9px] tracking-[0.28em] uppercase text-white/60 mt-1">
            {content.brandMicroText}
          </span>
        </button>

        <nav className="hidden lg:flex items-center gap-7" aria-label="Primary">
          <button onClick={() => scrollToSection('home')} className="trailer-nav-link">
            HOME
          </button>
          <button onClick={() => scrollToSection('work')} className="trailer-nav-link">
            WORK
          </button>
          <button onClick={() => scrollToSection('about')} className="trailer-nav-link">
            ABOUT
          </button>
          <button onClick={() => scrollToSection('journal')} className="trailer-nav-link">
            JOURNAL
          </button>
          <button onClick={() => scrollToSection('contact')} className="trailer-nav-link">
            CONTACT
          </button>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-[10px] font-semibold tracking-[0.22em] text-white/90">
            <span className="h-1.5 w-1.5 rounded-full bg-[#E50914] shadow-[0_0_8px_#E50914]" />
            {content.navBadge}
          </span>

          <div
            className="hidden md:flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-[11px]"
            title="Live Neon DB Visitors & Likes"
          >
            <span className="inline-flex items-center gap-1 text-white/75">
              <Users size={12} className="text-amber-400" />
              {totalVisitors}
            </span>
            <span className="h-3 w-px bg-white/15" />
            <button
              onClick={handleToggleLike}
              className={`inline-flex items-center gap-1 font-semibold transition cursor-pointer bg-transparent border-0 p-0 ${
                viewerLiked ? 'text-[#FF1E2D]' : 'text-white/80 hover:text-white'
              }`}
              title="Appreciate portfolio"
            >
              <Heart
                size={12}
                className={likeBurst ? 'scale-125 transition-transform' : ''}
                fill={viewerLiked ? '#FF1E2D' : 'none'}
              />
              {totalLikes}
            </button>
          </div>

          {isAdminAuthenticated ? (
            <button
              onClick={onEnterAdminPortal}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#E50914] hover:bg-[#ff1e2d] px-3.5 py-1.5 text-[11px] font-semibold tracking-wider uppercase text-white transition shadow-[0_0_20px_rgba(229,9,20,0.45)] cursor-pointer border-0"
            >
              <LayoutDashboard size={13} /> Admin Portal
            </button>
          ) : (
            <button
              onClick={onOpenAdminLogin}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 hover:border-[#E50914] hover:bg-[#E50914]/15 px-3.5 py-1.5 text-[11px] font-semibold tracking-wider uppercase text-white/90 transition cursor-pointer"
            >
              <Lock size={12} className="text-[#E50914]" /> Admin Login
            </button>
          )}
        </div>
      </header>

      <main className="relative z-10">
        {/* ═══════════════════════════════════════════════════════════
            SECTION 1: HERO ("WELCOME TO MY WORLD")
            Layered Depth: Giant Red Text Behind Cutout Portrait
           ═══════════════════════════════════════════════════════════ */}
        <section
          id="home"
          className="relative min-h-screen w-full flex flex-col justify-between pt-24 pb-10 px-4 sm:px-8 overflow-hidden"
        >
          {/* Ambient radial crimson aura behind cutout */}
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(780px,92vw)] h-[min(780px,92vw)] rounded-full opacity-60"
            style={{
              background:
                'radial-gradient(circle, rgba(229,9,20,0.34) 0%, rgba(168,85,247,0.12) 45%, transparent 72%)',
              filter: 'blur(36px)',
            }}
          />

          {/* Top Tracked Label */}
          <div className="relative z-20 flex flex-col items-center text-center mt-2">
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-[11px] sm:text-xs font-semibold tracking-[0.42em] uppercase text-white/85"
            >
              {content.hero.topLabel}
            </motion.p>
          </div>

          {/* Centerpiece Layered Depth Stage */}
          <div className="relative flex-1 flex items-center justify-center my-2 min-h-[520px] sm:min-h-[600px]">
            {/* Left Floating Pill Tag */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, delay: 0.7 }}
              className="hidden sm:inline-flex items-center rounded-full bg-white text-black px-4 py-1.5 text-[10px] font-bold tracking-[0.22em] uppercase shadow-[0_0_30px_rgba(255,255,255,0.28)] absolute left-2 md:left-8 top-1/2 -translate-y-1/2 z-30"
              style={{
                transform: `translate3d(${pointer.x * -8}px, calc(-50% + ${pointer.y * -6}px), 0)`,
              }}
            >
              {content.hero.leftBadge}
            </motion.div>

            {/* Right Floating Pill Tag */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, delay: 0.7 }}
              className="hidden sm:inline-flex items-center rounded-full bg-white text-black px-4 py-1.5 text-[10px] font-bold tracking-[0.22em] uppercase shadow-[0_0_30px_rgba(255,255,255,0.28)] absolute right-2 md:right-8 top-1/2 -translate-y-1/2 z-30"
              style={{
                transform: `translate3d(${pointer.x * 8}px, calc(-50% + ${pointer.y * 6}px), 0)`,
              }}
            >
              {content.hero.rightBadge}
            </motion.div>

            {/* BACKGROUND LAYER: Giant Bold Red Name (Revealed AFTER portrait fades/scales in) */}
            <motion.div
              initial={{ opacity: 0, y: 42, scale: 0.94 }}
              animate={
                nameRevealed
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { opacity: 0, y: 42, scale: 0.94 }
              }
              transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-x-0 flex items-center justify-center text-center z-10 pointer-events-none px-2"
              style={{
                transform: `translate3d(${pointer.x * -16}px, ${pointer.y * -10}px, 0)`,
              }}
            >
              <h1 className="hero-giant-name text-center">{content.hero.displayName}</h1>
            </motion.div>

            {/* FOREGROUND LAYER: Transparent Cutout Portrait standing IN FRONT of the red text */}
            <motion.div
              initial={{ opacity: 0, scale: 0.91, y: 24 }}
              animate={
                portraitReady
                  ? { opacity: 1, scale: 1, y: 0 }
                  : { opacity: 0, scale: 0.91, y: 24 }
              }
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-20 flex items-end justify-center pointer-events-none"
              style={{
                transform: `translate3d(${pointer.x * 14}px, ${pointer.y * 10}px, 0)`,
              }}
            >
              <img
                src={heroCutoutSrc}
                alt={content.hero.displayName}
                className="hero-cutout-img h-[430px] sm:h-[520px] md:h-[575px] w-auto object-contain select-none"
              />
            </motion.div>
          </div>

          {/* Bottom Role Bar & Trailer Actions */}
          <div className="relative z-30 max-w-6xl mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-4 border-t border-white/10 pt-5">
            <div className="text-center md:text-left">
              <p className="text-xs font-semibold tracking-[0.22em] uppercase text-[#FF8A1E]">
                {content.hero.subtitle}
              </p>
              <p className="text-xs sm:text-sm text-white/70 mt-1 max-w-2xl">
                {content.hero.tagline}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => downloadCvPdf(cv)}
                className="inline-flex items-center gap-2 rounded-full bg-[#E50914] hover:bg-[#ff1e2d] px-5 py-2.5 text-xs font-bold tracking-[0.16em] uppercase text-white transition shadow-[0_0_26px_rgba(229,9,20,0.5)] cursor-pointer border-0"
              >
                <Download size={14} /> Download Resume
              </button>
              <button
                onClick={() => scrollToSection('universe')}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/60 hover:border-amber-400 px-5 py-2.5 text-xs font-semibold tracking-[0.16em] uppercase text-white transition cursor-pointer"
              >
                Watch Trailer ↓
              </button>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 2: "THE CREATIVE UNIVERSE" (Skills & Tools)
            Centered Back-View Silhouette + Purple/Orange Rings + 12 Bevel Cubes
           ═══════════════════════════════════════════════════════════ */}
        <section
          id="universe"
          className="relative py-24 sm:py-32 px-4 sm:px-8 max-w-7xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7 }}
            className="text-center mb-14"
          >
            <p className="text-[11px] font-bold tracking-[0.38em] uppercase text-[#FF8A1E]">
              {content.universe.kicker}
            </p>
            <h2 className="font-cinzel text-3xl sm:text-5xl md:text-6xl font-bold tracking-wider uppercase text-white mt-3">
              {content.universe.title}
            </h2>
            <p className="text-sm text-white/65 max-w-xl mx-auto mt-3">
              {content.universe.subtitle}
            </p>
          </motion.div>

          {/* Desktop Semi-Circular 3D Perspective Stage */}
          <div className="relative grid grid-cols-1 lg:grid-cols-12 items-center gap-6 lg:gap-4 min-h-[540px]">
            {/* Left Arc (6 Bevel-Edged Cubes) */}
            <div className="lg:col-span-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3.5 relative z-20">
              {leftTools.map((tool, i) => {
                const Icon = TOOL_ICONS[i % TOOL_ICONS.length];
                const arcOffset = i === 0 || i === 4 ? 'lg:translate-x-5' : i === 2 ? 'lg:-translate-x-2' : '';
                return (
                  <motion.div
                    key={`${tool.name}-${i}`}
                    initial={{ opacity: 0, x: -24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.1 }}
                    transition={{ duration: 0.5, delay: i * 0.06 }}
                    className={`tool-bevel-cube p-4 flex flex-col justify-between min-h-[104px] ${arcOffset}`}
                    style={{
                      transform: `translate3d(${pointer.x * (-6 - i)}px, ${pointer.y * -5}px, 0)`,
                    }}
                  >
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center border border-white/15"
                      style={{
                        background: `linear-gradient(135deg, ${tool.accent || '#a855f7'}33, rgba(0,0,0,0.8))`,
                        boxShadow: `0 0 18px ${tool.accent || '#a855f7'}44`,
                      }}
                    >
                      <Icon size={16} style={{ color: tool.accent || '#fff' }} />
                    </div>
                    <div className="mt-3">
                      <div className="text-sm font-bold text-white leading-tight">{tool.name}</div>
                      <div className="text-[10px] font-mono-tech uppercase tracking-wider text-white/55 mt-0.5">
                        {tool.tag}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Centerpiece Back-View Silhouette + Concentric Energy Rings */}
            <div className="lg:col-span-4 relative flex items-center justify-center min-h-[400px] sm:min-h-[470px]">
              {/* Rim Backglow */}
              <div
                className="pointer-events-none absolute inset-4 rounded-full"
                style={{
                  background:
                    'radial-gradient(circle at 38% 45%, rgba(168,85,247,0.42), transparent 55%), radial-gradient(circle at 64% 48%, rgba(255,138,30,0.38), transparent 55%)',
                  filter: 'blur(34px)',
                }}
              />
              {/* 3 Concentric Energy Rings */}
              <div
                className="universe-energy-ring w-[260px] h-[260px] sm:w-[310px] sm:h-[310px] border border-[#A855F7]/45"
                style={{ boxShadow: '0 0 35px rgba(168, 85, 247, 0.25)' }}
              />
              <div
                className="universe-energy-ring w-[340px] h-[340px] sm:w-[410px] sm:h-[410px] border border-[#FF8A1E]/35"
                style={{ animationDelay: '1.5s', boxShadow: '0 0 42px rgba(255, 138, 30, 0.18)' }}
              />
              <div
                className="universe-energy-ring w-[420px] h-[420px] sm:w-[500px] sm:h-[500px] border border-[#E50914]/25"
                style={{ animationDelay: '3s' }}
              />

              <img
                src={backSilhouetteSrc}
                alt="Manoj Kumar PR Silhouette"
                className="relative z-10 max-h-[380px] sm:max-h-[440px] w-auto object-contain select-none drop-shadow-[0_0_40px_rgba(168,85,247,0.3)]"
                style={{
                  transform: `translate3d(${pointer.x * 10}px, ${pointer.y * 8}px, 0)`,
                }}
              />
            </div>

            {/* Right Arc (6 Bevel-Edged Cubes) */}
            <div className="lg:col-span-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3.5 relative z-20">
              {rightTools.map((tool, idx) => {
                const i = idx + 6;
                const Icon = TOOL_ICONS[i % TOOL_ICONS.length];
                const arcOffset = idx === 1 || idx === 5 ? 'lg:-translate-x-5' : idx === 3 ? 'lg:translate-x-2' : '';
                return (
                  <motion.div
                    key={`${tool.name}-${i}`}
                    initial={{ opacity: 0, x: 24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.1 }}
                    transition={{ duration: 0.5, delay: idx * 0.06 }}
                    className={`tool-bevel-cube p-4 flex flex-col justify-between min-h-[104px] ${arcOffset}`}
                    style={{
                      transform: `translate3d(${pointer.x * (6 + idx)}px, ${pointer.y * -5}px, 0)`,
                    }}
                  >
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center border border-white/15"
                      style={{
                        background: `linear-gradient(135deg, ${tool.accent || '#ff8a1e'}33, rgba(0,0,0,0.8))`,
                        boxShadow: `0 0 18px ${tool.accent || '#ff8a1e'}44`,
                      }}
                    >
                      <Icon size={16} style={{ color: tool.accent || '#fff' }} />
                    </div>
                    <div className="mt-3">
                      <div className="text-sm font-bold text-white leading-tight">{tool.name}</div>
                      <div className="text-[10px] font-mono-tech uppercase tracking-wider text-white/55 mt-0.5">
                        {tool.tag}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 3: "JOURNEY THROUGH TIME" (Interactive Perspective Timeline)
            Vertical Left Title + Overhead Sweeping Spotlight Beam + 6 Cards + Silhouette
           ═══════════════════════════════════════════════════════════ */}
        <section
          id="about"
          ref={journeySectionRef}
          className="relative py-28 sm:py-36 px-4 sm:px-8 max-w-7xl mx-auto overflow-hidden border-t border-white/10"
        >
          {/* Animated Orange Spotlight Beam Sweeping Onto Active Card */}
          <div
            className="timeline-beam hidden md:block"
            style={{
              left: `${activeBeamLeftPercent}%`,
              transform: `rotate(${(activeMilestoneIdx - 2.5) * 3.5}deg)`,
            }}
            aria-hidden="true"
          />

          <div className="flex flex-col md:flex-row gap-8 items-stretch relative z-10">
            {/* Left Vertical Title */}
            <div className="flex md:flex-col items-center justify-between md:justify-start md:w-12 shrink-0 gap-4">
              <span className="vertical-edge-tag text-white/70 md:rotate-180">
                {content.journey.verticalTitle}
              </span>
              <span className="text-[10px] font-mono-tech text-[#FF8A1E]">
                SCENE 03 • {String(activeMilestoneIdx + 1).padStart(2, '0')} / {String(content.journey.milestones.length).padStart(2, '0')}
              </span>
            </div>

            {/* 6 Perspective Milestone Cards */}
            <div className="flex-1 timeline-stage-perspective">
              <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold tracking-[0.34em] uppercase text-[#FF8A1E]">
                    CHAPTER TIMELINE • 2017–2026+
                  </p>
                  <h2 className="font-cinzel text-3xl sm:text-5xl font-bold uppercase text-white mt-2">
                    {content.journey.verticalTitle}
                  </h2>
                </div>
                <p className="text-xs text-white/60">
                  Hover or click any milestone card to sweep the stage spotlight
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {content.journey.milestones.map((m, idx) => {
                  const active = idx === activeMilestoneIdx;
                  return (
                    <div
                      key={`${m.year}-${idx}`}
                      onMouseEnter={() => setActiveMilestoneIdx(idx)}
                      onClick={() => setActiveMilestoneIdx(idx)}
                      className="cursor-pointer flex flex-col"
                    >
                      <div
                        className={`text-center font-anton text-xl tracking-wider mb-2.5 transition ${
                          active ? 'text-[#FF8A1E] scale-105' : 'text-white/55'
                        }`}
                      >
                        {m.year}
                      </div>
                      <article className={`milestone-card p-4 flex-1 flex flex-col justify-between ${active ? 'is-active' : ''}`}>
                        <div>
                          <div className="text-[10px] font-mono-tech uppercase tracking-widest text-[#E50914] mb-1">
                            {m.subtitle}
                          </div>
                          <h3 className="text-sm font-bold text-white leading-snug mb-3">
                            {m.title}
                          </h3>
                          <ul className="space-y-1.5 text-[11px] text-white/72 leading-relaxed">
                            {(m.bullets || []).slice(0, 3).map((b, bi) => (
                              <li key={bi} className="flex items-start gap-1.5">
                                <span className="mt-1.5 h-1 w-1 rounded-full bg-[#FF8A1E] shrink-0" />
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="mt-4 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] font-mono-tech text-white/45">
                          <span>ACT 0{idx + 1}</span>
                          {active && <span className="text-[#FF8A1E] font-bold">SPOTLIGHT</span>}
                        </div>
                      </article>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Foreground Bottom-Center Silhouette overlooking timeline */}
          <div className="relative z-20 mt-8 flex flex-col items-center pointer-events-none">
            <img
              src={backSilhouetteSrc}
              alt="Viewing Timeline"
              className="h-36 sm:h-44 w-auto object-contain opacity-95 drop-shadow-[0_-10px_28px_rgba(255,138,30,0.28)]"
            />
            <div className="w-64 h-1.5 rounded-full bg-gradient-to-r from-transparent via-[#FF8A1E]/70 to-transparent blur-[2px] -mt-1" />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 4: "CREATE, BUILD, GROW WITHOUT LIMITS"
            Curved 3D Wall of Glowing Screens + Back Silhouette on Neon Circular Floor
           ═══════════════════════════════════════════════════════════ */}
        <section
          id="work"
          className="relative py-28 sm:py-36 px-4 sm:px-8 max-w-7xl mx-auto border-t border-white/10"
        >
          <div id="journal" className="sr-only" />
          <div className="text-center mb-12">
            <p className="text-[11px] font-bold tracking-[0.36em] uppercase text-[#A855F7]">
              {content.showcase.centerEyebrow}
            </p>
            <h2 className="font-cinzel text-3xl sm:text-5xl font-bold uppercase text-white mt-2">
              {content.showcase.centerHeading.replace(/\//g, ' ')}
            </h2>
          </div>

          <div className="curved-wall-perspective relative">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* Left Angled Curved Panels (01-03) */}
              <div
                className="lg:col-span-4 flex flex-col gap-4"
                style={{ transform: 'perspective(1200px) rotateY(8deg)' }}
              >
                {leftPanels.map((p) => (
                  <button
                    key={p.num}
                    onClick={() => setSelectedPanel(p)}
                    className="wall-screen-panel p-5 text-left cursor-pointer w-full"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-anton text-2xl text-[#E50914] tracking-wider">{p.num}</span>
                      <span className="text-[10px] font-mono-tech uppercase tracking-wider text-amber-300 border border-amber-400/25 bg-amber-400/10 rounded-full px-2.5 py-0.5">
                        {p.tag}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white">{p.title}</h3>
                    <p className="text-xs text-white/65 mt-1.5 leading-relaxed">{p.desc}</p>
                  </button>
                ))}
              </div>

              {/* Center Hero Screen + Back Silhouette Standing on Neon Circular Floor */}
              <div className="lg:col-span-4 flex flex-col items-center justify-between relative py-4">
                <div className="wall-screen-panel w-full p-6 sm:p-7 text-center relative overflow-hidden border-[#E50914]/45">
                  <div
                    className="pointer-events-none absolute inset-0 opacity-45"
                    style={{
                      background:
                        'radial-gradient(circle at 50% 10%, rgba(229,9,20,0.45), transparent 65%)',
                    }}
                  />
                  <div className="relative z-10">
                    <div className="text-[10px] font-mono-tech uppercase tracking-[0.28em] text-[#FF8A1E] mb-3">
                      COMMAND CENTER • MANOJ KUMAR PR
                    </div>
                    <div className="font-anton text-3xl sm:text-4xl uppercase leading-[1.02] tracking-wide text-white space-y-1">
                      {content.showcase.centerHeading.split('/').map((line, i) => (
                        <div
                          key={i}
                          className={i === 3 ? 'text-[#E50914]' : ''}
                        >
                          {line.trim()}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => scrollToSection('contact')}
                      className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#E50914] to-[#FF8A1E] px-6 py-2.5 text-xs font-bold tracking-[0.22em] uppercase text-white shadow-[0_0_28px_rgba(229,9,20,0.5)] hover:scale-105 transition cursor-pointer border-0"
                    >
                      {content.showcase.centerCta}
                    </button>
                  </div>
                </div>

                {/* Silhouette + Reflective Neon Floor */}
                <div className="relative mt-6 flex flex-col items-center justify-end w-full h-56">
                  <img
                    src={backSilhouetteSrc}
                    alt="Creative Silhouette"
                    className="relative z-20 h-44 w-auto object-contain drop-shadow-[0_0_32px_rgba(168,85,247,0.35)]"
                  />
                  <div className="neon-circular-floor absolute -bottom-6 w-72 h-28 rounded-full z-10 pointer-events-none" />
                </div>
              </div>

              {/* Right Angled Curved Panels (04-06) */}
              <div
                className="lg:col-span-4 flex flex-col gap-4"
                style={{ transform: 'perspective(1200px) rotateY(-8deg)' }}
              >
                {rightPanels.map((p) => (
                  <button
                    key={p.num}
                    onClick={() => setSelectedPanel(p)}
                    className="wall-screen-panel p-5 text-left cursor-pointer w-full"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-anton text-2xl text-[#A855F7] tracking-wider">{p.num}</span>
                      <span className="text-[10px] font-mono-tech uppercase tracking-wider text-purple-300 border border-purple-400/25 bg-purple-400/10 rounded-full px-2.5 py-0.5">
                        {p.tag}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white">{p.title}</h3>
                    <p className="text-xs text-white/65 mt-1.5 leading-relaxed">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom 3 Core Values Panels (07-09) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {bottomPanels.map((p) => (
                <button
                  key={p.num}
                  onClick={() => setSelectedPanel(p)}
                  className="wall-screen-panel p-5 text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-anton text-xl text-[#FF8A1E] tracking-wider">{p.num}</span>
                    <span className="text-[10px] font-mono-tech uppercase tracking-wider text-white/55">
                      {p.tag}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wide">{p.title}</h3>
                  <p className="text-xs text-white/60 mt-1">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 5: CINEMATIC POSTER & WIPE-REVEAL FOOTER
            Distressed Red/Black Movie Poster -> Wipes to Reveal Red/White Editorial Portrait
           ═══════════════════════════════════════════════════════════ */}
        <section
          id="contact"
          ref={posterSectionRef}
          className="relative py-24 sm:py-32 px-4 sm:px-8 max-w-7xl mx-auto border-t border-white/10"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-[11px] font-bold tracking-[0.34em] uppercase text-[#E50914]">
                SCENE 05 • FEATURE PRESENTATION &amp; CONTACT
              </p>
              <h2 className="font-cinzel text-3xl sm:text-5xl font-bold uppercase text-white mt-2">
                FINAL REVEAL &amp; CONNECT
              </h2>
            </div>

            {/* Interactive Poster Wipe Slider Control */}
            <div className="flex flex-wrap items-center gap-3 rounded-full border border-white/15 bg-black/75 px-4 py-2">
              <button
                type="button"
                onClick={() => setPosterWipe((w) => (w >= 50 ? 0 : 100))}
                className="inline-flex items-center gap-1.5 text-[11px] font-mono-tech uppercase tracking-wider text-white/85 hover:text-[#E50914] transition cursor-pointer bg-transparent border-0 p-0"
              >
                <Eye size={14} className="text-[#E50914]" />
                {posterWipe >= 50 ? 'Show Poster' : 'Reveal Editorial'}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={posterWipe}
                onChange={(e) => setPosterWipe(Number(e.target.value))}
                className="w-28 accent-[#E50914] cursor-pointer"
                aria-label="Poster wipe reveal slider"
              />
              <span className="text-[11px] font-mono-tech text-[#FF8A1E] w-9 text-right">
                {posterWipe}%
              </span>
            </div>
          </div>

          {/* Interactive 2-Column Stage: Left Poster-to-Editorial Wipe Frame + Right Always-Visible Contact Hub */}
          <div className="relative rounded-3xl overflow-hidden border border-white/15 shadow-[0_30px_90px_rgba(0,0,0,0.95)] bg-gradient-to-br from-[#190204] via-[#09090d] to-black">
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[540px] sm:min-h-[600px]">
              {/* LEFT COLUMN: Interactive Poster <-> Red/White Editorial Portrait Wipe Box */}
              <div
                onClick={() => setPosterWipe((w) => (w >= 50 ? 0 : 100))}
                title="Click or use slider above to wipe between Movie Poster and Editorial Portrait"
                className="lg:col-span-5 relative overflow-hidden bg-[#b5050f] flex items-end justify-center min-h-[460px] sm:min-h-[560px] cursor-pointer select-none group"
              >
                {/* Underlayer: Red-and-White Duotone Editorial Magazine Portrait */}
                <img
                  src={editorialRevealSrc}
                  alt="Editorial Portrait Reveal"
                  className="absolute inset-0 h-full w-full object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/25 pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 z-10 p-5 flex items-end justify-between">
                  <div>
                    <div className="text-[10px] font-mono-tech uppercase tracking-[0.25em] text-white/80">
                      BENGALURU • B.E. ISE 2026
                    </div>
                    <div className="font-anton text-2xl sm:text-3xl tracking-wide text-white mt-0.5">
                      {content.brandName}
                    </div>
                  </div>
                  <span className="rounded-full bg-black/70 border border-white/20 px-2.5 py-1 text-[10px] font-mono-tech uppercase tracking-wider text-white/85">
                    Editorial Reveal
                  </span>
                </div>

                {/* Overlay: Distressed Red-and-Black Movie Poster (wipes smoothly across left frame only) */}
                <div
                  className="poster-grunge-surface absolute inset-0 z-20 flex flex-col justify-between p-5 sm:p-6 transition-all duration-300 ease-out"
                  style={{
                    clipPath: `inset(0 ${posterWipe}% 0 0)`,
                  }}
                >
                  <div className="relative z-10 flex items-center justify-between gap-2 text-[9px] font-mono-tech uppercase tracking-[0.24em] text-white/85">
                    <span className="truncate">{content.poster.posterTagline}</span>
                    <span className="shrink-0">7.56 CGPA</span>
                  </div>

                  <div className="relative z-10 flex-1 flex items-center justify-center my-2 overflow-hidden">
                    <span className="vertical-edge-tag text-white/75 hidden sm:block absolute left-0 z-10">
                      {content.poster.verticalText}
                    </span>
                    <div className="font-anton text-[clamp(3.2rem,6vw,5.2rem)] leading-[0.88] text-black/85 uppercase tracking-tight text-center select-none drop-shadow-[0_4px_24px_rgba(229,9,20,0.75)] px-3">
                      {content.hero.displayName}
                    </div>
                    <img
                      src={heroCutoutSrc}
                      alt="Poster Portrait"
                      className="hero-cutout-img absolute bottom-0 h-[310px] sm:h-[370px] w-auto object-contain select-none"
                    />
                    <span className="vertical-edge-tag text-white/75 hidden sm:block absolute right-0 z-10">
                      {content.poster.verticalText}
                    </span>
                  </div>

                  <div className="relative z-10 flex items-center justify-between text-[9px] font-mono-tech uppercase tracking-[0.22em] text-white/85 border-t border-white/15 pt-2.5">
                    <span>CLICK OR SLIDE TO REVEAL →</span>
                    <span>VTU ELITE GOLD</span>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Always-Visible Contact Hub, CV Download & Neon DB Visitor Check-In */}

              <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between gap-6">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#E50914]/45 bg-[#E50914]/15 px-3 py-1 text-[10px] font-mono-tech uppercase tracking-[0.22em] text-[#ff6b73]">
                    <Sparkles size={12} /> Open to Full-Time &amp; Graduate Roles
                  </span>
                  <h3 className="font-anton text-3xl sm:text-5xl uppercase tracking-wide text-white mt-4 leading-none">
                    {content.poster.revealHeadline}
                  </h3>
                  <p className="text-sm text-white/70 mt-3 leading-relaxed max-w-2xl">
                    {content.poster.revealSubtext}
                  </p>

                  {/* Quick Contact Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-mono-tech uppercase tracking-wider text-white/45">
                          Direct Email
                        </div>
                        <div className="text-xs sm:text-sm font-semibold text-white mt-0.5 break-all">
                          {content.poster.email}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopy(content.poster.email, 'email')}
                        className="rounded-lg border border-white/15 bg-black/50 p-2 text-white/80 hover:text-white hover:border-[#E50914] cursor-pointer"
                        title="Copy email"
                      >
                        {copiedKey === 'email' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-mono-tech uppercase tracking-wider text-white/45">
                          Phone / WhatsApp
                        </div>
                        <div className="text-xs sm:text-sm font-semibold text-white mt-0.5">
                          {content.poster.phone}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopy(content.poster.phone, 'phone')}
                        className="rounded-lg border border-white/15 bg-black/50 p-2 text-white/80 hover:text-white hover:border-[#E50914] cursor-pointer"
                        title="Copy phone"
                      >
                        {copiedKey === 'phone' ? <Check size={14} className="text-emerald-400" /> : <Phone size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Recruiter Check-In & Engagement Bar */}
                <div className="space-y-4 border-t border-white/10 pt-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => downloadCvPdf(cv)}
                      className="inline-flex items-center gap-2 rounded-full bg-[#E50914] hover:bg-[#ff1e2d] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white cursor-pointer border-0"
                    >
                      <Download size={14} /> Download CV PDF
                    </button>
                    <button
                      onClick={handleToggleLike}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-semibold transition cursor-pointer ${
                        viewerLiked
                          ? 'border-[#FF1E2D] bg-[#E50914]/20 text-white'
                          : 'border-white/15 bg-white/5 text-white/80 hover:border-white/40'
                      }`}
                    >
                      <Heart size={14} fill={viewerLiked ? '#FF1E2D' : 'none'} />
                      {viewerLiked ? 'Appreciated' : 'Like Trailer'} ({totalLikes})
                    </button>
                    <button
                      onClick={() => setShowCheckIn((s) => !s)}
                      className="inline-flex items-center gap-2 rounded-full border border-amber-400/35 bg-amber-400/10 hover:bg-amber-400/20 px-4 py-2.5 text-xs font-semibold text-amber-200 cursor-pointer"
                    >
                      <UserPlus size={14} /> Visitor Check-In
                    </button>
                  </div>

                  {showCheckIn && (
                    <form
                      onSubmit={handleVisitorCheckIn}
                      className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 rounded-xl border border-white/15 bg-black/75 p-3"
                    >
                      <input
                        className="rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-[#E50914]"
                        placeholder="Your Name / Recruiter"
                        required
                        value={checkInForm.name}
                        onChange={(e) => setCheckInForm((f) => ({ ...f, name: e.target.value }))}
                      />
                      <input
                        className="rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-[#E50914]"
                        placeholder="Company"
                        value={checkInForm.company}
                        onChange={(e) => setCheckInForm((f) => ({ ...f, company: e.target.value }))}
                      />
                      <input
                        className="rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-[#E50914]"
                        placeholder="Role / Hiring For"
                        value={checkInForm.role}
                        onChange={(e) => setCheckInForm((f) => ({ ...f, role: e.target.value }))}
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-[#E50914] hover:bg-[#ff1e2d] px-3 py-2 text-xs font-bold uppercase text-white cursor-pointer border-0"
                      >
                        Save Check-In
                      </button>
                    </form>
                  )}

                  {recentVisitors.length > 0 && (
                    <div className="text-[11px] text-white/55">
                      Recent visitors logged to Neon DB:{' '}
                      <span className="text-white/80">
                        {recentVisitors
                          .slice(0, 3)
                          .map((v) => v.visitorName || v.ipRegion || 'Guest')
                          .join(' • ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Minimal Trailer Footer Bar */}
          <footer className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono-tech uppercase tracking-[0.2em] text-white/55">
            <div>{content.poster.copyright}</div>
            <div className="flex flex-wrap items-center gap-6">
              <a
                href={content.poster.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="text-white/75 hover:text-[#E50914] transition inline-flex items-center gap-1"
              >
                GITHUB <ArrowUpRight size={12} />
              </a>
              <a
                href={content.poster.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="text-white/75 hover:text-[#E50914] transition inline-flex items-center gap-1"
              >
                LINKEDIN <ArrowUpRight size={12} />
              </a>
              <a
                href={`mailto:${content.poster.email}`}
                className="text-white/75 hover:text-[#E50914] transition inline-flex items-center gap-1"
              >
                EMAIL <Mail size={12} />
              </a>
              {isAdminAuthenticated ? (
                <button
                  onClick={onEnterAdminPortal}
                  className="text-[#FF8A1E] hover:text-white transition cursor-pointer bg-transparent border-0 p-0 font-mono-tech uppercase tracking-[0.2em] text-[11px]"
                >
                  ADMIN PORTAL
                </button>
              ) : (
                <button
                  onClick={onOpenAdminLogin}
                  className="text-white/55 hover:text-[#E50914] transition cursor-pointer bg-transparent border-0 p-0 font-mono-tech uppercase tracking-[0.2em] text-[11px]"
                >
                  ADMIN LOGIN
                </button>
              )}
            </div>
          </footer>
        </section>
      </main>

      {/* Interactive Modal for Scene 04 Showcase Panels */}
      {selectedPanel && (
        <div
          className="fixed inset-0 z-80 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedPanel(null)}
        >
          <div
            className="max-w-lg w-full rounded-2xl border border-white/15 bg-[#0a0a0f] p-6 sm:p-8 shadow-[0_30px_90px_rgba(229,9,20,0.3)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="font-anton text-3xl text-[#E50914]">{selectedPanel.num}</span>
              <button
                onClick={() => setSelectedPanel(null)}
                className="rounded-full border border-white/15 p-1.5 text-white/70 hover:text-white cursor-pointer bg-transparent"
              >
                <X size={16} />
              </button>
            </div>
            <div className="text-[11px] font-mono-tech uppercase tracking-widest text-amber-300 mt-3">
              {selectedPanel.tag}
            </div>
            <h3 className="font-cinzel text-2xl font-bold text-white mt-1">{selectedPanel.title}</h3>
            <p className="text-sm text-white/75 leading-relaxed mt-3">{selectedPanel.desc}</p>
            <div className="mt-6 pt-4 border-t border-white/10 flex justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedPanel(null);
                  downloadCvPdf(cv);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#E50914] px-4 py-2 text-xs font-bold uppercase text-white cursor-pointer border-0"
              >
                <Download size={13} /> Download Resume
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
