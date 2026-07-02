'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
// 1. Switched to your unified project library
import { supabase } from "@/lib/supabase"; 
import Link from 'next/link';
import Navbar from "@/components/Navbar"

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getSession = async () => {
      // 2. Uses your clean standard client wrapper
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []); // 3. Clean dependency array

  const ctaHref = user ? '/browse' : '/signup';
  const ctaLabel = user ? 'Browse Profiles' : 'Find Your Match';

  return (
    <main style={{ backgroundColor: '#0A3320', minHeight: '100vh', fontFamily: "'Georgia', 'Times New Roman', serif" }}>
     <Navbar />
      {/* ── KEYFRAME STYLES ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Inter:wght@300;400;500;600&display=swap');

        * { box-sizing: border-box; }

        .font-display { font-family: 'Cormorant Garamond', Georgia, serif; }
        .font-body    { font-family: 'Inter', system-ui, sans-serif; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes floatA {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50%       { transform: translateY(-12px) rotate(-2deg); }
        }
        @keyframes floatB {
          0%, 100% { transform: translateY(0px) rotate(2deg); }
          50%       { transform: translateY(-8px) rotate(2deg); }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(197,106,77,0.0); }
          50%       { box-shadow: 0 0 0 10px rgba(197,106,77,0.15); }
        }

        .animate-fade-up   { animation: fadeUp 0.8s ease forwards; }
        .animate-fade-up-2 { animation: fadeUp 0.8s ease 0.15s forwards; opacity: 0; }
        .animate-fade-up-3 { animation: fadeUp 0.8s ease 0.30s forwards; opacity: 0; }
        .animate-fade-up-4 { animation: fadeUp 0.8s ease 0.45s forwards; opacity: 0; }
        .animate-fade-in   { animation: fadeIn 1.2s ease 0.6s forwards; opacity: 0; }

        .float-a { animation: floatA 6s ease-in-out infinite; }
        .float-b { animation: floatB 8s ease-in-out infinite; }
        .spin-slow { animation: spinSlow 40s linear infinite; }

        .cta-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 16px 36px;
          background: linear-gradient(135deg, #C56A4D 0%, #a8522f 100%);
          color: #fff;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          text-decoration: none;
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
          animation: pulseGlow 3s ease-in-out infinite;
        }
        .cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(197,106,77,0.45);
          background: linear-gradient(135deg, #d4795c 0%, #C56A4D 100%);
        }
        .cta-btn:active { transform: translateY(0); }

        .secondary-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 15px 32px;
          background: transparent;
          color: #F0EBE2;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 15px;
          font-weight: 500;
          letter-spacing: 0.04em;
          border: 1px solid rgba(240,235,226,0.35);
          border-radius: 4px;
          cursor: pointer;
          text-decoration: none;
          transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
        }
        .secondary-btn:hover {
          border-color: rgba(240,235,226,0.8);
          background: rgba(240,235,226,0.06);
          color: #fff;
        }

        .feature-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 40px 36px;
          transition: transform 0.3s ease, background 0.3s ease, border-color 0.3s ease;
        }
        .feature-card:hover {
          transform: translateY(-6px);
          background: rgba(255,255,255,0.07);
          border-color: rgba(197,106,77,0.3);
        }

        .icon-wrap {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: rgba(197,106,77,0.15);
          border: 1px solid rgba(197,106,77,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        }

        .stat-pill {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          padding: 20px 32px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          transition: background 0.2s ease;
        }
        .stat-pill:hover { background: rgba(255,255,255,0.09); }

        .divider-line {
          width: 1px;
          height: 60px;
          background: linear-gradient(to bottom, transparent, rgba(240,235,226,0.25), transparent);
        }

        /* Jali/lattice ornament */
        .jali-outer {
          position: relative;
          width: 420px;
          height: 420px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .jali-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(197,106,77,0.18);
        }

        .gold-line {
          width: 48px;
          height: 2px;
          background: linear-gradient(to right, #C56A4D, rgba(197,106,77,0.3));
          border-radius: 2px;
        }

        .eyebrow {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #C56A4D;
        }

        @media (max-width: 1024px) {
          .hero-grid { flex-direction: column !important; }
          .hero-visual { display: none !important; }
          .jali-outer { width: 300px; height: 300px; }
        }
        @media (max-width: 640px) {
          .features-grid { grid-template-columns: 1fr !important; }
          .stats-row { flex-direction: column !important; gap: 16px !important; }
          .divider-line { display: none !important; }
        }
      `}</style>

      {/* ══════════════════════════════════════════
          HERO SECTION
      ══════════════════════════════════════════ */}
      <section
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          paddingTop: '100px',
          paddingBottom: '80px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Deep ambient radial glow behind everything */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 70% 60% at 60% 40%, rgba(21,74,44,0.55) 0%, transparent 70%)',
        }} />
        {/* Subtle top-left warm glow */}
        <div style={{
          position: 'absolute', top: '-10%', left: '-5%', width: '500px', height: '500px',
          borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(197,106,77,0.07) 0%, transparent 65%)',
        }} />

        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 40px', width: '100%' }}>
          <div className="hero-grid" style={{ display: 'flex', alignItems: 'center', gap: '80px' }}>

            {/* ── LEFT: TEXT SIDE ── */}
            <div style={{ flex: '1', minWidth: 0 }}>

              {/* Eyebrow */}
              <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
                <div className="gold-line" />
                <span className="eyebrow">Pakistan's Premier Matrimonial Platform</span>
              </div>

              {/* Headline */}
              <h1
                className="animate-fade-up-2 font-display"
                style={{
                  fontSize: 'clamp(42px, 5.5vw, 72px)',
                  fontWeight: 700,
                  lineHeight: 1.08,
                  letterSpacing: '-0.02em',
                  color: '#F5F0E8',
                  marginBottom: '28px',
                }}
              >
                Intentional Matchmaking
                <br />
                <span style={{
                  fontStyle: 'italic',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #C56A4D 0%, #e08a6a 50%, #C56A4D 100%)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  Built on Trust & Privacy
                </span>
              </h1>

              {/* Subheadline */}
              <p
                className="animate-fade-up-3 font-body"
                style={{
                  fontSize: '18px',
                  lineHeight: 1.8,
                  color: 'rgba(240,235,226,0.72)',
                  fontWeight: 300,
                  maxWidth: '500px',
                  marginBottom: '48px',
                  letterSpacing: '0.01em',
                }}
              >
                Connect with genuine Pakistani families in a secure, respectful
                environment designed exclusively for marriage.
              </p>

              {/* CTA Row */}
              <div className="animate-fade-up-4" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                {!loading && (
                  <Link href={ctaHref} className="cta-btn">
                    {ctaLabel}
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Link>
                )}
                {!user && !loading && (
                  <Link href="/login" className="secondary-btn font-body">
                    Sign In
                  </Link>
                )}
              </div>

              {/* Trust micro-line */}
              <div className="animate-fade-in font-body" style={{ marginTop: '52px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M7.5 1L9.47 5.02L14 5.69L10.75 8.86L11.55 13.37L7.5 11.25L3.45 13.37L4.25 8.86L1 5.69L5.53 5.02L7.5 1Z" fill="#C56A4D" opacity="0.8"/>
                </svg>
                <span style={{ fontSize: '13px', color: 'rgba(240,235,226,0.45)', letterSpacing: '0.05em' }}>
                  Exclusively for serious matrimonial intentions ·
                </span>
              </div>
            </div>

            {/* ── RIGHT: ORNAMENTAL VISUAL PANEL ── */}
            <div className="hero-visual animate-fade-in" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="jali-outer">

                {/* Spinning outermost lattice ring */}
                <div className="spin-slow" style={{
                  position: 'absolute', inset: 0,
                  borderRadius: '50%',
                  border: '1px dashed rgba(197,106,77,0.2)',
                }}>
                  {/* 8 small diamond nodes around the ring */}
                  {Array.from({ length: 8 }).map((_, i) => {
                    const angle = (i / 8) * 2 * Math.PI;
                    const x = 50 + 49 * Math.cos(angle);
                    const y = 50 + 49 * Math.sin(angle);
                    return (
                      <div key={i} style={{
                        position: 'absolute',
                        left: `${x}%`, top: `${y}%`,
                        transform: 'translate(-50%,-50%) rotate(45deg)',
                        width: '7px', height: '7px',
                        background: 'rgba(197,106,77,0.5)',
                        borderRadius: '1px',
                      }} />
                    );
                  })}
                </div>

                {/* Static concentric rings */}
                <div className="jali-ring" style={{ inset: '10%' }} />
                <div className="jali-ring" style={{ inset: '20%', borderColor: 'rgba(197,106,77,0.12)' }} />

                {/* 16-point star polygon (two overlapping squares → octagram) */}
                <svg
                  viewBox="0 0 200 200"
                  style={{
                    position: 'absolute',
                    width: '55%', height: '55%',
                    opacity: 0.18,
                  }}
                >
                  {/* Outer octagram */}
                  <polygon
                    points="100,20 115,75 160,60 125,100 160,140 115,125 100,180 85,125 40,140 75,100 40,60 85,75"
                    fill="none" stroke="#C56A4D" strokeWidth="1.2"
                  />
                  {/* Inner square rotated */}
                  <rect x="65" y="65" width="70" height="70" fill="none" stroke="#F0EBE2" strokeWidth="0.8" transform="rotate(45,100,100)" />
                  <rect x="65" y="65" width="70" height="70" fill="none" stroke="#F0EBE2" strokeWidth="0.8" />
                </svg>

                {/* Centre glowing medallion */}
                <div style={{
                  position: 'relative', zIndex: 10,
                  width: '140px', height: '140px',
                  borderRadius: '50%',
                  background: 'linear-gradient(145deg, #154A2C 0%, #0d3d22 100%)',
                  border: '1px solid rgba(197,106,77,0.4)',
                  boxShadow: '0 0 60px rgba(197,106,77,0.15), inset 0 1px 0 rgba(255,255,255,0.08)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: '4px',
                }}>
                  {/* Arabic-inspired calligraphic ornament replaced by a Bismillah-style crescent SVG */}
                  <svg width="40" height="36" viewBox="0 0 40 36" fill="none">
                    <path d="M20 4 C10 4, 4 10, 4 18 C4 27, 12 33, 20 33 C14 30, 10 25, 12 20 C14 15, 20 14, 26 17 C30 19, 30 26, 26 31 C28 29, 30 26, 30 22 C30 12, 26 4, 20 4 Z" fill="rgba(197,106,77,0.7)" />
                    <circle cx="30" cy="8" r="3" fill="rgba(197,106,77,0.5)" />
                  </svg>
                  <span style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em',
                    color: 'rgba(240,235,226,0.7)', textTransform: 'uppercase',
                    marginTop: '4px',
                  }}>
                    Rishta
                  </span>
                </div>

                {/* Floating stat card — top right */}
                <div className="float-a" style={{
                  position: 'absolute',
                  top: '6%', right: '-4%',
                  background: 'linear-gradient(145deg, rgba(21,74,44,0.95) 0%, rgba(10,51,32,0.98) 100%)',
                  border: '1px solid rgba(197,106,77,0.35)',
                  borderRadius: '16px',
                  padding: '18px 22px',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                  minWidth: '160px',
                }}>
                  <div style={{ fontSize: '26px', fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: '#F5F0E8', lineHeight: 1 }}>500+</div>
                  <div style={{ fontSize: '11.5px', color: 'rgba(240,235,226,0.6)', fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 400, marginTop: '5px', letterSpacing: '0.02em', lineHeight: 1.5 }}>
                    Families connected<br />across Pakistan
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />
                    <span style={{ fontSize: '10.5px', color: 'rgba(240,235,226,0.45)', fontFamily: "'Inter', system-ui, sans-serif" }}>Privately & Respectfully</span>
                  </div>
                </div>

                {/* Floating endorsement card — bottom left */}
                <div className="float-b" style={{
                  position: 'absolute',
                  bottom: '8%', left: '-6%',
                  background: 'linear-gradient(145deg, rgba(21,74,44,0.95) 0%, rgba(10,51,32,0.98) 100%)',
                  border: '1px solid rgba(197,106,77,0.25)',
                  borderRadius: '14px',
                  padding: '16px 20px',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
                  minWidth: '150px',
                }}>
                  <div style={{ display: 'flex', gap: '-4px', marginBottom: '10px' }}>
                    {['#154A2C', '#0d3d22', '#1a5c35'].map((bg, i) => (
                      <div key={i} style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: bg, border: '2px solid rgba(197,106,77,0.4)',
                        marginLeft: i > 0 ? '-8px' : 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', fontWeight: 600, color: 'rgba(240,235,226,0.7)',
                        fontFamily: "'Inter', system-ui, sans-serif",
                      }}>
                        {['F', 'A', 'S'][i]}
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(240,235,226,0.55)', fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.5 }}>
                    New connections<br />
                    <span style={{ color: '#C56A4D', fontWeight: 500 }}>this week</span>
                  </div>
                </div>

              </div>
            </div>
            {/* ── END RIGHT VISUAL ── */}

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          HOW IT WORKS — PROCESS STRIP
      ══════════════════════════════════════════ */}
      <section style={{
        padding: '96px 40px',
        background: 'linear-gradient(180deg, rgba(21,74,44,0.25) 0%, rgba(10,51,32,0.4) 100%)',
        borderTop: '1px solid rgba(240,235,226,0.07)',
        borderBottom: '1px solid rgba(240,235,226,0.07)',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <span className="eyebrow" style={{ display: 'block', marginBottom: '16px' }}>The Process</span>
            <h2 className="font-display" style={{
              fontSize: 'clamp(28px, 3.5vw, 46px)',
              fontWeight: 700, color: '#F5F0E8',
              letterSpacing: '-0.02em', lineHeight: 1.1,
            }}>
              Simple. Dignified. Secure.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0', position: 'relative' }}>
            {/* Connector line */}
            <div style={{
              position: 'absolute', top: '36px', left: '12.5%', right: '12.5%', height: '1px',
              background: 'linear-gradient(to right, transparent, rgba(197,106,77,0.3) 20%, rgba(197,106,77,0.3) 80%, transparent)',
              pointerEvents: 'none',
            }} />

            {[
              { num: '01', title: 'Create Profile', desc: 'Complete your 3-step profile with personal and family details.' },
              { num: '02', title: 'Browse Matches', desc: 'Explore profiles filtered by your preferences in a private environment.' },
              { num: '03', title: 'Send Interest', desc: 'Express interest respectfully. The other party is notified privately.' },
              { num: '04', title: 'Connect Privately', desc: 'When both accept, contact details are revealed securely to both families.' },
            ].map((step, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '0 24px', position: 'relative' }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: i === 0 || i === 3
                    ? 'linear-gradient(145deg, #C56A4D, #a8522f)'
                    : 'rgba(21,74,44,0.8)',
                  border: '1px solid rgba(197,106,77,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 24px',
                  boxShadow: i === 0 || i === 3 ? '0 8px 24px rgba(197,106,77,0.3)' : 'none',
                  position: 'relative', zIndex: 2,
                }}>
                  <span className="font-body" style={{ fontSize: '13px', fontWeight: 600, color: '#F5F0E8', letterSpacing: '0.05em' }}>{step.num}</span>
                </div>
                <h4 className="font-display" style={{ fontSize: '19px', fontWeight: 700, color: '#F5F0E8', marginBottom: '10px' }}>{step.title}</h4>
                <p className="font-body" style={{ fontSize: '13.5px', color: 'rgba(240,235,226,0.5)', lineHeight: 1.75, fontWeight: 300 }}>{step.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════
          FEATURES SECTION
      ══════════════════════════════════════════ */}
      <section style={{ padding: '112px 40px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          {/* Section header */}
          <div style={{ textAlign: 'center', marginBottom: '72px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginBottom: '20px' }}>
              <div style={{ height: '1px', width: '40px', background: 'linear-gradient(to right, transparent, rgba(197,106,77,0.6))' }} />
              <span className="eyebrow">Why Families Choose Us</span>
              <div style={{ height: '1px', width: '40px', background: 'linear-gradient(to left, transparent, rgba(197,106,77,0.6))' }} />
            </div>
            <h2 className="font-display" style={{
              fontSize: 'clamp(32px, 4vw, 52px)',
              fontWeight: 700,
              color: '#F5F0E8',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              marginBottom: '18px',
            }}>
              A Platform Built on
              <span style={{ fontStyle: 'italic', color: '#C56A4D' }}> Principle</span>
            </h2>
            <p className="font-body" style={{
              fontSize: '17px', color: 'rgba(240,235,226,0.55)',
              maxWidth: '520px', margin: '0 auto',
              lineHeight: 1.8, fontWeight: 300,
            }}>
              We built every feature around the values of Pakistani families —
              privacy, dignity, and the sanctity of the marriage process.
            </p>
          </div>

          {/* 3-column grid */}
          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>

            {/* Card 1 — Privacy-First */}
            <div className="feature-card">
              <div className="icon-wrap">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <rect x="3" y="10" width="16" height="10" rx="3" stroke="#C56A4D" strokeWidth="1.6"/>
                  <path d="M7 10V7a4 4 0 1 1 8 0v3" stroke="#C56A4D" strokeWidth="1.6" strokeLinecap="round"/>
                  <circle cx="11" cy="15" r="1.5" fill="#C56A4D"/>
                </svg>
              </div>
              <h3 className="font-display" style={{ fontSize: '24px', fontWeight: 700, color: '#F5F0E8', marginBottom: '14px', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                Privacy-First by Design
              </h3>
              <p className="font-body" style={{ fontSize: '15px', color: 'rgba(240,235,226,0.55)', lineHeight: 1.85, fontWeight: 300 }}>
                Personal contact details, family information, and photos remain completely hidden until both parties have accepted each other's interest. No exposure without mutual consent.
              </p>
              <div style={{ marginTop: '28px', paddingTop: '24px', borderTop: '1px solid rgba(240,235,226,0.08)' }}>
                <span className="font-body" style={{ fontSize: '12px', color: '#C56A4D', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500 }}>
                  Mutual Unlock Required
                </span>
              </div>
            </div>

            {/* Card 2 — Family-Centric */}
            <div className="feature-card" style={{ border: '1px solid rgba(197,106,77,0.25)', background: 'rgba(197,106,77,0.05)' }}>
              <div className="icon-wrap" style={{ background: 'rgba(197,106,77,0.2)', borderColor: 'rgba(197,106,77,0.5)' }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <circle cx="11" cy="7" r="3" stroke="#C56A4D" strokeWidth="1.6"/>
                  <circle cx="5" cy="9" r="2" stroke="#C56A4D" strokeWidth="1.4"/>
                  <circle cx="17" cy="9" r="2" stroke="#C56A4D" strokeWidth="1.4"/>
                  <path d="M2 18c0-2.8 2-4 4-4M20 18c0-2.8-2-4-4-4M7 18c0-2.5 1.8-4 4-4s4 1.5 4 4" stroke="#C56A4D" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <h3 className="font-display" style={{ fontSize: '24px', fontWeight: 700, color: '#F5F0E8', marginBottom: '14px', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                Family-Centric Approach
              </h3>
              <p className="font-body" style={{ fontSize: '15px', color: 'rgba(240,235,226,0.55)', lineHeight: 1.85, fontWeight: 300 }}>
                Designed from the ground up for intentional marriage connections. No casual browsing, no swipe culture. Every profile reflects a family's serious matrimonial intent.
              </p>
              <div style={{ marginTop: '28px', paddingTop: '24px', borderTop: '1px solid rgba(197,106,77,0.15)' }}>
                <span className="font-body" style={{ fontSize: '12px', color: '#C56A4D', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500 }}>
                  Marriage-Focused Only
                </span>
              </div>
            </div>

            {/* Card 3 — Tailored Compatibility */}
            <div className="feature-card">
              <div className="icon-wrap">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <circle cx="11" cy="11" r="8" stroke="#C56A4D" strokeWidth="1.6"/>
                  <path d="M11 7v4l3 2" stroke="#C56A4D" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3.5 11h2M16.5 11h2M11 3.5v2M11 16.5v2" stroke="#C56A4D" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </div>
              <h3 className="font-display" style={{ fontSize: '24px', fontWeight: 700, color: '#F5F0E8', marginBottom: '14px', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                Tailored Compatibility
              </h3>
              <p className="font-body" style={{ fontSize: '15px', color: 'rgba(240,235,226,0.55)', lineHeight: 1.85, fontWeight: 300 }}>
                Filter profiles by education, profession, city, sect, and family background. Spend your time on profiles that truly align with what your family is seeking.
              </p>
              <div style={{ marginTop: '28px', paddingTop: '24px', borderTop: '1px solid rgba(240,235,226,0.08)' }}>
                <span className="font-body" style={{ fontSize: '12px', color: '#C56A4D', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500 }}>
                  Meaningful Filters
                </span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FINAL CTA BANNER
      ══════════════════════════════════════════ */}
      <section style={{ padding: '112px 40px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>

          {/* Ornamental divider */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '40px' }}>
            <div style={{ height: '1px', flex: 1, maxWidth: '80px', background: 'linear-gradient(to right, transparent, rgba(197,106,77,0.4))' }} />
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 1 L10.8 6.5 L16.5 6.5 L12 10 L13.8 15.5 L9 12.5 L4.2 15.5 L6 10 L1.5 6.5 L7.2 6.5 Z" fill="rgba(197,106,77,0.6)"/>
            </svg>
            <div style={{ height: '1px', flex: 1, maxWidth: '80px', background: 'linear-gradient(to left, transparent, rgba(197,106,77,0.4))' }} />
          </div>

          <h2 className="font-display" style={{
            fontSize: 'clamp(34px, 4.5vw, 58px)',
            fontWeight: 700, color: '#F5F0E8',
            letterSpacing: '-0.02em', lineHeight: 1.1,
            marginBottom: '20px',
          }}>
            Begin Your Search
            <br />
            <span style={{ fontStyle: 'italic', color: '#C56A4D' }}>With Intention</span>
          </h2>

          <p className="font-body" style={{
            fontSize: '17px', color: 'rgba(240,235,226,0.55)',
            lineHeight: 1.8, fontWeight: 300,
            marginBottom: '48px',
          }}>
            Join a growing community of Pakistani families who believe marriage
            deserves more than an algorithm — it deserves trust, privacy, and respect.
          </p>

          {!loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
              <Link href={ctaHref} className="cta-btn" style={{ fontSize: '16px', padding: '18px 48px' }}>
                {ctaLabel}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
              {!user && (
                <span className="font-body" style={{ fontSize: '13px', color: 'rgba(240,235,226,0.35)' }}>
                  Already registered?{' '}
                  <Link href="/login" style={{ color: 'rgba(197,106,77,0.8)', textDecoration: 'none', fontWeight: 500 }}>
                    Sign in here
                  </Link>
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════ */}
      <footer style={{
        borderTop: '1px solid rgba(240,235,226,0.08)',
        padding: '32px 40px',
        backgroundColor: 'rgba(0,0,0,0.2)',
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p className="font-body" style={{
            fontSize: '13px',
            color: 'rgba(240,235,226,0.3)',
            letterSpacing: '0.04em',
            textAlign: 'center',
          }}>
            © {new Date().getFullYear()} &nbsp;·&nbsp; Islamabad, Pakistan &nbsp;·&nbsp; All rights reserved.
          </p>
        </div>
      </footer>

    </main>
  );
}