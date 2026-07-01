import React, { useEffect, useRef } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import { ItemChest } from "@/context/GameContext";
import { ITEM_RARITY_COLORS } from "@/lib/items";
import { OrnatePanel, RivetFrame } from "@/components/ui";
import { ChestImage } from "./ChestImage";

interface ChestDropModalProps {
  chest: ItemChest | null;
  onCollect: (chest: ItemChest) => void;
  onClose?: () => void;
}

export function ChestDropModal({ chest, onCollect, onClose }: ChestDropModalProps) {
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (chest) {
      scaleAnim.setValue(0.6);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 7 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [chest]);

  if (!chest) return null;

  const rc = ITEM_RARITY_COLORS[chest.rarity];

  return (
    <Modal transparent visible={!!chest} animationType="none">
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <OrnatePanel accent={rc} corners glow style={{ width: 300 }}>
            <View style={styles.card}>
              <Text style={styles.eyebrow}>CHEST FOUND</Text>

              <Text style={[styles.rarityTitle, { color: rc }]}>
                {`T${chest.tier} ${chest.rarity}`}
              </Text>

              <View style={styles.imageWrap}>
                <RivetFrame color={rc + "88"} size={148}>
                  <ChestImage rarity={chest.rarity} size={128} />
                </RivetFrame>
              </View>

              {!chest.tradable && (
                <View style={[styles.boundBadge, { borderColor: rc + "44" }]}>
                  <Text style={[styles.boundText, { color: rc }]}>ACCOUNT BOUND</Text>
                </View>
              )}

              <Pressable
                style={[styles.collectBtn, { borderColor: rc }]}
                onPress={() => onCollect(chest)}
              >
                <Text style={[styles.collectBtnText, { color: rc }]}>COLLECT</Text>
              </Pressable>
              {onClose && (
                <Pressable style={styles.closeBtn} onPress={onClose}>
                  <Text style={styles.closeBtnText}>CLOSE</Text>
                </Pressable>
              )}
            </View>
          </OrnatePanel>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    borderWidth: 1.5,
    gap: 12,
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 4,
  },
  rarityTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  imageWrap: {
    marginVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  boundBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  boundText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  collectBtn: {
    width: "100%",
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    marginTop: 4,
  },
  collectBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: 4,
  },
  closeBtn: {
    width: "100%",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: Colors.game.surface,
    borderWidth: 1,
    borderColor: Colors.game.border,
    marginTop: 8,
  },
  closeBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 3,
  },
});
