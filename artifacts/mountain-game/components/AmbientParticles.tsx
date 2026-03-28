import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

interface AmbientConfig {
  count: number;
  orbitRadius: number;
  particleSize: number;
  orbitDuration: number;
  glowRadius: number;
}

// HALO_MARGIN: pixels beyond the splash frame edge where particles orbit
const HALO_MARGIN = 18;

const AMBIENT_CONFIG: Record<1 | 2 | 3, AmbientConfig> = {
  1: { count: 6,  orbitRadius: 0.55, particleSize: 4, orbitDuration: 3400, glowRadius: 3 },
  2: { count: 10, orbitRadius: 0.56, particleSize: 5, orbitDuration: 2700, glowRadius: 4 },
  3: { count: 14, orbitRadius: 0.58, particleSize: 6, orbitDuration: 2100, glowRadius: 6 },
};

const MAX_PARTICLES = 14;

interface AmbientParticlesProps {
  color: string;
  version: 1 | 2 | 3;
  size: number;
}

export function AmbientParticles({ color, version, size }: AmbientParticlesProps) {
  const cfg = AMBIENT_CONFIG[version];

  // Expanded container: size + HALO_MARGIN on each side so particles orbit outside the frame
  const containerSize = size + HALO_MARGIN * 2;
  const center = containerSize / 2;
  // Base orbit radius: puts particles just outside the splash art frame edge
  const baseOrbitRadius = size / 2 + HALO_MARGIN * cfg.orbitRadius;
  const pSize = cfg.particleSize;

  // Pre-allocate output Animated.Values (x, y, opacity, scale) once per particle slot
  const xVals = useRef(
    Array.from({ length: MAX_PARTICLES }, () => new Animated.Value(0))
  ).current;
  const yVals = useRef(
    Array.from({ length: MAX_PARTICLES }, () => new Animated.Value(0))
  ).current;
  const opacities = useRef(
    Array.from({ length: MAX_PARTICLES }, () => new Animated.Value(0))
  ).current;
  const scales = useRef(
    Array.from({ length: MAX_PARTICLES }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const count = cfg.count;
    const loopAnims: Animated.CompositeAnimation[] = [];
    const listenerCleanups: Array<() => void> = [];

    for (let i = 0; i < count; i++) {
      const startAngle = (i / count) * 2 * Math.PI + (Math.random() - 0.5) * 0.5;
      const baseR = baseOrbitRadius + (Math.random() - 0.5) * HALO_MARGIN * 0.5;
      const orbitDur = cfg.orbitDuration + Math.random() * 1200;
      const driftAmt = HALO_MARGIN * (0.3 + Math.random() * 0.4);
      const phaseDur = 1100 + Math.random() * 900;
      const fadeDelay = (i / count) * Math.min(orbitDur * 0.6, 1800);

      xVals[i].setValue(center - pSize / 2 + Math.cos(startAngle) * baseR);
      yVals[i].setValue(center - pSize / 2 + Math.sin(startAngle) * baseR);
      opacities[i].setValue(0);
      scales[i].setValue(0);

      // Tracked JS values for angle and radius — updated via listeners
      let currentAngle = startAngle;
      let currentRadius = baseR;

      const writeXY = () => {
        xVals[i].setValue(center - pSize / 2 + Math.cos(currentAngle) * currentRadius);
        yVals[i].setValue(center - pSize / 2 + Math.sin(currentAngle) * currentRadius);
      };

      // Animate angle 0→2π in a loop (orbit)
      const angleAnim = new Animated.Value(startAngle);
      const angleId = angleAnim.addListener(({ value }) => {
        currentAngle = value;
        writeXY();
      });

      // Animate radius (drift)
      const radiusAnim = new Animated.Value(baseR);
      const radiusId = radiusAnim.addListener(({ value }) => {
        currentRadius = value;
        writeXY();
      });

      listenerCleanups.push(() => {
        angleAnim.removeListener(angleId);
        radiusAnim.removeListener(radiusId);
      });

      Animated.timing(opacities[i], {
        toValue: 0.6 + Math.random() * 0.35,
        duration: 700,
        delay: fadeDelay,
        useNativeDriver: false,
      }).start();

      Animated.timing(scales[i], {
        toValue: 0.65 + Math.random() * 0.7,
        duration: 700,
        delay: fadeDelay,
        useNativeDriver: false,
      }).start();

      const orbit = Animated.loop(
        Animated.timing(angleAnim, {
          toValue: startAngle + 2 * Math.PI,
          duration: orbitDur,
          easing: Easing.linear,
          useNativeDriver: false,
        })
      );

      const drift = Animated.loop(
        Animated.sequence([
          Animated.timing(radiusAnim, {
            toValue: baseR + driftAmt,
            duration: phaseDur,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(radiusAnim, {
            toValue: baseR - driftAmt * 0.4,
            duration: phaseDur,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ])
      );

      const twinkle = Animated.loop(
        Animated.sequence([
          Animated.timing(opacities[i], {
            toValue: 0.95,
            duration: phaseDur * 0.6,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(opacities[i], {
            toValue: 0.3,
            duration: phaseDur * 0.6,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ])
      );

      orbit.start();
      drift.start();
      twinkle.start();
      loopAnims.push(orbit, drift, twinkle);
    }

    // Hide unused particle slots
    for (let i = count; i < MAX_PARTICLES; i++) {
      opacities[i].setValue(0);
      scales[i].setValue(0);
    }

    return () => {
      for (const a of loopAnims) a.stop();
      for (const cleanup of listenerCleanups) cleanup();
    };
  }, [version, size]);

  return (
    <View
      style={[
        styles.root,
        {
          width: containerSize,
          height: containerSize,
          top: -HALO_MARGIN,
          left: -HALO_MARGIN,
        },
      ]}
    >
      {Array.from({ length: cfg.count }, (_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              width: pSize,
              height: pSize,
              borderRadius: pSize / 2,
              backgroundColor: color,
              opacity: opacities[i],
              left: xVals[i],
              top: yVals[i],
              transform: [{ scale: scales[i] }],
              shadowColor: color,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.9,
              shadowRadius: cfg.glowRadius,
              elevation: 4,
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
    overflow: "visible",
    pointerEvents: "none",
  },
  particle: {
    position: "absolute",
  },
});
