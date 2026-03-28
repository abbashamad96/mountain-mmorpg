import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Colors from "@/constants/colors";
import { GameState } from "@/context/GameContext";

const { width } = Dimensions.get("window");

const SCENE_IMAGES: Record<GameState["currentScene"], ImageSourcePropType> = {
  default: require("@/assets/images/road_default.png"),
  storm: require("@/assets/images/road_storm.png"),
  treasure: require("@/assets/images/road_treasure.png"),
  combat: require("@/assets/images/road_storm.png"),
  ruins: require("@/assets/images/road_treasure.png"),
};

const SCENE_LABELS: Record<GameState["currentScene"], string> = {
  default: "Mysterious Road",
  storm: "The Storm Path",
  treasure: "Ancient Ruins Trail",
  combat: "Danger Zone",
  ruins: "Forgotten Ruins",
};

const SCENE_SUBTITLES: Record<GameState["currentScene"], string> = {
  default: "Something stirs on the mountain road...",
  storm: "Lightning crackles. Proceed with caution.",
  treasure: "Golden light glints off the ancient stones.",
  combat: "Danger lurks around every corner.",
  ruins: "Echoes of a lost civilization.",
};

interface SceneViewProps {
  scene: GameState["currentScene"];
  onPress: () => void;
  disabled: boolean;
  isAnimating: boolean;
}

export function SceneView({
  scene,
  onPress,
  disabled,
  isAnimating,
}: SceneViewProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const prevScene = useRef(scene);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (prevScene.current !== scene) {
      prevScene.current = scene;
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [scene]);

  useEffect(() => {
    if (isAnimating) {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(shakeAnim, {
            toValue: 8,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: -8,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 6,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: -6,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 0,
            duration: 60,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.8,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [isAnimating]);

  useEffect(() => {
    if (!disabled) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.04,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [disabled]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          styles.sceneContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateX: shakeAnim }],
          },
        ]}
      >
        <Pressable
          onPress={onPress}
          disabled={disabled}
          style={({ pressed }) => [
            styles.pressable,
            pressed && styles.pressed,
          ]}
          testID="scene-press-button"
        >
          <Image
            source={SCENE_IMAGES[scene]}
            style={styles.sceneImage}
            resizeMode="cover"
          />

          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.glowOverlay,
              { opacity: glowOpacity },
            ]}
          />

          <View style={styles.labelContainer}>
            <View style={styles.labelBadge}>
              <Text style={styles.labelText}>{SCENE_LABELS[scene]}</Text>
            </View>
            <Text style={styles.subtitleText}>{SCENE_SUBTITLES[scene]}</Text>
          </View>

          {!disabled && (
            <Animated.View
              style={[
                styles.tapIndicator,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <Text style={styles.tapText}>TAP TO EXPLORE</Text>
            </Animated.View>
          )}

          {disabled && (
            <View style={styles.cooldownOverlay}>
              <View style={styles.cooldownBadge}>
                <Text style={styles.cooldownText}>PROCESSING...</Text>
              </View>
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
  sceneContainer: {
    width: "100%",
  },
  pressable: {
    width: "100%",
    aspectRatio: 16 / 9,
    position: "relative",
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.85,
  },
  sceneImage: {
    width: "100%",
    height: "100%",
  },
  glowOverlay: {
    backgroundColor: Colors.game.gold,
  },
  labelContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    paddingBottom: 12,
    backgroundColor: "rgba(13,10,20,0.65)",
  },
  labelBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(201,168,76,0.2)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.game.gold,
    marginBottom: 4,
  },
  labelText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.game.gold,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  subtitleText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.game.text,
    opacity: 0.85,
  },
  tapIndicator: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(201,168,76,0.15)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.game.gold,
  },
  tapText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.game.gold,
    letterSpacing: 1.5,
  },
  cooldownOverlay: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  cooldownBadge: {
    backgroundColor: "rgba(30,20,50,0.8)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.game.textMuted,
  },
  cooldownText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 1.5,
  },
});
