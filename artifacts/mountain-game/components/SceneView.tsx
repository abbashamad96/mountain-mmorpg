import React, { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  ImageSourcePropType,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Colors from "@/constants/colors";
import { SceneType } from "@/context/GameContext";

// ── Full background image pool ────────────────────────────────────────────────
const BG_IMAGES: ImageSourcePropType[] = [
  require("@/assets/images/road_default.png"),
  require("@/assets/images/road_storm.png"),
  require("@/assets/images/road_treasure.png"),
  require("@/assets/images/road_combat.png"),
  require("@/assets/images/road_ruins.png"),
  require("@/assets/images/road_forest.png"),
  require("@/assets/images/road_snow.png"),
  require("@/assets/images/road_dungeon.png"),
  require("@/assets/images/road_volcanic.png"),
  require("@/assets/images/road_night.png"),
  require("@/assets/images/road_crystal.png"),
  require("@/assets/images/road_temple.png"),
  require("@/assets/images/road_desert.png"),
  require("@/assets/images/road_graveyard.png"),
  require("@/assets/images/road_tundra.png"),
  require("@/assets/images/road_mist.png"),
  require("@/assets/images/road_swamp.png"),
  require("@/assets/images/road_void.png"),
  require("@/assets/images/road_clockwork.png"),
  require("@/assets/images/road_bloodmoon.png"),
  require("@/assets/images/road_waterfall.png"),
  require("@/assets/images/road_mushroom.png"),
  require("@/assets/images/road_lavafield.png"),
  require("@/assets/images/road_pinewood.png"),
  require("@/assets/images/road_abyss.png"),
  require("@/assets/images/road_castle.png"),
  require("@/assets/images/road_cliff.png"),
  require("@/assets/images/road_glowcave.png"),
  require("@/assets/images/road_oasis.png"),
  require("@/assets/images/road_peak.png"),
];

export const BG_IMAGES_COUNT = BG_IMAGES.length;

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
  artIndex: number;
  onPress: () => void;
  disabled: boolean;
}

export function SceneView({ scene, artIndex, onPress, disabled }: SceneViewProps) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const dimAnim  = useRef(new Animated.Value(0)).current;
  const dimRef   = useRef<Animated.CompositeAnimation | null>(null);
  const prevArtIndex = useRef(artIndex);

  // Crossfade when the background image cycles
  useEffect(() => {
    if (prevArtIndex.current !== artIndex) {
      prevArtIndex.current = artIndex;
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      ]).start();
    }
  }, [artIndex]);

  const handlePress = () => {
    if (disabled) return;
    dimRef.current?.stop();
    dimAnim.setValue(0.28);
    dimRef.current = Animated.timing(dimAnim, {
      toValue: 0,
      duration: 1400,
      useNativeDriver: true,
    });
    dimRef.current.start();
    onPress();
  };

  const bgImage = BG_IMAGES[artIndex % BG_IMAGES_COUNT];

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.sceneContainer, { opacity: fadeAnim }]}>
        <Pressable
          onPress={handlePress}
          disabled={disabled}
          style={styles.pressable}
          testID="scene-press-button"
        >
          <Image source={bgImage} style={styles.img} resizeMode="cover" />

          {/* Mood tint */}
          {SCENE_TINT[scene] !== "transparent" && (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: SCENE_TINT[scene] }]} />
          )}

          {/* Press dim — fades out slowly */}
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.dimOverlay, { opacity: dimAnim }]}
          />

          {/* Bottom scene label */}
          <View style={styles.labelArea}>
            <View style={styles.labelBadge}>
              <Text style={styles.labelText}>{SCENE_LABELS[scene]}</Text>
            </View>
            <Text style={styles.subtitleText}>{SCENE_SUBTITLES[scene]}</Text>
          </View>

          {/* Fixed tap / cooldown badge */}
          {!disabled ? (
            <View style={styles.tapBtn}>
              <Text style={styles.tapText}>TAP TO EXPLORE</Text>
            </View>
          ) : (
            <View style={styles.cooldownBadge}>
              <Text style={styles.cooldownText}>EXPLORING...</Text>
            </View>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const IMG_HEIGHT = Platform.OS === "web" ? 200 : undefined;
const IMG_ASPECT = Platform.OS === "web" ? undefined : (16 / 9 as any);

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
    height: IMG_HEIGHT,
    aspectRatio: IMG_ASPECT,
    position: "relative",
    overflow: "hidden",
  },
  img: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    width: "100%",
    height: "100%",
  },
  dimOverlay: { backgroundColor: "#000" },
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
