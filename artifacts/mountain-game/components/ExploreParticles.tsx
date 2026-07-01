import React, { useEffect, useRef } from "react";
import { Platform, View } from "react-native";

function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vy: -(0.08 + Math.random() * 0.2),
      vx: (Math.random() - 0.5) * 0.05,
      size: 0.6 + Math.random() * 1.6,
      opacity: 0.3 + Math.random() * 0.6,
      isLine: Math.random() > 0.45,
      lineH: 6 + Math.random() * 14,
      isDot: Math.random() > 0.6,
      glow: Math.random() > 0.7,
    }));

    let raf: number;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        const fade = Math.max(0, Math.min(1, (H - p.y) / (H * 0.6)));
        const alpha = p.opacity * fade;

        if (p.isLine) {
          const lg = ctx.createLinearGradient(p.x, p.y + p.lineH, p.x, p.y);
          lg.addColorStop(0, `rgba(0,180,255,${alpha * 0.9})`);
          lg.addColorStop(0.5, `rgba(80,210,255,${alpha * 0.5})`);
          lg.addColorStop(1, `rgba(0,120,255,0)`);
          ctx.strokeStyle = lg;
          ctx.lineWidth = p.size * 0.7;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y + p.lineH);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }

        if (p.isDot) {
          if (p.glow) {
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
            g.addColorStop(0, `rgba(120,220,255,${alpha})`);
            g.addColorStop(1, `rgba(0,100,255,0)`);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = `rgba(180,230,255,${alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI * 2);
          ctx.fill();
        }

        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -20) {
          p.y = H + 5;
          p.x = Math.random() * W;
          p.opacity = 0.3 + Math.random() * 0.6;
        }
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={ref}
      width={80}
      height={100}
      style={{ display: "block" } as any}
    />
  );
}

export function ExploreParticles() {
  if (Platform.OS !== "web") return null;
  return (
    <View
      style={{
        position: "absolute",
        top: -6,
        left: -6,
        right: -6,
        bottom: -6,
        overflow: "hidden",
        pointerEvents: "none",
      } as any}
    >
      <ParticleCanvas />
    </View>
  );
}
