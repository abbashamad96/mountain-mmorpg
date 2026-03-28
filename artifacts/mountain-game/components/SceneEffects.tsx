import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";
import { SceneType } from "@/context/GameContext";

const { width: W, height: H } = Dimensions.get("window");
const SCENE_H = W * (9 / 16);

// ─── Snow Effect ─────────────────────────────────────────────────────────────

function SnowEffect() {
  const COUNT = 14;
  const flakes = useRef(
    Array.from({ length: COUNT }, (_, i) => ({
      x: Math.random(),
      yAnim: new Animated.Value(-(Math.random() * 0.6)),
      xDrift: new Animated.Value(0),
      opacity: new Animated.Value(0.4 + Math.random() * 0.5),
      size: 3 + Math.random() * 4,
      duration: 3200 + Math.random() * 2000,
      delay: i * 280,
    }))
  ).current;

  useEffect(() => {
    flakes.forEach((f) => {
      const loop = () => {
        f.yAnim.setValue(-(0.05 + Math.random() * 0.2));
        f.xDrift.setValue(0);
        Animated.parallel([
          Animated.timing(f.yAnim, { toValue: 1.05, duration: f.duration, useNativeDriver: false }),
          Animated.sequence([
            Animated.timing(f.xDrift, { toValue: 0.03, duration: f.duration / 3, useNativeDriver: false }),
            Animated.timing(f.xDrift, { toValue: -0.02, duration: f.duration / 3, useNativeDriver: false }),
            Animated.timing(f.xDrift, { toValue: 0.01, duration: f.duration / 3, useNativeDriver: false }),
          ]),
        ]).start(({ finished }) => { if (finished) loop(); });
      };
      setTimeout(loop, f.delay);
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {flakes.map((f, i) => {
        const left = f.yAnim.interpolate({ inputRange: [0, 1], outputRange: [`${f.x * 100}%`, `${(f.x + 0.08) * 100}%`] });
        const top = f.yAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              left,
              top,
              width: f.size,
              height: f.size,
              borderRadius: f.size / 2,
              backgroundColor: "#E8F4FF",
              opacity: f.opacity,
            }}
          />
        );
      })}
    </View>
  );
}

// ─── Forest / Leaf Effect ─────────────────────────────────────────────────────

function ForestEffect() {
  const COUNT = 10;
  const leaves = useRef(
    Array.from({ length: COUNT }, (_, i) => ({
      xAnim: new Animated.Value(Math.random()),
      yAnim: new Animated.Value(0.3 + Math.random() * 0.7),
      opacity: new Animated.Value(0),
      size: 5 + Math.random() * 8,
      color: ["#4CAF70", "#22C55E", "#6FD090", "#2E7D32"][Math.floor(Math.random() * 4)],
      duration: 2500 + Math.random() * 2000,
      delay: i * 300,
    }))
  ).current;

  useEffect(() => {
    leaves.forEach((leaf) => {
      const loop = () => {
        const startX = 0.1 + Math.random() * 0.8;
        leaf.xAnim.setValue(startX);
        leaf.yAnim.setValue(0.8 + Math.random() * 0.2);
        leaf.opacity.setValue(0);
        Animated.parallel([
          Animated.sequence([
            Animated.timing(leaf.opacity, { toValue: 0.7, duration: 300, useNativeDriver: false }),
            Animated.timing(leaf.opacity, { toValue: 0, duration: leaf.duration - 300, useNativeDriver: false }),
          ]),
          Animated.timing(leaf.yAnim, { toValue: -0.1, duration: leaf.duration, useNativeDriver: false }),
          Animated.sequence([
            Animated.timing(leaf.xAnim, { toValue: startX + 0.06, duration: leaf.duration / 3, useNativeDriver: false }),
            Animated.timing(leaf.xAnim, { toValue: startX - 0.05, duration: leaf.duration / 3, useNativeDriver: false }),
            Animated.timing(leaf.xAnim, { toValue: startX + 0.03, duration: leaf.duration / 3, useNativeDriver: false }),
          ]),
        ]).start(({ finished }) => { if (finished) loop(); });
      };
      setTimeout(loop, leaf.delay);
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {leaves.map((leaf, i) => {
        const left = leaf.xAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
        const top = leaf.yAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              left,
              top,
              width: leaf.size,
              height: leaf.size * 0.6,
              borderRadius: leaf.size / 2,
              backgroundColor: leaf.color,
              opacity: leaf.opacity,
              transform: [{ rotate: "45deg" }],
            }}
          />
        );
      })}
    </View>
  );
}

// ─── Volcanic / Ember Effect ──────────────────────────────────────────────────

function VolcanicEffect() {
  const COUNT = 12;
  const embers = useRef(
    Array.from({ length: COUNT }, (_, i) => ({
      xAnim: new Animated.Value(Math.random()),
      yAnim: new Animated.Value(1),
      opacity: new Animated.Value(0),
      size: 3 + Math.random() * 5,
      color: ["#FF6B35", "#F59E0B", "#EF4444", "#FCD34D"][Math.floor(Math.random() * 4)],
      duration: 2000 + Math.random() * 1500,
      delay: i * 220,
    }))
  ).current;

  useEffect(() => {
    embers.forEach((e) => {
      const loop = () => {
        const sx = 0.2 + Math.random() * 0.6;
        e.xAnim.setValue(sx);
        e.yAnim.setValue(0.95 + Math.random() * 0.05);
        e.opacity.setValue(0);
        Animated.parallel([
          Animated.sequence([
            Animated.timing(e.opacity, { toValue: 0.8, duration: 300, useNativeDriver: false }),
            Animated.timing(e.opacity, { toValue: 0, duration: e.duration - 300, useNativeDriver: false }),
          ]),
          Animated.timing(e.yAnim, { toValue: -0.05, duration: e.duration, useNativeDriver: false }),
          Animated.sequence([
            Animated.timing(e.xAnim, { toValue: sx + 0.05, duration: e.duration / 2, useNativeDriver: false }),
            Animated.timing(e.xAnim, { toValue: sx - 0.04, duration: e.duration / 2, useNativeDriver: false }),
          ]),
        ]).start(({ finished }) => { if (finished) loop(); });
      };
      setTimeout(loop, e.delay);
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {embers.map((e, i) => {
        const left = e.xAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
        const top = e.yAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              left,
              top,
              width: e.size,
              height: e.size,
              borderRadius: e.size / 2,
              backgroundColor: e.color,
              opacity: e.opacity,
            }}
          />
        );
      })}
      {/* Orange heat overlay at bottom */}
      <View style={styles.volcHeat} />
    </View>
  );
}

// ─── Storm / Rain Effect ──────────────────────────────────────────────────────

function StormEffect() {
  const RAIN = 16;
  const drops = useRef(
    Array.from({ length: RAIN }, (_, i) => ({
      xAnim: new Animated.Value(Math.random()),
      yAnim: new Animated.Value(-(Math.random() * 0.5)),
      opacity: new Animated.Value(0.3 + Math.random() * 0.4),
      duration: 800 + Math.random() * 600,
      delay: i * 80,
    }))
  ).current;

  const lightningOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    drops.forEach((d) => {
      const loop = () => {
        const sx = Math.random();
        d.xAnim.setValue(sx);
        d.yAnim.setValue(-(Math.random() * 0.3));
        Animated.timing(d.yAnim, { toValue: 1.1, duration: d.duration, useNativeDriver: false }).start(
          ({ finished }) => { if (finished) loop(); }
        );
      };
      setTimeout(loop, d.delay);
    });

    // Lightning flashes
    const flashLightning = () => {
      lightningOpacity.setValue(0);
      Animated.sequence([
        Animated.timing(lightningOpacity, { toValue: 0.5, duration: 80, useNativeDriver: false }),
        Animated.timing(lightningOpacity, { toValue: 0, duration: 120, useNativeDriver: false }),
        Animated.delay(200),
        Animated.timing(lightningOpacity, { toValue: 0.3, duration: 60, useNativeDriver: false }),
        Animated.timing(lightningOpacity, { toValue: 0, duration: 200, useNativeDriver: false }),
      ]).start(() => setTimeout(flashLightning, 3000 + Math.random() * 4000));
    };
    setTimeout(flashLightning, 1500);
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {drops.map((d, i) => {
        const left = d.xAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
        const top = d.yAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              left,
              top,
              width: 1.5,
              height: 14,
              backgroundColor: "#A0C8FF",
              opacity: d.opacity,
              transform: [{ rotate: "15deg" }],
            }}
          />
        );
      })}
      <Animated.View
        style={[styles.lightningFlash, { opacity: lightningOpacity }]}
      />
    </View>
  );
}

// ─── Combat Effect ────────────────────────────────────────────────────────────

function CombatEffect() {
  const flash = useRef(new Animated.Value(0)).current;
  const slashAnims = useRef(
    Array.from({ length: 5 }, (_, i) => ({
      x: 0.1 + Math.random() * 0.8,
      y: 0.1 + Math.random() * 0.7,
      angle: -30 + Math.random() * 60,
      opacity: new Animated.Value(0),
      length: 20 + Math.random() * 40,
    }))
  ).current;

  useEffect(() => {
    const runSlash = () => {
      const idx = Math.floor(Math.random() * slashAnims.length);
      const s = slashAnims[idx];
      s.opacity.setValue(0);
      Animated.sequence([
        Animated.timing(s.opacity, { toValue: 0.9, duration: 60, useNativeDriver: false }),
        Animated.timing(s.opacity, { toValue: 0, duration: 200, useNativeDriver: false }),
      ]).start(() => setTimeout(runSlash, 800 + Math.random() * 1200));
    };
    runSlash();

    const flashRed = () => {
      flash.setValue(0);
      Animated.sequence([
        Animated.timing(flash, { toValue: 0.15, duration: 100, useNativeDriver: false }),
        Animated.timing(flash, { toValue: 0, duration: 300, useNativeDriver: false }),
      ]).start(() => setTimeout(flashRed, 2000 + Math.random() * 2000));
    };
    flashRed();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "#EF4444", opacity: flash }]} />
      {slashAnims.map((s, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            left: `${s.x * 100}%`,
            top: `${s.y * 100}%`,
            width: s.length,
            height: 2.5,
            backgroundColor: "#FCD34D",
            opacity: s.opacity,
            transform: [{ rotate: `${s.angle}deg` }],
            borderRadius: 1,
          }}
        />
      ))}
    </View>
  );
}

// ─── Night / Stars Effect ─────────────────────────────────────────────────────

function NightEffect() {
  const COUNT = 16;
  const stars = useRef(
    Array.from({ length: COUNT }, () => ({
      x: Math.random(),
      y: Math.random() * 0.6,
      opacity: new Animated.Value(0.2 + Math.random() * 0.5),
      size: 1.5 + Math.random() * 2.5,
      duration: 1500 + Math.random() * 2000,
    }))
  ).current;

  useEffect(() => {
    stars.forEach((s) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(s.opacity, { toValue: 0.9, duration: s.duration, useNativeDriver: false }),
          Animated.timing(s.opacity, { toValue: 0.1, duration: s.duration, useNativeDriver: false }),
        ])
      );
      loop.start();
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.nightOverlay} />
      {stars.map((s, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            left: `${s.x * 100}%`,
            top: `${s.y * 100}%`,
            width: s.size,
            height: s.size,
            borderRadius: s.size / 2,
            backgroundColor: "#E8E8FF",
            opacity: s.opacity,
          }}
        />
      ))}
    </View>
  );
}

// ─── Dungeon / Drip Effect ────────────────────────────────────────────────────

function DungeonEffect() {
  const COUNT = 6;
  const drips = useRef(
    Array.from({ length: COUNT }, (_, i) => ({
      x: 0.1 + (i / COUNT) * 0.85,
      yAnim: new Animated.Value(0),
      opacity: new Animated.Value(0),
      size: 4 + Math.random() * 4,
      duration: 1800 + Math.random() * 1200,
      delay: i * 400,
    }))
  ).current;

  useEffect(() => {
    drips.forEach((d) => {
      const loop = () => {
        d.yAnim.setValue(0);
        d.opacity.setValue(0);
        Animated.parallel([
          Animated.sequence([
            Animated.timing(d.opacity, { toValue: 0.6, duration: 200, useNativeDriver: false }),
            Animated.timing(d.opacity, { toValue: 0.6, duration: d.duration - 400, useNativeDriver: false }),
            Animated.timing(d.opacity, { toValue: 0, duration: 200, useNativeDriver: false }),
          ]),
          Animated.timing(d.yAnim, { toValue: 1, duration: d.duration, useNativeDriver: false }),
        ]).start(({ finished }) => { if (finished) loop(); });
      };
      setTimeout(loop, d.delay);
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.dungeonOverlay} />
      {drips.map((d, i) => {
        const top = d.yAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "90%"] });
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              left: `${d.x * 100}%`,
              top,
              width: d.size * 0.4,
              height: d.size * 1.8,
              borderRadius: d.size,
              backgroundColor: "#6B21A8",
              opacity: d.opacity,
            }}
          />
        );
      })}
    </View>
  );
}

// ─── Ruins / Dust Effect ──────────────────────────────────────────────────────

function RuinsEffect() {
  const COUNT = 9;
  const motes = useRef(
    Array.from({ length: COUNT }, (_, i) => ({
      xAnim: new Animated.Value(Math.random()),
      yAnim: new Animated.Value(Math.random()),
      opacity: new Animated.Value(0),
      size: 2 + Math.random() * 4,
      duration: 3000 + Math.random() * 2000,
      delay: i * 350,
    }))
  ).current;

  useEffect(() => {
    motes.forEach((m) => {
      const loop = () => {
        const sx = 0.1 + Math.random() * 0.8;
        const sy = 0.3 + Math.random() * 0.5;
        m.xAnim.setValue(sx);
        m.yAnim.setValue(sy);
        m.opacity.setValue(0);
        Animated.parallel([
          Animated.sequence([
            Animated.timing(m.opacity, { toValue: 0.5, duration: 500, useNativeDriver: false }),
            Animated.timing(m.opacity, { toValue: 0, duration: m.duration - 500, useNativeDriver: false }),
          ]),
          Animated.timing(m.xAnim, { toValue: sx + (Math.random() * 0.2 - 0.1), duration: m.duration, useNativeDriver: false }),
          Animated.timing(m.yAnim, { toValue: sy - 0.15, duration: m.duration, useNativeDriver: false }),
        ]).start(({ finished }) => { if (finished) loop(); });
      };
      setTimeout(loop, m.delay);
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {motes.map((m, i) => {
        const left = m.xAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
        const top = m.yAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              left,
              top,
              width: m.size,
              height: m.size,
              borderRadius: m.size / 2,
              backgroundColor: "#C9A84C",
              opacity: m.opacity,
            }}
          />
        );
      })}
    </View>
  );
}

// ─── Treasure / Sparkle Effect ────────────────────────────────────────────────

function TreasureEffect() {
  const COUNT = 10;
  const sparkles = useRef(
    Array.from({ length: COUNT }, (_, i) => ({
      xAnim: new Animated.Value(Math.random()),
      yAnim: new Animated.Value(Math.random()),
      opacity: new Animated.Value(0),
      size: 3 + Math.random() * 5,
      color: ["#F59E0B", "#FCD34D", "#C9A84C", "#FFF8DC"][Math.floor(Math.random() * 4)],
      duration: 1200 + Math.random() * 1000,
      delay: i * 250,
    }))
  ).current;

  useEffect(() => {
    sparkles.forEach((s) => {
      const loop = () => {
        s.xAnim.setValue(0.1 + Math.random() * 0.8);
        s.yAnim.setValue(0.2 + Math.random() * 0.6);
        s.opacity.setValue(0);
        Animated.sequence([
          Animated.timing(s.opacity, { toValue: 0.9, duration: 300, useNativeDriver: false }),
          Animated.timing(s.opacity, { toValue: 0, duration: s.duration - 300, useNativeDriver: false }),
        ]).start(({ finished }) => { if (finished) loop(); });
      };
      setTimeout(loop, s.delay);
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {sparkles.map((s, i) => {
        const left = s.xAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
        const top = s.yAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              left,
              top,
              width: s.size,
              height: s.size,
              borderRadius: s.size / 2,
              backgroundColor: s.color,
              opacity: s.opacity,
            }}
          />
        );
      })}
    </View>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

interface SceneEffectsProps {
  scene: SceneType;
}

export function SceneEffects({ scene }: SceneEffectsProps) {
  switch (scene) {
    case "snow": return <SnowEffect />;
    case "forest": return <ForestEffect />;
    case "volcanic": return <VolcanicEffect />;
    case "storm": return <StormEffect />;
    case "combat": return <CombatEffect />;
    case "night": return <NightEffect />;
    case "dungeon": return <DungeonEffect />;
    case "ruins": return <RuinsEffect />;
    case "treasure": return <TreasureEffect />;
    default: return null;
  }
}

const styles = StyleSheet.create({
  lightningFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#E0E8FF",
  },
  volcHeat: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "25%",
    backgroundColor: "rgba(239,68,68,0.12)",
  },
  nightOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,8,40,0.45)",
  },
  dungeonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(60,20,80,0.35)",
  },
});
