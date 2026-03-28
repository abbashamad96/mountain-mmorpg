import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

interface ParticleEffectProps {
  color: string;
  trigger: number;
  count?: number;
}

export function ParticleEffect({ color, trigger, count = 8 }: ParticleEffectProps) {
  const particles = useRef(
    Array.from({ length: count }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (trigger === 0 || color === "transparent") return;

    const anims = particles.map((p, i) => {
      const angle = (i / count) * 2 * Math.PI + Math.random() * 0.5;
      const dist = 18 + Math.random() * 24;
      p.x.setValue(0);
      p.y.setValue(0);
      p.opacity.setValue(0);
      p.scale.setValue(0);

      return Animated.sequence([
        Animated.parallel([
          Animated.timing(p.opacity, { toValue: 1, duration: 80, useNativeDriver: false }),
          Animated.timing(p.scale, { toValue: 1, duration: 80, useNativeDriver: false }),
        ]),
        Animated.parallel([
          Animated.timing(p.x, { toValue: Math.cos(angle) * dist, duration: 450, useNativeDriver: false }),
          Animated.timing(p.y, { toValue: Math.sin(angle) * dist, duration: 450, useNativeDriver: false }),
          Animated.timing(p.opacity, { toValue: 0, duration: 450, useNativeDriver: false }),
          Animated.timing(p.scale, { toValue: 0.2, duration: 450, useNativeDriver: false }),
        ]),
      ]);
    });

    Animated.parallel(anims).start();
  }, [trigger]);

  if (color === "transparent") return null;

  return (
    <View style={styles.root} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: color },
            {
              transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
              opacity: p.opacity,
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
  dot: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
