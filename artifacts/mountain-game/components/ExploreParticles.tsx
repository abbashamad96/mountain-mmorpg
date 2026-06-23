import React, { useEffect, useRef } from "react";
import { Platform, View } from "react-native";

function ParticleCanvas({ flip }: { flip?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    const particles = Array.from({ length: 120 }, () => ({
      x: Math.random() * W, y: H + Math.random() * 20,
      vy: -(0.15 + Math.random() * 0.45),
      vx: (Math.random() - 0.5) * 0.15,
      size: 0.8 + Math.random() * 2.2,
      opacity: 0.4 + Math.random() * 0.6,
      isLine: Math.random() > 0.6,
      lineH: 8 + Math.random() * 18,
    }));
    let raf: number;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        const alpha = p.opacity * Math.max(0, Math.min(1, (H - p.y) / H * 3));
        if (p.isLine) {
          const lg = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.lineH);
          lg.addColorStop(0, `rgba(80,200,255,${alpha * 0.9})`);
          lg.addColorStop(1, `rgba(0,120,255,0)`);
          ctx.strokeStyle = lg;
          ctx.lineWidth = p.size * 0.6;
          ctx.beginPath(); ctx.moveTo(p.x, p.y + p.lineH); ctx.lineTo(p.x, p.y); ctx.stroke();
        } else {
        }
        p.x += p.vx; p.y += p.vy;
        if (p.y < -20) { p.y = H + 5; p.x = Math.random() * W; p.opacity = 0.4 + Math.random() * 0.6; }
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <canvas
      ref={ref}
      width={60}
      height={80}
      style={{ opacity: 0.85, transform: flip ? "scaleX(-1)" : undefined } as any}
    />
  );
}

export function ExploreParticles() {
  if (Platform.OS !== "web") return null;
  return (
    <View style={{ position: "absolute", top: 0, left: -60, right: -60, bottom: 0, alignItems: "center", overflow: "visible", flexDirection: "row", justifyContent: "space-between", pointerEvents: "none" } as any}>
      <ParticleCanvas />
      <ParticleCanvas flip />
    </View>
  );
}
