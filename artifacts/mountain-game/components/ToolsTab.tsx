import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Colors from "@/constants/colors";
import {
  formatToolName,
  GatheringTool,
  TOOL_ICONS,
  TOOL_MATERIAL_MAP,
  TOOL_NAMES,
  TOOL_RARITY_COLORS,
  ToolType,
} from "@/lib/tools";
import { useGame } from "@/context/GameContext";
import { ToolImage } from "./ToolImage";

interface ToolsTabProps {
  onListOnAh?: (tool: GatheringTool) => void;
}

const SLOT_ORDER: { type: ToolType; material: string; icon: string }[] = [
  { type: "Axe",           material: "Wood",    icon: "🌲" },
  { type: "Pickaxe",       material: "Ore",     icon: "⛰" },
  { type: "SkinningKnife", material: "Leather", icon: "🐾" },
  { type: "Sickle",        material: "Herb",    icon: "🌿" },
];

export function ToolsTab({ onListOnAh }: ToolsTabProps) {
  const { gameState, equipGatheringTool, unequipGatheringTool } = useGame();
  const char = gameState.character;
  const equippedTools = char.equippedTools ?? {};
  const toolBag = char.toolBag ?? [];
  const equippedCount = Object.keys(equippedTools).length;
  const [selectedBagId, setSelectedBagId] = useState<string | null>(null);

  return (
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* ── Equipped slots ─────────────────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>
        EQUIPPED {equippedCount > 0 ? `(${equippedCount}/4)` : ""}
      </Text>
      <View style={styles.slotsGrid}>
        {SLOT_ORDER.map(({ type, material, icon }) => {
          const equipped = equippedTools[type];
          const rc = equipped ? (TOOL_RARITY_COLORS[equipped.rarity] ?? Colors.game.border) : Colors.game.border;
          return (
            <View
              key={type}
              style={[styles.slotCard, { borderColor: equipped ? rc + "99" : rc + "44" }]}
            >
              <View style={styles.slotHeader}>
                <Text style={styles.slotMatIcon}>{icon}</Text>
                <Text style={styles.slotMatName}>{material}</Text>
              </View>

              {equipped ? (
                <>
                  <ToolImage type={type} rarity={equipped.rarity} size={68} />
                  <Text style={[styles.equippedRarity, { color: rc }]} numberOfLines={1}>
                    {equipped.rarity}
                  </Text>
                  <Text style={styles.equippedToolName} numberOfLines={1}>
                    {TOOL_NAMES[type]}
                  </Text>
                  <Text style={styles.equippedStats}>
                    {equipped.effectMinBonus}–{equipped.effectMaxBonus} nodes · {equipped.effectChance}% +1 extra
                  </Text>
                  <Text style={styles.equippedStats}>
                    {equipped.passiveChance}% auto-sweep
                  </Text>
                  <View style={styles.slotBtnRow}>
                    <Pressable
                      style={styles.unequipBtn}
                      onPress={() => unequipGatheringTool(type)}
                    >
                      <Text style={styles.unequipTxt}>REMOVE</Text>
                    </Pressable>
                    {equipped.tradable && onListOnAh && (
                      <Pressable
                        style={[styles.ahSlotBtn, { borderColor: rc }]}
                        onPress={() => onListOnAh(equipped)}
                      >
                        <Text style={[styles.ahSlotTxt, { color: rc }]}>AH</Text>
                      </Pressable>
                    )}
                  </View>
                </>
              ) : (
                <View style={styles.emptySlot}>
                  <Text style={styles.emptySlotIcon}>{TOOL_ICONS[type]}</Text>
                  <Text style={styles.emptySlotTxt}>Empty</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* ── Tool bag ───────────────────────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>
        BAG {toolBag.length > 0 ? `(${toolBag.length})` : ""}
      </Text>

      {toolBag.length === 0 ? (
        <View style={styles.emptyBag}>
          <Text style={styles.emptyBagTxt}>No tools in bag.</Text>
          <Text style={styles.emptyBagSub}>
            Tools drop from monsters and chests (1% chance).
          </Text>
        </View>
      ) : (
        <View style={styles.bagList}>
          {toolBag.map((tool) => {
            const rc = TOOL_RARITY_COLORS[tool.rarity] ?? "#9CA3AF";
            const isSelected = selectedBagId === tool.id;
            return (
              <View key={tool.id} style={styles.bagItemWrap}>
                <Pressable
                  style={[
                    styles.bagItem,
                    { borderColor: isSelected ? rc + "dd" : rc + "55" },
                    isSelected && { backgroundColor: rc + "12" },
                  ]}
                  onPress={() => setSelectedBagId(isSelected ? null : tool.id)}
                >
                  <ToolImage type={tool.type} rarity={tool.rarity} size={52} compact />
                  <View style={styles.bagItemInfo}>
                    <Text style={[styles.bagItemRarity, { color: rc }]} numberOfLines={1}>
                      {formatToolName(tool)}
                    </Text>
                    <Text style={styles.bagItemMaterial}>
                      {TOOL_ICONS[tool.type]} {TOOL_MATERIAL_MAP[tool.type]}
                    </Text>
                    <Text style={styles.bagItemStats}>
                      {tool.effectMinBonus}–{tool.effectMaxBonus} nodes · {tool.effectChance}% +1 extra · {tool.passiveChance}% auto-sweep
                    </Text>
                  </View>
                  <Text style={styles.bagChevron}>{isSelected ? "▲" : "▼"}</Text>
                </Pressable>

                {isSelected && (
                  <View style={[styles.bagActions, { borderColor: rc + "44" }]}>
                    <View style={styles.bagActionRow}>
                      <Pressable
                        style={[styles.equipBtn, { borderColor: rc }]}
                        onPress={() => {
                          equipGatheringTool(tool);
                          setSelectedBagId(null);
                        }}
                      >
                        <Text style={[styles.equipBtnTxt, { color: rc }]}>EQUIP</Text>
                      </Pressable>
                      {tool.tradable && onListOnAh && (
                        <Pressable
                          style={styles.ahBagBtn}
                          onPress={() => {
                            onListOnAh(tool);
                            setSelectedBagId(null);
                          }}
                        >
                          <Text style={styles.ahBagTxt}>LIST ON AH</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 3,
    marginTop: 16,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 14,
  },
  slotCard: {
    width: "47%",
    backgroundColor: Colors.game.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    alignItems: "center",
    gap: 6,
  },
  slotHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "stretch",
  },
  slotMatIcon: { fontSize: 13 },
  slotMatName: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 2,
  },
  equippedRarity: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  equippedToolName: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textDim,
  },
  equippedStats: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textMuted,
    textAlign: "center",
  },
  slotBtnRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
    alignSelf: "stretch",
  },
  unequipBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.game.border,
    paddingVertical: 6,
    alignItems: "center",
  },
  unequipTxt: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 1,
  },
  ahSlotBtn: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  ahSlotTxt: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  emptySlot: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 6,
  },
  emptySlotIcon: { fontSize: 28, opacity: 0.3 },
  emptySlotTxt: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.game.border,
  },
  emptyBag: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 6,
    marginHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.game.surface,
    borderWidth: 1,
    borderColor: Colors.game.border,
    borderStyle: "dashed",
  },
  emptyBagTxt: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textDim,
  },
  emptyBagSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textMuted,
  },
  bagList: {
    paddingHorizontal: 14,
    gap: 8,
  },
  bagItemWrap: { gap: 0 },
  bagItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.game.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 10,
  },
  bagItemInfo: { flex: 1, gap: 2 },
  bagItemRarity: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  bagItemMaterial: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textDim,
  },
  bagItemStats: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textMuted,
  },
  bagChevron: {
    fontSize: 10,
    color: Colors.game.textMuted,
  },
  bagActions: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: Colors.game.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bagActionRow: {
    flexDirection: "row",
    gap: 8,
  },
  equipBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 10,
    alignItems: "center",
  },
  equipBtnTxt: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  ahBagBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.game.border,
    paddingVertical: 10,
    alignItems: "center",
  },
  ahBagTxt: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textDim,
    letterSpacing: 1,
  },
});
