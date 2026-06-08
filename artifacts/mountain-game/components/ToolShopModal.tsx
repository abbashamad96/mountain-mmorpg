import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Colors from "@/constants/colors";
import {
  GatheringTool,
  generateTool,
  TOOL_ICONS,
  TOOL_MATERIAL_MAP,
  TOOL_NAMES,
  TOOL_RARITY_COLORS,
  TOOL_TYPES,
  ToolType,
} from "@/lib/tools";
import { ItemRarity } from "@/lib/items";
import { ToolImage } from "./ToolImage";

// ─── Shop config ──────────────────────────────────────────────────────────────

type ShopRarity = "Common" | "Uncommon" | "Rare" | "Epic";

const SHOP_RARITIES: ShopRarity[] = ["Common", "Uncommon", "Rare", "Epic"];

const SHOP_PRICES: Record<ShopRarity, number> = {
  Common:   50_000,
  Uncommon: 200_000,
  Rare:     1_000_000,
  Epic:     5_000_000,
};

const RARITY_LABELS: Record<ShopRarity, string> = {
  Common:   "COMMON",
  Uncommon: "UNCOMMON",
  Rare:     "RARE",
  Epic:     "EPIC",
};

// ─── Stats preview pulled from tool stats ────────────────────────────────────

function getToolPreview(rarity: ShopRarity, type: ToolType): GatheringTool {
  return generateTool(type, rarity as ItemRarity);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ToolShopModalProps {
  visible: boolean;
  gold: number;
  onBuy: (tool: GatheringTool) => void;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ToolShopModal({ visible, gold, onBuy, onClose }: ToolShopModalProps) {
  const [selectedRarity, setSelectedRarity] = useState<ShopRarity>("Common");
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  const price = SHOP_PRICES[selectedRarity];
  const canAfford = gold >= price;

  const showFeedback = (msg: string, ok: boolean) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 2200);
  };

  const handleBuy = (type: ToolType) => {
    if (!canAfford) { showFeedback("Not enough gold!", false); return; }
    const tool = getToolPreview(selectedRarity, type);
    onBuy(tool);
    showFeedback(`Bought ${tool.rarity} ${TOOL_NAMES[type]}!`, true);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ss.overlay}>
        <Pressable style={ss.backdrop} onPress={onClose} />
        <View style={ss.sheet}>

          {/* ── Header ── */}
          <View style={ss.header}>
            <Text style={ss.npcLabel}>⚒ BLACKSMITH</Text>
            <Text style={ss.title}>Tool Shop</Text>
            <View style={ss.goldRow}>
              <Text style={ss.goldIcon}>🪙</Text>
              <Text style={[ss.goldAmt, !canAfford && ss.goldLow]}>
                {gold.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* ── Rarity selector ── */}
          <View style={ss.rarityRow}>
            {SHOP_RARITIES.map((r) => {
              const rc = TOOL_RARITY_COLORS[r as ItemRarity];
              const active = r === selectedRarity;
              return (
                <Pressable
                  key={r}
                  style={[ss.rarityChip, active && { borderColor: rc, backgroundColor: rc + "22" }]}
                  onPress={() => setSelectedRarity(r)}
                >
                  <Text style={[ss.rarityChipLabel, { color: active ? rc : Colors.game.textDim }]}>
                    {RARITY_LABELS[r]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* ── Feedback banner ── */}
          {feedback && (
            <View style={[ss.feedbackBanner, { borderColor: feedback.ok ? Colors.game.green : Colors.game.red }]}>
              <Text style={[ss.feedbackText, { color: feedback.ok ? Colors.game.green : Colors.game.red }]}>
                {feedback.msg}
              </Text>
            </View>
          )}

          {/* ── Tool cards ── */}
          <ScrollView contentContainerStyle={ss.cardList} showsVerticalScrollIndicator={false}>
            {TOOL_TYPES.map((type) => {
              const tool = getToolPreview(selectedRarity, type);
              const rc = TOOL_RARITY_COLORS[selectedRarity as ItemRarity];
              return (
                <View key={type} style={[ss.card, { borderColor: rc + "44" }]}>
                  <ToolImage type={type} rarity={selectedRarity as ItemRarity} size={54} />
                  <View style={ss.cardInfo}>
                    <Text style={[ss.cardRarity, { color: rc }]}>{selectedRarity}</Text>
                    <Text style={ss.cardName}>{TOOL_NAMES[type]}</Text>
                    <Text style={ss.cardMaterial}>
                      {TOOL_ICONS[type]} Gathers {TOOL_MATERIAL_MAP[type]}
                    </Text>
                    <Text style={ss.cardStats}>
                      {tool.effectMinBonus}–{tool.effectMaxBonus} nodes · {tool.effectChance}% +1 extra · {tool.passiveChance}% auto-sweep
                    </Text>
                  </View>
                  <Pressable
                    style={[ss.buyBtn, canAfford ? { backgroundColor: rc + "22", borderColor: rc } : ss.buyBtnDisabled]}
                    onPress={() => handleBuy(type)}
                  >
                    <Text style={[ss.buyBtnPrice, { color: canAfford ? rc : Colors.game.textDim }]}>
                      🪙 {price.toLocaleString()}
                    </Text>
                    <Text style={[ss.buyBtnLabel, { color: canAfford ? rc : Colors.game.textDim }]}>
                      BUY
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>

          {/* ── Close ── */}
          <Pressable style={ss.closeBtn} onPress={onClose}>
            <Text style={ss.closeTxt}>CLOSE</Text>
          </Pressable>

        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: Colors.game.surface,
    borderTopLeftRadius: 18, borderTopRightRadius: 18,
    borderTopWidth: 1, borderColor: Colors.game.border,
    maxHeight: "88%",
    paddingBottom: 16,
  },

  // header
  header: {
    alignItems: "center",
    paddingTop: 18, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.game.border,
    gap: 3,
  },
  npcLabel: {
    fontSize: 10, fontFamily: "Inter_500Medium",
    color: Colors.game.textDim, letterSpacing: 1.5,
  },
  title: {
    fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.game.text,
  },
  goldRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  goldIcon: { fontSize: 14 },
  goldAmt: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.game.gold },
  goldLow: { color: Colors.game.red },

  // rarity selector
  rarityRow: {
    flexDirection: "row", gap: 6,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  rarityChip: {
    flex: 1, alignItems: "center", paddingVertical: 6, paddingHorizontal: 4,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.game.border,
  },
  rarityChipLabel: {
    fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5,
  },
  rarityChipPrice: {
    fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 1,
  },

  // feedback
  feedbackBanner: {
    marginHorizontal: 14, marginBottom: 8,
    paddingVertical: 7, paddingHorizontal: 12,
    borderRadius: 8, borderWidth: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
  },
  feedbackText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  // cards
  cardList: { paddingHorizontal: 14, gap: 10, paddingBottom: 6 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 12, borderWidth: 1,
    padding: 12,
  },
  cardInfo: { flex: 1, gap: 2 },
  cardRarity: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  cardName: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.game.text },
  cardMaterial: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.game.textDim },
  cardStats: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.game.textDim, marginTop: 1 },

  // buy button
  buyBtn: {
    alignItems: "center", justifyContent: "center",
    borderRadius: 10, borderWidth: 1,
    paddingVertical: 8, paddingHorizontal: 10,
    minWidth: 72,
    gap: 2,
  },
  buyBtnDisabled: {
    borderColor: Colors.game.border,
    backgroundColor: "transparent",
  },
  buyBtnPrice: { fontSize: 11, fontFamily: "Inter_700Bold" },
  buyBtnLabel: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },

  // close
  closeBtn: {
    marginHorizontal: 14, marginTop: 12,
    paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.game.border,
    alignItems: "center",
  },
  closeTxt: {
    fontSize: 13, fontFamily: "Inter_700Bold",
    color: Colors.game.textDim, letterSpacing: 0.8,
  },
});
