import React, { useEffect, useRef } from "react";

const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1,
  speed: Math.random() * 0.3 + 0.1,
  opacity: Math.random() * 0.5 + 0.1,
  delay: Math.random() * 8,
}));

const FLOATING_WORDS = [
  { text: "README.md", top: "12%", left: "5%", delay: 0 },
  { text: "package.json", top: "25%", right: "6%", delay: 0.5 },
  { text: "Dockerfile", top: "60%", left: "3%", delay: 1 },
  { text: "go.mod", top: "75%", right: "5%", delay: 1.5 },
  { text: "Cargo.toml", top: "45%", left: "8%", delay: 2 },
  { text: ".github/", top: "80%", right: "8%", delay: 0.8 },
];

export default function Hero() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    const nodes = Array.from({ length: 50 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2 + 1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Update and draw nodes
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width)  n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(99,137,255,0.4)";
        ctx.fill();
      }

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(99,137,255,${0.15 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    const resize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <header style={{
      position: "relative",
      overflow: "hidden",
      background: "var(--bg)",
      minHeight: "88vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "60px 20px",
    }}>
      {/* Animated canvas background */}
      <canvas ref={canvasRef} style={{
        position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.6,
      }} />

      {/* Grid overlay */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `
          linear-gradient(rgba(99,137,255,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(99,137,255,0.04) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
        animation: "grid-move 8s linear infinite",
      }} />

      {/* Radial glow */}
      <div style={{
        position: "absolute",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "800px", height: "600px",
        background: "radial-gradient(ellipse, rgba(99,137,255,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Floating file names */}
      {FLOATING_WORDS.map(w => (
        <div key={w.text} style={{
          position: "absolute",
          top: w.top, left: w.left, right: w.right,
          fontFamily: "var(--mono)",
          fontSize: "0.7rem",
          color: "rgba(99,137,255,0.4)",
          animation: `float ${5 + w.delay}s ease-in-out infinite`,
          animationDelay: `${w.delay}s`,
          letterSpacing: "0.05em",
          userSelect: "none",
          pointerEvents: "none",
        }}>
          {w.text}
        </div>
      ))}

      {/* Scan line effect */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, transparent 0%, rgba(99,137,255,0.03) 50%, transparent 100%)",
        height: "120px",
        animation: "scan 6s linear infinite",
        pointerEvents: "none",
      }} />

      {/* Morphing blob */}
      <div style={{
        position: "absolute",
        top: "10%", right: "10%",
        width: "300px", height: "300px",
        background: "radial-gradient(ellipse, rgba(167,139,250,0.06) 0%, transparent 70%)",
        animation: "morph 12s ease-in-out infinite",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute",
        bottom: "10%", left: "10%",
        width: "250px", height: "250px",
        background: "radial-gradient(ellipse, rgba(56,189,248,0.05) 0%, transparent 70%)",
        animation: "morph 14s ease-in-out infinite reverse",
        pointerEvents: "none",
      }} />

      {/* Content */}
      <div style={{
        position: "relative", zIndex: 10,
        textAlign: "center",
        maxWidth: "800px",
      }}>
        {/* Version badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          background: "rgba(99,137,255,0.1)",
          border: "1px solid rgba(99,137,255,0.25)",
          borderRadius: "100px",
          padding: "6px 16px",
          marginBottom: "32px",
          fontSize: "0.78rem",
          color: "var(--brand)",
          fontFamily: "var(--mono)",
          animation: "fadeUp 0.6s ease both",
          letterSpacing: "0.05em",
        }}>
          <span style={{
            width: 6, height: 6,
            background: "var(--green)",
            borderRadius: "50%",
            animation: "pulse-glow 2s ease-in-out infinite",
            boxShadow: "0 0 6px var(--green)",
          }} />
          README GENERATOR · FOR REPOS
        </div>

        {/* Main title */}
        <h1 style={{
          fontSize: "clamp(2.8rem, 7vw, 5.5rem)",
          fontWeight: 900,
          lineHeight: 1.05,
          marginBottom: "24px",
          animation: "fadeUp 0.6s 0.1s ease both",
          letterSpacing: "-0.03em",
        }}>
          <span className="gradient-text">Real READMEs</span>
          <br />
          <span style={{ color: "var(--text)", opacity: 0.9 }}>for Real Repos</span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
          color: "var(--text2)",
          marginBottom: "48px",
          lineHeight: 1.7,
          maxWidth: "580px",
          margin: "0 auto 48px",
          animation: "fadeUp 0.6s 0.2s ease both",
        }}>
          Analyzes your actual repo — file tree, dependencies, CI, tests, releases
          — and generates accurate documentation. No templates. No guesswork.
        </p>

        {/* Feature pills */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: "10px",
          justifyContent: "center",
          animation: "fadeUp 0.6s 0.3s ease both",
        }}>
          {[
            { icon: "🔍", text: "Deep repo analysis" },
            { icon: "📦", text: "Detects frameworks" },
            { icon: "⚡", text: "Real-time streaming" },
            { icon: "🚫", text: "Zero templates" },
            { icon: "🌐", text: "Cloudflare powered" },
          ].map(f => (
            <span key={f.text} style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "8px 16px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "100px",
              fontSize: "0.8rem",
              color: "var(--text2)",
              transition: "all 0.2s",
            }}>
              {f.icon} {f.text}
            </span>
          ))}
        </div>

        {/* Scroll indicator */}
        <div style={{
          marginTop: "64px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
          color: "var(--text3)", fontSize: "0.75rem",
          animation: "fadeUp 0.6s 0.6s ease both",
        }}>
          <span style={{ animation: "blink 2s ease-in-out infinite" }}>↓ scroll to generate ↓</span>
        </div>
      </div>
    </header>
  );
}
