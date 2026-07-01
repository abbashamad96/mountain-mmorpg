import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Colors from "@/constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { OrnatePanel, RivetFrame } from "@/components/ui";
import { Material, RARITY_COLORS, useGame } from "@/context/GameContext";
import {
  formatChestName,
  formatItemName,
  formatPotionName,
  GameItem,
  ItemChest,
  ITEM_QUALITY_COLORS,
  ITEM_RARITY_COLORS,
  ITEM_SLOT_ICONS,
  Potion,
} from "@/lib/items";
import {
  formatToolName,
  GatheringTool,
  TOOL_ICONS,
  TOOL_LEVEL_REQ,
  TOOL_MATERIAL_MAP,
  TOOL_RARITY_COLORS,
} from "@/lib/tools";
import { ChestImage } from "./ChestImage";
import { ItemBagModal } from "./ItemBagModal";
import { ItemImage } from "./ItemImage";
import { MaterialImage } from "./MaterialImage";
import { PotionBagModal } from "./PotionBagModal";
import { PotionImage } from "./PotionImage";
import { ToolImage } from "./ToolImage";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BattleDrop =
  | { type: "material"; material: Material; count: number }
  | { type: "item"; item: GameItem }
  | { type: "potion"; potion: Potion }
  | { type: "chest"; chest: ItemChest }
  | { type: "tool"; tool: GatheringTool };

interface BattleDropModalProps {
  visible: boolean;
  npcName: string;
  drops: BattleDrop[];
  onCollectAll: (handledIndices: Set<number>) => void;
  onClose: () => void;
  onListOnAh?: (drop: BattleDrop) => void;
  onListItemOnAh?: (item: GameItem) => void;
  onListPotionOnAh?: (potion: Potion) => void;
  onListToolOnAh?: (tool: GatheringTool) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function BattleDropModal({
  visible,
  npcName,
  drops,
  onCollectAll,
  onClose,
  onListOnAh,
  onListItemOnAh,
  onListPotionOnAh,
  onListToolOnAh,
}: BattleDropModalProps) {
  const {
    addItemToBag,
    addPotionToBag,
    addToolToBag,
    equipItem,
    removeItemFromBag,
    consumePotion,
    sellItemToNpc,
    equipGatheringTool,
    gameState,
  } = useGame();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  const handledRef = useRef<Set<number>>(new Set());
  const [handledDrops, setHandledDrops] = useState<Set<number>>(new Set());
  const [selectedItemDrop, setSelectedItemDrop] = useState<{ item: GameItem; idx: number } | null>(null);
  const [selectedPotionDrop, setSelectedPotionDrop] = useState<{ potion: Potion; idx: number } | null>(null);
  const [selectedToolDrop, setSelectedToolDrop] = useState<{ tool: GatheringTool; idx: number } | null>(null);

  function markHandled(idx: number) {
    const next = new Set([...handledRef.current, idx]);
    handledRef.current = next;
    setHandledDrops(next);
  }

  useEffect(() => {
    if (visible) {
      const empty = new Set<number>();
      handledRef.current = empty;
      setHandledDrops(empty);
      setSelectedItemDrop(null);
      setSelectedPotionDrop(null);
      setSelectedToolDrop(null);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.85);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 80 }),
      ]).start();
    }
  }, [visible]);

  if (!visible || drops.length === 0) return null;

  const playerLevel = gameState.character.level;

  return (
    <Modal transparent visible animationType="none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <View style={{ width: "100%", maxWidth: 420, alignSelf: "center" }}>
          <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }], flex: 1 }]}>
            <OrnatePanel accent={Colors.game.gold} glow padding={0} style={{ width: "100%", flex: 1 }} contentStyle={{ overflow: "hidden", flex: 1 }}>
            <View style={{ flex: 1 }}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.victoryLabel}>VICTORY</Text>
              <Text style={styles.npcName}>Defeated {npcName}</Text>
              <Text style={styles.lootLabel}>LOOT DROPPED</Text>
            </View>

          {/* Drops list */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ gap: 10, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {drops.map((drop, idx) => {
              const claimed = handledDrops.has(idx);

              if (drop.type === "material") {
                return (
                  <DropCard
                    key={idx}
                    drop={drop}
                    claimed={claimed}
                    onListOnAh={onListOnAh ? () => {
                      onCollectAll(handledRef.current);
                      onListOnAh(drop);
                    } : undefined}
                  />
                );
              }

              if (drop.type === "chest") {
                return (
                  <DropCard
                    key={idx}
                    drop={drop}
                    claimed={claimed}
                    onListOnAh={onListOnAh ? () => {
                      onCollectAll(handledRef.current);
                      onListOnAh(drop);
                    } : undefined}
                  />
                );
              }

              if (drop.type === "item") {
                return (
                  <DropCard
                    key={idx}
                    drop={drop}
                    claimed={claimed}
                    onPress={() => {
                      if (!handledRef.current.has(idx)) {
                        addItemToBag(drop.item);
                        markHandled(idx);
                      }
                      setSelectedItemDrop({ item: drop.item, idx });
                    }}
                  />
                );
              }

              if (drop.type === "potion") {
                return (
                  <DropCard
                    key={idx}
                    drop={drop}
                    claimed={claimed}
                    onPress={() => {
                      if (!handledRef.current.has(idx)) {
                        addPotionToBag(drop.potion);
                        markHandled(idx);
                      }
                      setSelectedPotionDrop({ potion: drop.potion, idx });
                    }}
                  />
                );
              }

              if (drop.type === "tool") {
                return (
                  <DropCard
                    key={idx}
                    drop={drop}
                    claimed={claimed}
                    onPress={() => {
                      if (!handledRef.current.has(idx)) {
                        addToolToBag(drop.tool);
                        markHandled(idx);
                      }
                      setSelectedToolDrop({ tool: drop.tool, idx });
                    }}
                  />
                );
              }

              return null;
            })}
          </ScrollView>

          {/* Footer */}
          <View style={styles.actions}>
            <Pressable style={styles.closeBtn} onPress={() => onCollectAll(handledRef.current)}>
              <Text style={styles.closeBtnText}>CLOSE</Text>
            </Pressable>
          </View>
          </View>
          </OrnatePanel>
          </Animated.View>
        </View>
      </Animated.View>

      {/* ── Item options ── */}
      {selectedItemDrop && (
        <ItemBagModal
          item={selectedItemDrop.item}
          onClose={() => setSelectedItemDrop(null)}
          onEquip={() => {
            equipItem(selectedItemDrop.item);
            removeItemFromBag(selectedItemDrop.item.id);
            setSelectedItemDrop(null);
          }}
          onSalvage={() => setSelectedItemDrop(null)}
          onSellToNpc={() => {
            sellItemToNpc(selectedItemDrop.item.id);
            setSelectedItemDrop(null);
          }}
          onSellOnAh={onListItemOnAh && selectedItemDrop.item.tradable ? () => {
            const item = selectedItemDrop.item;
            setSelectedItemDrop(null);
            onCollectAll(handledRef.current);
            onListItemOnAh(item);
          } : undefined}
        />
      )}

      {/* ── Potion options ── */}
      {selectedPotionDrop && (
        <PotionBagModal
          potion={selectedPotionDrop.potion}
          onClose={() => setSelectedPotionDrop(null)}
          onConsume={() => {
            consumePotion(selectedPotionDrop.potion);
            setSelectedPotionDrop(null);
          }}
          onSellOnAh={onListPotionOnAh && selectedPotionDrop.potion.tradable ? () => {
            const potion = selectedPotionDrop.potion;
            setSelectedPotionDrop(null);
            onCollectAll(handledRef.current);
            onListPotionOnAh(potion);
          } : undefined}
        />
      )}

      {/* ── Tool options ── */}
      {selectedToolDrop && (() => {
        const { tool } = selectedToolDrop;
        const rc = TOOL_RARITY_COLORS[tool.rarity] ?? "#9CA3AF";
        const req = tool.levelRequirement ?? TOOL_LEVEL_REQ[tool.rarity] ?? 0;
        const meetsLevel = playerLevel >= req;
        return (
          <Modal transparent visible animationType="fade" onRequestClose={() => setSelectedToolDrop(null)}>
            <Pressable style={styles.overlay} onPress={() => setSelectedToolDrop(null)}>
              <Pressable style={[styles.toolCard, { borderColor: rc + "88" }]} onPress={e => e.stopPropagation()}>
                <ToolImage type={tool.type} rarity={tool.rarity} size={72} compact />
                <Text style={[styles.toolName, { color: rc }]} numberOfLines={1}>{formatToolName(tool)}</Text>
                <View style={styles.toolTagRow}>
                  <View style={[styles.toolTag, { borderColor: rc }]}>
                    <Text style={[styles.toolTagTxt, { color: rc }]}>{tool.rarity.toUpperCase()}</Text>
                  </View>
                  <View style={[styles.toolTag, { borderColor: "#555" }]}>
                    <Text style={[styles.toolTagTxt, { color: "#aaa" }]}>
                      {TOOL_ICONS[tool.type]} {TOOL_MATERIAL_MAP[tool.type]}
                    </Text>
                  </View>
                </View>
                <Text style={styles.toolStats}>
                  {tool.effectChance}% +{tool.effectMinBonus}–{tool.effectMaxBonus} mats  ·  {tool.passiveChance}% sweep
                </Text>
                {req > 0 && (
                  <Text style={[styles.toolReq, !meetsLevel && styles.toolReqFail]}>
                    Req. Lv {req}{meetsLevel ? " ✓" : " ✗"}
                  </Text>
                )}
                <View style={styles.toolActions}>
                  <Pressable
                    style={[styles.toolActionBtn, meetsLevel ? { borderColor: rc, backgroundColor: rc + "22" } : styles.toolBtnDim]}
                    onPress={meetsLevel ? () => {
                      equipGatheringTool(tool);
                      setSelectedToolDrop(null);
                    } : undefined}
                    disabled={!meetsLevel}
                  >
                    <Text style={[styles.toolActionTxt, { color: meetsLevel ? rc : Colors.game.textMuted }]}>
                      {meetsLevel ? "EQUIP" : `LV ${req} REQ`}
                    </Text>
                  </Pressable>
                  {tool.tradable && onListToolOnAh && (
                    <Pressable
                      style={[styles.toolActionBtn, styles.toolAhBtn]}
                      onPress={() => {
                        const t = tool;
                        setSelectedToolDrop(null);
                        onCollectAll(handledRef.current);
                        onListToolOnAh(t);
                      }}
                    >
                      <Text style={styles.toolAhTxt}>LIST ON AH</Text>
                    </Pressable>
                  )}
                </View>
                <Pressable style={styles.toolCloseBtn} onPress={() => setSelectedToolDrop(null)}>
                  <Text style={styles.toolCloseTxt}>CLOSE</Text>
                </Pressable>
              </Pressable>
            </Pressable>
          </Modal>
        );
      })()}
    </Modal>
  );
}

// ─── Drop Card ──────────────────────────────────────────────────────────────

function DropCard({
  drop,
  onListOnAh,
  onPress,
  claimed,
}: {
  drop: BattleDrop;
  onListOnAh?: () => void;
  onPress?: () => void;
  claimed?: boolean;
}) {
  if (drop.type === "material") {
    const rc = RARITY_COLORS[drop.material.rarity];
    return (
      <View style={[styles.dropCard, { borderColor: rc + "55" }]}>
        <View style={styles.dropRow}>
          <MaterialImage
            type={drop.material.type}
            rarity={drop.material.rarity}
            version={drop.material.version}
            size={56}
            compact
            animateParticles={false}
          />
          <View style={styles.dropInfo}>
            <Text style={[styles.dropName, { color: rc }]}>
              {drop.material.rarity} {drop.material.type}
            </Text>
            <Text style={styles.dropMeta}>
              {drop.count > 1 ? `\u00d7${drop.count}  \u00b7  ` : ""}
              T{drop.material.version}
            </Text>
          </View>
          {drop.count > 1 && (
            <Text style={[styles.dropCount, { color: rc }]}>\u00d7{drop.count}</Text>
          )}
        </View>
        {onListOnAh && (
          <Pressable style={styles.ahCardBtn} onPress={onListOnAh}>
            <Text style={styles.ahCardBtnTxt}>🛒  LIST ON AH</Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (drop.type === "item") {
    const rc = ITEM_RARITY_COLORS[drop.item.rarity];
    const qc = ITEM_QUALITY_COLORS[drop.item.quality];
    const hasStats = Object.values(drop.item.stats).some((v) => v > 0) ||
      Object.values(drop.item.percentStats).some((v) => v > 0);
    return (
      <Pressable style={[styles.dropCard, { borderColor: rc + "55" }]} onPress={onPress}>
        {claimed && (
          <View style={styles.claimedBadge}>
            <Text style={styles.claimedTxt}>✓ IN BAG</Text>
          </View>
        )}
        <View style={styles.dropRow}>
          <ItemImage
            slot={drop.item.slot}
            rarity={drop.item.rarity}
            quality={drop.item.quality}
            tier={drop.item.tier}
            size={56}
          />
          <View style={styles.dropInfo}>
            <Text style={[styles.dropName, { color: rc }]} numberOfLines={1}>
              {formatItemName(drop.item)}
            </Text>
            <Text style={styles.dropMeta}>
              {ITEM_SLOT_ICONS[drop.item.slot]} {drop.item.slot}
              {drop.item.quality !== "Basic" ? `  \u00b7  ${qc}${drop.item.quality}` : ""}
            </Text>
          </View>
        </View>
        {hasStats && (
          <View style={styles.statRow}>
            {Object.entries(drop.item.stats).map(([k, v]) =>
              v > 0 ? (
                <Text key={k} style={styles.statText}>+{v} {k}</Text>
              ) : null
            )}
            {Object.entries(drop.item.percentStats).map(([k, v]) =>
              v > 0 ? (
                <Text key={`pct-${k}`} style={styles.statText}>+{(v * 100).toFixed(0)}% {k}</Text>
              ) : null
            )}
          </View>
        )}
        {!claimed && (
          <View style={styles.tapHint}>
            <Text style={styles.tapHintTxt}>TAP TO MANAGE →</Text>
          </View>
        )}
      </Pressable>
    );
  }

  if (drop.type === "potion") {
    const rc = ITEM_RARITY_COLORS[drop.potion.rarity];
    return (
      <Pressable style={[styles.dropCard, { borderColor: rc + "55" }]} onPress={onPress}>
        {claimed && (
          <View style={styles.claimedBadge}>
            <Text style={styles.claimedTxt}>✓ IN BAG</Text>
          </View>
        )}
        <View style={styles.dropRow}>
          <PotionImage type={drop.potion.type} rarity={drop.potion.rarity} tier={drop.potion.tier} size={56} compact />
          <View style={styles.dropInfo}>
            <Text style={[styles.dropName, { color: rc }]} numberOfLines={1}>
              {formatPotionName(drop.potion)}
            </Text>
            <Text style={styles.dropMeta}>
              {drop.potion.type} Potion  ·  T{drop.potion.tier}
            </Text>
          </View>
        </View>
        {!claimed && (
          <View style={styles.tapHint}>
            <Text style={styles.tapHintTxt}>TAP TO MANAGE →</Text>
          </View>
        )}
      </Pressable>
    );
  }

  if (drop.type === "chest") {
    const rc = ITEM_RARITY_COLORS[drop.chest.rarity];
    return (
      <View style={[styles.dropCard, { borderColor: rc + "55" }]}>
        <View style={styles.dropRow}>
          <ChestImage rarity={drop.chest.rarity} size={56} />
          <View style={styles.dropInfo}>
            <Text style={[styles.dropName, { color: rc }]} numberOfLines={1}>
              {formatChestName(drop.chest)}
            </Text>
            <Text style={styles.dropMeta}>T{drop.chest.tier}  ·  Added to bag</Text>
          </View>
        </View>
        {onListOnAh && (
          <Pressable style={styles.ahCardBtn} onPress={onListOnAh}>
            <Text style={styles.ahCardBtnTxt}>🛒  LIST ON AH</Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (drop.type === "tool") {
    const rc = TOOL_RARITY_COLORS[drop.tool.rarity] ?? "#9CA3AF";
    return (
      <Pressable style={[styles.dropCard, { borderColor: rc + "55" }]} onPress={onPress}>
        {claimed && (
          <View style={styles.claimedBadge}>
            <Text style={styles.claimedTxt}>✓ IN BAG</Text>
          </View>
        )}
        <View style={styles.dropRow}>
          <ToolImage type={drop.tool.type} rarity={drop.tool.rarity} size={56} compact />
          <View style={styles.dropInfo}>
            <Text style={[styles.dropName, { color: rc }]} numberOfLines={1}>
              {formatToolName(drop.tool)}
            </Text>
            <Text style={styles.dropMeta}>
              {TOOL_ICONS[drop.tool.type]} Gathers {TOOL_MATERIAL_MAP[drop.tool.type]}
            </Text>
            <Text style={styles.dropMeta}>
              {drop.tool.effectChance}% +{drop.tool.effectMinBonus}–{drop.tool.effectMaxBonus} mats  ·  {drop.tool.passiveChance}% sweep
            </Text>
          </View>
          <View style={[styles.toolBadge, { borderColor: rc }]}>
            <Text style={[styles.toolBadgeTxt, { color: rc }]}>TOOL</Text>
          </View>
        </View>
        {!claimed && (
          <View style={styles.tapHint}>
            <Text style={styles.tapHintTxt}>TAP TO MANAGE →</Text>
          </View>
        )}
      </Pressable>
    );
  }

  return null;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.86)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "80%",
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.game.border,
    overflow: "hidden",
  },
  header: {
    alignItems: "center",
    paddingTop: 22,
    paddingBottom: 14,
    paddingHorizontal: 20,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.game.border,
  },
  victoryLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.game.gold,
    letterSpacing: 4,
  },
  npcName: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.game.text,
  },
  lootLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textMuted,
    letterSpacing: 2,
  },
  scroll: {
    maxHeight: 280,
    padding: 14,
  },
  dropCard: {
    backgroundColor: Colors.game.surface,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  dropRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dropInfo: {
    flex: 1,
    gap: 3,
  },
  dropName: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  dropMeta: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textMuted,
  },
  dropCount: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  statRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  statText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textDim,
  },
  toolBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  toolBadgeTxt: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  actions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.game.border,
  },
  closeBtn: {
    borderWidth: 1,
    borderColor: Colors.game.border,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  closeBtnText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 2,
  },
  ahCardBtn: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.game.blue + "88",
    borderRadius: 10,
    paddingVertical: 7,
    alignItems: "center",
    backgroundColor: Colors.game.blue + "11",
  },
  ahCardBtnTxt: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.game.blue,
    letterSpacing: 1,
  },
  claimedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: Colors.game.green + "33",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.game.green + "66",
    zIndex: 1,
  },
  claimedTxt: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: Colors.game.green,
    letterSpacing: 0.5,
  },
  tapHint: {
    alignItems: "flex-end",
  },
  tapHintTxt: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.game.textMuted,
    letterSpacing: 0.5,
  },
  toolCard: {
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 20,
    borderWidth: 2,
    padding: 20,
    width: "90%",
    maxWidth: 340,
    alignItems: "center",
    gap: 10,
  },
  toolName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  toolTagRow: {
    flexDirection: "row",
    gap: 8,
  },
  toolTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  toolTagTxt: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  toolStats: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.game.textDim,
    textAlign: "center",
  },
  toolReq: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.game.green,
  },
  toolReqFail: {
    color: "#F87171",
  },
  toolActions: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  toolActionBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 10,
    alignItems: "center",
  },
  toolActionTxt: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  toolBtnDim: {
    opacity: 0.4,
    borderColor: Colors.game.border,
  },
  toolAhBtn: {
    borderColor: Colors.game.gold,
    backgroundColor: "rgba(201,168,76,0.10)",
  },
  toolAhTxt: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.game.gold,
    letterSpacing: 1.5,
  },
  toolCloseBtn: {
    width: "100%",
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    backgroundColor: Colors.game.surface,
    borderWidth: 1,
    borderColor: Colors.game.border,
  },
  toolCloseTxt: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted,
    letterSpacing: 2,
  },
});
