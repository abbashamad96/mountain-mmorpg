import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { VersionNum } from "@/context/GameContext";

// Config per version tier
const VERSION_CONFIG: Record<
  1 | 2 | 3,
  { size: number; count: number; dist: number; duration: number; waves: number; waveDelay: number }
> = {
  1: { size: 14, count: 8,  dist: 52, duration: 700,  waves: 1, waveDelay: 0   },
  2: { size: 20, count: 10, dist: 72, duration: 800,  waves: 2, waveDelay: 140 },
  3: { size: 26, count: 12, dist: 90, duration: 900,  waves: 3, waveDelay: 110 },
};

interface ParticleEffectProps {
  color: string;
  trigger: number;
  count?: number;       // overridden by version if provided
  version?: VersionNum;
}

function makeParticle() {
  return {
    x: new Animated.Value(0),
    y: new Animated.Value(0),
    opacity: new Animated.Value(0),
    scale: new Animated.Value(0),
  };
}

const MAX_PARTICLES = 12 * 3; // max waves × max count

export function ParticleEffect({ color, trigger, count = 8, version }: ParticleEffectProps) {
  const particles = useRef(
    Array.from({ length: MAX_PARTICLES }, makeParticle)
  ).current;

  useEffect(() => {
    if (trigger === 0 || color === "transparent") return;

    const cfg = version && version > 0
      ? VERSION_CONFIG[version as 1 | 2 | 3]
      : { size: 8, count, dist: 40, duration: 550, waves: 1, waveDelay: 0 };

    let particleIdx = 0;

    for (let wave = 0; wave < cfg.waves; wave++) {
      const waveCount = cfg.count;
      const waveDist = cfg.dist + wave * 20;   // outer waves travel further
      const waveSize = cfg.size * (1 - wave * 0.15);  // outer waves slightly smaller
      const delay = wave * cfg.waveDelay;
      const dur = cfg.duration + wave * 80;

      for (let i = 0; i < waveCount; i++) {
        if (particleIdx >= MAX_PARTICLES) break;
        const p = particles[particleIdx++];

        const angle = (i / waveCount) * 2 * Math.PI + (Math.random() - 0.5) * 0.6;
        const spreadDist = waveDist * (0.82 + Math.random() * 0.36);
        const tx = Math.cos(angle) * spreadDist;
        const ty = Math.sin(angle) * spreadDist;

        p.x.setValue(0);
        p.y.setValue(0);
        p.opacity.setValue(0);
        p.scale.setValue(0);

        const anim = Animated.sequence([
          delay > 0 ? Animated.delay(delay) : Animated.delay(0),
          // Pop in
          Animated.parallel([
            Animated.timing(p.opacity, { toValue: 0.95, duration: 90, useNativeDriver: false }),
            Animated.timing(p.scale,   { toValue: 1,    duration: 90, useNativeDriver: false }),
          ]),
          // Fly out and fade
          Animated.parallel([
            Animated.timing(p.x,       { toValue: tx,   duration: dur, useNativeDriver: false, easing: Easing.out(Easing.cubic) }),
            Animated.timing(p.y,       { toValue: ty,   duration: dur, useNativeDriver: false, easing: Easing.out(Easing.cubic) }),
            Animated.timing(p.scale,   { toValue: 0.15, duration: dur, useNativeDriver: false, easing: Easing.in(Easing.quad)  }),
            Animated.sequence([
              Animated.timing(p.opacity, { toValue: 0.95, duration: dur * 0.45, useNativeDriver: false }),
              Animated.timing(p.opacity, { toValue: 0,    duration: dur * 0.55, useNativeDriver: false, easing: Easing.in(Easing.cubic) }),
            ]),
          ]),
        ]);

        anim.start();
      }
    }

    // Cleanup any unused slots
    for (let i = particleIdx; i < MAX_PARTICLES; i++) {
      particles[i].opacity.setValue(0);
      particles[i].scale.setValue(0);
    }
  }, [trigger]);

  if (color === "transparent") return null;

  const cfg = version && version > 0
    ? VERSION_CONFIG[version as 1 | 2 | 3]
    : { size: 8, count, dist: 40, duration: 550, waves: 1, waveDelay: 0 };

  const pSize = cfg.size;

  return (
    <View style={styles.root} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              width: pSize,
              height: pSize,
              borderRadius: pSize / 2,
              backgroundColor: color,
              transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
              opacity: p.opacity,
              // Soft glow via inner shadow fallback (shadow props on web)
              shadowColor: color,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.9,
              shadowRadius: pSize * 0.7,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    width: 0,
    height: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  particle: {
    position: "absolute",
  },
});
