import React, { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Colors from "@/constants/colors";
import { SceneType } from "@/context/GameContext";
import { SceneEffects } from "./SceneEffects";

const SCENE_IMAGES: Record<SceneType, ImageSourcePropType> = {
  default: require("@/assets/images/road_default.png"),
  storm: require("@/assets/images/road_storm.png"),
  treasure: require("@/assets/images/road_treasure.png"),
  combat: require("@/assets/images/road_storm.png"),
  ruins: require("@/assets/images/road_treasure.png"),
  forest: require("@/assets/images/road_treasure.png"),
  snow: require("@/assets/images/road_default.png"),
  dungeon: require("@/assets/images/road_default.png"),
  volcanic: require("@/assets/images/road_storm.png"),
  night: require("@/assets/images/road_default.png"),
};

const SCENE_TINT: Record<SceneType, string> = {
  default: "transparent",
  storm: "rgba(30,60,140,0.3)",
  treasure: "rgba(160,120,0,0.2)",
  combat: "rgba(160,20,20,0.35)",
  ruins: "rgba(80,60,30,0.3)",
  forest: "rgba(10,80,20,0.35)",
  snow: "rgba(180,210,255,0.3)",
  dungeon: "rgba(60,10,100,0.45)",
  volcanic: "rgba(200,60,10,0.35)",
  night: "rgba(5,5,40,0.55)",
};

const SCENE_LABELS: Record<SceneType, string> = {
  default: "Mysterious Road",
  storm: "The Storm Path",
  treasure: "Ancient Ruins Trail",
  combat: "Danger Zone",
  ruins: "Forgotten Ruins",
  forest: "Enchanted Forest",
  snow: "Blizzard Pass",
  dungeon: "Sunken Dungeon",
  volcanic: "Volcanic Ridge",
  night: "Moonlit Path",
};

const SCENE_SUBTITLES: Record<SceneType, string> = {
  default: "Something stirs on the mountain road...",
  storm: "Lightning crackles. Proceed with caution.",
  treasure: "Golden light glints off the ancient stones.",
  combat: "A shadow moves between the rocks!",
  ruins: "Echoes of a lost civilization.",
  forest: "The trees whisper warnings of what lurks ahead.",
  snow: "Frost bites the air. Wind howls through the peaks.",
  dungeon: "Water drips in the darkness below.",
  volcanic: "The earth trembles. Embers drift on hot winds.",
  night: "Stars pierce the ink-black sky above.",
};

interface SceneViewProps {
  scene: SceneType;
  onPress: () => void;
  disabled: boolean;
  isAnimating: boolean;
}

export function SceneView({ scene, onPress, disabled, isAnimating }: SceneViewProps) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const prevScene = useRef(scene);
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (prevScene.current !== scene) {
      prevScene.current = scene;
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();
    }
  }, [scene]);

  useEffect(() => {
    if (isAnimating) {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 9, duration: 55, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -9, duration: 55, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 6, duration: 55, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -4, duration: 55, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 55, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.2, duration: 120, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.8, duration: 120, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
        ]),
      ]).start();
    }
  }, [isAnimating]);

  useEffect(() => {
    pulseLoop.current?.stop();
    if (!disabled) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 1100, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1100, useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => pulseLoop.current?.stop();
  }, [disabled]);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] });

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          styles.sceneContainer,
          { opacity: fadeAnim, transform: [{ translateX: shakeAnim }] },
        ]}
      >
        <Pressable
          onPress={onPress}
          disabled={disabled}
          style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
          testID="scene-press-button"
        >
          <Image source={SCENE_IMAGES[scene]} style={styles.img} resizeMode="cover" />

          {/* Scene color tint */}
          {SCENE_TINT[scene] !== "transparent" && (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: SCENE_TINT[scene] }]} />
          )}

          {/* Scene-specific animated effects */}
          <SceneEffects scene={scene} />

          {/* Gold press glow */}
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.glowOverlay, { opacity: glowOpacity }]}
          />

          {/* Bottom label */}
          <View style={styles.labelArea}>
            <View style={styles.labelBadge}>
              <Text style={styles.labelText}>{SCENE_LABELS[scene]}</Text>
            </View>
            <Text style={styles.subtitleText}>{SCENE_SUBTITLES[scene]}</Text>
          </View>

          {/* Ready indicator */}
          {!disabled && (
            <Animated.View style={[styles.tapBtn, { transform: [{ scale: pulseAnim }] }]}>
              <Text style={styles.tapText}>TAP TO EXPLORE</Text>
            </Animated.View>
          )}

          {disabled && (
            <View style={styles.cooldownBadge}>
              <Text style={styles.cooldownText}>EXPLORING...</Text>
            </View>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.game.border,
  },
  sceneContainer: { width: "100%" },
  pressable: {
    width: "100%",
    aspectRatio: 16 / 9,
    position: "relative",
    overflow: "hidden",
  },
  pressed: { opacity: 0.88 },
  img: { width: "100%", height: "100%" },
  glowOverlay: { backgroundColor: Colors.game.gold },
  labelArea: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    padding: 14, paddingBottom: 12,
    backgroundColor: "rgba(13,10,20,0.65)",
  },
  labelBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(201,168,76,0.18)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.game.gold,
    marginBottom: 4,
  },
  labelText: {
    fontSize: 11, fontFamily: "Inter_700Bold",
    color: Colors.game.gold, letterSpacing: 1.5, textTransform: "uppercase",
  },
  subtitleText: {
    fontSize: 12, fontFamily: "Inter_400Regular",
    color: Colors.game.text, opacity: 0.85,
  },
  tapBtn: {
    position: "absolute", top: 12, right: 12,
    backgroundColor: "rgba(201,168,76,0.15)",
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.game.gold,
  },
  tapText: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    color: Colors.game.gold, letterSpacing: 1.5,
  },
  cooldownBadge: {
    position: "absolute", top: 12, right: 12,
    backgroundColor: "rgba(20,15,40,0.85)",
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.game.textMuted,
  },
  cooldownText: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 1.5,
  },
});
