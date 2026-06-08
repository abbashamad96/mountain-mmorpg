import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { ITEM_RARITIES, ITEM_RARITY_COLORS, formatItemName, formatPotionName } from "@/lib/items";
import { TOOL_NAMES } from "@/lib/tools";
import {
  CraftResult, CRAFTING_MATERIALS_NEEDED, CRAFTING_UNLOCK_LEVELS,
  CRAFTING_XP_REWARDS, getXpToNextCraftingLevel, CRAFTING_MAX_LEVEL,
  CRAFTING_ENERGY_COST, CRAFTING_DURATION_MS, CRAFTING_MAX_ENERGY,
  CRAFTING_ENERGY_REGEN_MS,
} from "@/lib/crafting";
import { useGame } from "@/context/GameContext";
import { RarityName, VersionNum, RARITY_COLORS } from "@/context/GameContext";
import { GameItem, Potion } from "@/lib/items";
import { ItemBagModal } from "./ItemBagModal";
import { ItemImage } from "./ItemImage";
import { PotionBagModal } from "./PotionBagModal";
import { PotionImage } from "./PotionImage";
import { ToolImage } from "./ToolImage";
import { MaterialImage } from "./MaterialImage";

// ─── Constants ────────────────────────────────────────────────────────────────

const TIERS: VersionNum[] = [0, 1, 2, 3];
const MATERIAL_TYPES = ["Wood", "Ore", "Herb", "Leather"] as const;
type MaterialType = typeof MATERIAL_TYPES[number];

const RARITY_ABBR: Record<RarityName, string> = {
  Common: "C", Uncommon: "U", Rare: "R", Epic: "E",
  Elite: "EL", Legendary: "L", Superior: "S", Cosmic: "CS",
};

function formatCountdown(ms: number): string {
  const secs = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(secs / 60);
  const s = String(secs % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function XpBar({ current, total, level }: { current: number; total: number; level: number }) {
  const pct = total > 0 ? Math.min(1, current / total) : 1;
  return (
    <View style={xpS.wrap}>
      <View style={xpS.track}>
        <View style={[xpS.fill, { width: `${pct * 100}%` as any }]} />
      </View>
      <Text style={xpS.label}>
        {level >= CRAFTING_MAX_LEVEL
          ? "MAX LEVEL"
          : `${current.toLocaleString()} / ${total.toLocaleString()} XP`}
      </Text>
    </View>
  );
}
const xpS = StyleSheet.create({
  wrap: { gap: 3 },
  track: { height: 6, backgroundColor: Colors.game.border, borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", backgroundColor: Colors.game.blue, borderRadius: 3 },
  label: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.game.textDim, textAlign: "right" },
});

function EnergyBar({ energy, lastRegen, now }: { energy: number; lastRegen: number; now: number }) {
  const msUntil = lastRegen + CRAFTING_ENERGY_REGEN_MS - now;
  const secs = Math.max(0, Math.ceil(msUntil / 1000));
  const m = Math.floor(secs / 60);
  const ss = String(secs % 60).padStart(2, "0");
  const label = energy >= CRAFTING_MAX_ENERGY ? "Full" : `+1 in ${m}:${ss}`;
  return (
    <View style={eS.row}>
      <Text style={eS.label}>⚡ ENERGY</Text>
      <View style={eS.dots}>
        {Array.from({ length: CRAFTING_MAX_ENERGY }).map((_, i) => (
          <View key={i} style={[eS.dot, i < energy ? eS.dotFull : eS.dotEmpty]} />
        ))}
      </View>
      <Text style={eS.regen}>{label}</Text>
    </View>
  );
}
const eS = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontSize: 10, fontFamily: "Inter_700Bold", color: Colors.game.textMuted, letterSpacing: 1 },
  dots: { flexDirection: "row", gap: 4 },
  dot: { width: 13, height: 13, borderRadius: 7, borderWidth: 1.5 },
  dotFull: { backgroundColor: Colors.game.gold, borderColor: Colors.game.gold },
  dotEmpty: { backgroundColor: "transparent", borderColor: Colors.game.border },
  regen: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.game.textMuted },
});

function ResultCard({ result, onPress }: { result: CraftResult; onPress?: () => void }) {
  const rarity =
    result.item?.rarity ?? result.potion?.rarity ?? result.tool?.rarity ?? "Common";
  const rc = ITEM_RARITY_COLORS[rarity as keyof typeof ITEM_RARITY_COLORS];
  let label = "";
  let sub = "";
  if (result.kind === "equipment" && result.item) {
    label = formatItemName(result.item);
    sub = `${result.item.quality} · ${result.item.slot}`;
  } else if (result.kind === "potion" && result.potion) {
    label = formatPotionName(result.potion);
    sub = `+${result.potion.effectPercent}% · ${Math.floor(result.potion.durationSeconds / 60)}m`;
  } else if (result.kind === "tool" && result.tool) {
    label = `${rarity} ${TOOL_NAMES[result.tool.type]}`;
    sub = `${result.tool.effectMinBonus}–${result.tool.effectMaxBonus} nodes`;
  }
  const manageable = result.kind === "equipment" || result.kind === "potion";
  return (
    <Pressable style={[rcS.card, { borderColor: rc + "55" }]} onPress={manageable ? onPress : undefined}>
      <View style={rcS.img}>
        {result.kind === "equipment" && result.item && (
          <ItemImage slot={result.item.slot} rarity={result.item.rarity} tier={result.item.tier} quality={result.item.quality} size={40} />
        )}
        {result.kind === "potion" && result.potion && (
          <PotionImage type={result.potion.type as any} rarity={result.potion.rarity as any} tier={result.potion.tier as any} size={40} />
        )}
        {result.kind === "tool" && result.tool && (
          <ToolImage type={result.tool.type} rarity={result.tool.rarity} size={40} />
        )}
      </View>
      <View style={rcS.info}>
        <Text style={[rcS.label, { color: rc }]} numberOfLines={1}>{label}</Text>
        <Text style={rcS.sub}>{sub}</Text>
      </View>
      {manageable && onPress && (
        <Text style={rcS.tapHint}>TAP →</Text>
      )}
    </Pressable>
  );
}
const rcS = StyleSheet.create({
  card: { flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: Colors.game.surface, borderRadius: 8, borderWidth: 1, padding: 8, marginTop: 6 },
  img: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  info: { flex: 1, gap: 2 },
  label: { fontSize: 12, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.game.textDim },
  tapHint: { fontSize: 9, fontFamily: "Inter_500Medium", color: Colors.game.textMuted },
});

// ─── Main modal ───────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
  onListItemOnAh?: (item: GameItem) => void;
  onListPotionOnAh?: (potion: Potion) => void;
}

const INITIAL_ALLOCATION: Record<MaterialType, number> = { Wood: 0, Ore: 0, Herb: 0, Leather: 0 };

export function CraftingModal({ visible, onClose, onListItemOnAh, onListPotionOnAh }: Props) {
  const { gameState, startCraftingJob, collectCraftBatch, regenCraftingEnergy, checkCraftingJobs, equipItem, removeItemFromBag, salvageItem, sellItemToNpc, consumePotion } = useGame();
  const char = gameState.character;
  const skill = char.craftingSkill;

  const [selectedRarity, setSelectedRarity] = useState<RarityName>("Common");
  const [selectedTier, setSelectedTier] = useState<VersionNum>(0);
  const [allocation, setAllocation] = useState<Record<MaterialType, number>>({ ...INITIAL_ALLOCATION });
  const [now, setNow] = useState(Date.now());
  const [lastCollected, setLastCollected] = useState<CraftResult[] | null>(null);
  const [selectedCraftResult, setSelectedCraftResult] = useState<CraftResult | null>(null);

  useEffect(() => {
    if (!visible) return;
    regenCraftingEnergy();
    checkCraftingJobs();
    const id = setInterval(() => {
      setNow(Date.now());
      checkCraftingJobs();
      regenCraftingEnergy();
    }, 1000);
    return () => clearInterval(id);
  }, [visible, regenCraftingEnergy, checkCraftingJobs]);

  const resetAllocation = useCallback(() => {
    setAllocation({ ...INITIAL_ALLOCATION });
    setLastCollected(null);
  }, []);

  const handleSelectRarity = useCallback((r: RarityName) => {
    setSelectedRarity(r);
    resetAllocation();
  }, [resetAllocation]);

  const handleSelectTier = useCallback((t: VersionNum) => {
    setSelectedTier(t);
    resetAllocation();
  }, [resetAllocation]);

  const xpToNext = getXpToNextCraftingLevel(skill.level);
  const needed = CRAFTING_MATERIALS_NEEDED[selectedRarity];
  const unlockLevel = CRAFTING_UNLOCK_LEVELS[selectedRarity];
  const isRarityUnlocked = skill.level >= unlockLevel;
  const energyCost = CRAFTING_ENERGY_COST[selectedRarity];
  const durationMs = CRAFTING_DURATION_MS[selectedRarity];

  const matByType = useMemo(() => {
    const counts: Record<string, number> = { Wood: 0, Ore: 0, Herb: 0, Leather: 0 };
    for (const e of char.materials) {
      if (e.material.rarity === selectedRarity && e.material.version === selectedTier) {
        counts[e.material.type] = (counts[e.material.type] ?? 0) + e.count;
      }
    }
    return counts;
  }, [char.materials, selectedRarity, selectedTier]);

  const totalAllocated = MATERIAL_TYPES.reduce((sum, t) => sum + (allocation[t] ?? 0), 0);
  const activeJobs = char.craftingJobs ?? [];
  const pendingBatches = char.pendingCraftBatches ?? [];

  const hasActiveJob = activeJobs.length >= 1;
  const canCraft =
    isRarityUnlocked &&
    !hasActiveJob &&
    totalAllocated === needed &&
    char.craftingEnergy >= energyCost;

  const adjustAllocation = useCallback((type: MaterialType, delta: number) => {
    setAllocation((prev) => {
      const current = prev[type] ?? 0;
      const avail = matByType[type] ?? 0;
      const remaining = needed - totalAllocated;
      let next = current + delta;
      if (delta > 0) {
        next = Math.min(current + delta, current + remaining, avail);
      } else {
        next = Math.max(0, next);
      }
      if (next === current) return prev;
      return { ...prev, [type]: next };
    });
  }, [matByType, needed, totalAllocated]);

  const handleCraft = () => {
    if (!canCraft) return;
    const ok = startCraftingJob(selectedRarity, selectedTier, allocation as Record<string, number>);
    if (ok) {
      setAllocation({ ...INITIAL_ALLOCATION });
      setLastCollected(null);
    }
  };

  const handleCollect = (batchId: string) => {
    const results = collectCraftBatch(batchId);
    setLastCollected(results);
  };

  const rc = RARITY_COLORS[selectedRarity];

  return (
    <>
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>

          {/* ── Header ── */}
          <View style={s.header}>
            <Text style={s.title}>⚗ Crafting</Text>
            <View style={s.levelBadge}>
              <Text style={s.levelText}>Lv {skill.level}</Text>
            </View>
            <Pressable onPress={onClose} style={s.closeBtn} hitSlop={10}>
              <Feather name="x" size={20} color={Colors.game.textDim} />
            </Pressable>
          </View>

          {/* ── XP + Energy ── */}
          <View style={s.topSection}>
            <XpBar current={skill.xp} total={xpToNext} level={skill.level} />
            <EnergyBar energy={char.craftingEnergy} lastRegen={char.energyLastRegen || now} now={now} />
          </View>

          <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

            {/* ── Active Jobs ── */}
            {activeJobs.length > 0 && (
              <>
                <Text style={s.sectionLabel}>CRAFTING</Text>
                {activeJobs.map((job) => {
                  const msLeft = job.completesAt - now;
                  const prog = Math.min(1, Math.max(0, 1 - msLeft / (job.completesAt - job.startedAt)));
                  const jrc = RARITY_COLORS[job.rarity as RarityName];
                  return (
                    <View key={job.id} style={[s.jobCard, { borderColor: jrc + "44" }]}>
                      <View style={s.jobInfo}>
                        <Text style={[s.jobRarity, { color: jrc }]}>{job.rarity} T{job.tier}</Text>
                        <Text style={s.jobMat}>{job.materialType}</Text>
                      </View>
                      <Text style={[s.jobTimer, msLeft <= 0 && { color: Colors.game.green }]}>
                        {msLeft > 0 ? formatCountdown(msLeft) : "READY"}
                      </Text>
                      <View style={s.jobProgress}>
                        <View style={[s.jobProgressFill, { width: `${prog * 100}%` as any, backgroundColor: jrc }]} />
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            {/* ── Ready to Collect ── */}
            {pendingBatches.length > 0 && (
              <>
                <Text style={[s.sectionLabel, { marginTop: activeJobs.length > 0 ? 14 : 0, color: Colors.game.green }]}>
                  READY TO COLLECT
                </Text>
                {pendingBatches.map((batch) => {
                  const brc = RARITY_COLORS[batch.rarity as RarityName];
                  return (
                    <View key={batch.id} style={[s.batchCard, { borderColor: brc + "55" }]}>
                      <View style={s.batchInfo}>
                        <Text style={[s.batchRarity, { color: brc }]}>{batch.rarity} T{batch.tier}</Text>
                        <Text style={s.batchSub}>Crafting complete!</Text>
                      </View>
                      <Pressable style={[s.collectBtn, { borderColor: brc }]} onPress={() => handleCollect(batch.id)}>
                        <Text style={[s.collectBtnTxt, { color: brc }]}>COLLECT</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </>
            )}

            {/* ── Collected results ── */}
            {lastCollected && lastCollected.length > 0 && (
              <>
                <Text style={[s.sectionLabel, { color: Colors.game.gold, marginTop: 14 }]}>
                  COLLECTED ({lastCollected.length})
                </Text>
                {lastCollected.map((r, i) => (
                  <ResultCard key={i} result={r} onPress={() => setSelectedCraftResult(r)} />
                ))}
              </>
            )}

            {(activeJobs.length > 0 || pendingBatches.length > 0 || (lastCollected && lastCollected.length > 0)) && (
              <View style={s.divider} />
            )}

            {/* ── Rarity selector ── */}
            <Text style={s.sectionLabel}>RARITY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rarityRow}>
              {(ITEM_RARITIES as RarityName[]).map((r) => {
                const unlocked = skill.level >= CRAFTING_UNLOCK_LEVELS[r];
                const color = RARITY_COLORS[r];
                const active = selectedRarity === r;
                return (
                  <Pressable
                    key={r}
                    style={[
                      s.rarityBtn,
                      active && { borderColor: color, backgroundColor: color + "22" },
                      !active && { borderColor: Colors.game.border },
                      !unlocked && s.rarityBtnLocked,
                    ]}
                    onPress={() => handleSelectRarity(r)}
                  >
                    <Text style={[s.rarityBtnLabel, { color: unlocked ? color : Colors.game.textMuted }]}>
                      {RARITY_ABBR[r]}
                    </Text>
                    {!unlocked && <Text style={s.lockText}>L{CRAFTING_UNLOCK_LEVELS[r]}</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* ── Tier selector ── */}
            <Text style={[s.sectionLabel, { marginTop: 10 }]}>TIER</Text>
            <View style={s.tierRow}>
              {TIERS.map((t) => (
                <Pressable
                  key={t}
                  style={[
                    s.tierBtn,
                    selectedTier === t && { borderColor: rc, backgroundColor: rc + "22" },
                    selectedTier !== t && { borderColor: Colors.game.border },
                  ]}
                  onPress={() => handleSelectTier(t)}
                >
                  <Text style={[s.tierBtnText, { color: selectedTier === t ? rc : Colors.game.textDim }]}>T{t}</Text>
                </Pressable>
              ))}
            </View>

            {/* ── 1-craft-at-a-time notice ── */}
            {hasActiveJob && (
              <View style={s.busyNotice}>
                <Feather name="clock" size={14} color={Colors.game.textMuted} />
                <Text style={s.busyText}>Crafting slot busy — collect current craft first</Text>
              </View>
            )}

            {/* ── Material allocation ── */}
            {isRarityUnlocked && !hasActiveJob && (
              <>
                <View style={s.allocHeader}>
                  <Text style={[s.sectionLabel, { marginBottom: 0 }]}>MATERIALS</Text>
                  <View style={[s.allocProgress, totalAllocated === needed && s.allocProgressFull]}>
                    <Text style={[s.allocProgressTxt, { color: totalAllocated === needed ? Colors.game.green : rc }]}>
                      {totalAllocated} / {needed}
                    </Text>
                  </View>
                </View>

                <View style={s.allocGrid}>
                  {MATERIAL_TYPES.map((type) => {
                    const avail = matByType[type] ?? 0;
                    const qty = allocation[type] ?? 0;
                    const canAdd = qty < avail && totalAllocated < needed;
                    const canSub = qty > 0;

                    return (
                      <View key={type} style={[s.allocRow, avail === 0 && s.allocRowDisabled]}>
                        <MaterialImage
                          type={type as any}
                          rarity={selectedRarity}
                          version={selectedTier}
                          size={50}
                          compact
                          animateParticles={false}
                        />
                        <View style={s.allocInfo}>
                          <Text style={[s.allocType, { color: avail > 0 ? rc : Colors.game.textMuted }]}>
                            {type}
                          </Text>
                          <Text style={s.allocAvail}>
                            {avail > 0 ? `${avail} available` : "none available"}
                          </Text>
                        </View>
                        <View style={s.allocStepper}>
                          <Pressable
                            style={[s.stepBtn, !canSub && s.stepBtnDisabled]}
                            onPress={canSub ? () => adjustAllocation(type, -1) : undefined}
                            disabled={!canSub}
                          >
                            <Text style={[s.stepBtnTxt, !canSub && { color: Colors.game.textMuted }]}>−</Text>
                          </Pressable>
                          <Text style={[s.stepQty, { color: qty > 0 ? rc : Colors.game.textMuted }]}>
                            {qty}
                          </Text>
                          <Pressable
                            style={[s.stepBtn, !canAdd && s.stepBtnDisabled]}
                            onPress={canAdd ? () => adjustAllocation(type, 1) : undefined}
                            disabled={!canAdd}
                          >
                            <Text style={[s.stepBtnTxt, !canAdd && { color: Colors.game.textMuted }]}>+</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {/* ── Cost summary + Craft button ── */}
            {isRarityUnlocked && !hasActiveJob && totalAllocated > 0 && (
              <View style={[s.costPanel, { borderColor: rc + "33" }]}>
                <View style={s.costRow}>
                  <Text style={s.costLabel}>Energy</Text>
                  <Text style={[s.costVal, char.craftingEnergy < energyCost && { color: "#F87171" }]}>
                    ⚡ {energyCost} (have {char.craftingEnergy})
                  </Text>
                </View>
                <View style={s.costRow}>
                  <Text style={s.costLabel}>Duration</Text>
                  <Text style={s.costVal}>⏱ {durationMs / 60_000} min</Text>
                </View>
                <View style={s.costRow}>
                  <Text style={s.costLabel}>XP reward</Text>
                  <Text style={[s.costVal, { color: Colors.game.blue }]}>+{CRAFTING_XP_REWARDS[selectedRarity]} crafting XP</Text>
                </View>
              </View>
            )}

            {!isRarityUnlocked ? (
              <View style={s.lockedNotice}>
                <Feather name="lock" size={16} color={Colors.game.textMuted} />
                <Text style={s.lockedText}>Reach crafting level {unlockLevel} to unlock {selectedRarity} crafting</Text>
              </View>
            ) : !hasActiveJob && (
              <Pressable
                style={[
                  s.craftBtn,
                  canCraft
                    ? { borderColor: rc, backgroundColor: rc + "22" }
                    : { borderColor: Colors.game.border, opacity: 0.5 },
                ]}
                onPress={handleCraft}
                disabled={!canCraft}
              >
                <Text style={[s.craftBtnText, { color: canCraft ? rc : Colors.game.textMuted }]}>
                  {canCraft
                    ? `⚗  CRAFT`
                    : char.craftingEnergy < energyCost
                      ? `Need ⚡${energyCost} energy (have ${char.craftingEnergy})`
                      : totalAllocated < needed
                        ? `Allocate ${needed} materials (${totalAllocated}/${needed})`
                        : "Insufficient materials"}
                </Text>
              </Pressable>
            )}

          </ScrollView>
        </View>
      </View>
    </Modal>

    {selectedCraftResult?.kind === "equipment" && selectedCraftResult.item && (
      <ItemBagModal
        item={selectedCraftResult.item}
        onClose={() => setSelectedCraftResult(null)}
        onEquip={() => {
          const item = selectedCraftResult.item!;
          equipItem(item);
          removeItemFromBag(item.id);
          setSelectedCraftResult(null);
        }}
        onSalvage={() => {
          salvageItem(selectedCraftResult.item!.id);
          setSelectedCraftResult(null);
        }}
        onSellToNpc={() => {
          sellItemToNpc(selectedCraftResult.item!.id);
          setSelectedCraftResult(null);
        }}
        onSellOnAh={onListItemOnAh && selectedCraftResult.item.tradable ? () => {
          const item = selectedCraftResult.item!;
          setSelectedCraftResult(null);
          onListItemOnAh(item);
        } : undefined}
      />
    )}

    {selectedCraftResult?.kind === "potion" && selectedCraftResult.potion && (
      <PotionBagModal
        potion={selectedCraftResult.potion}
        onClose={() => setSelectedCraftResult(null)}
        onConsume={() => {
          consumePotion(selectedCraftResult.potion!);
          setSelectedCraftResult(null);
        }}
        onSellOnAh={onListPotionOnAh && selectedCraftResult.potion.tradable ? () => {
          const potion = selectedCraftResult.potion!;
          setSelectedCraftResult(null);
          onListPotionOnAh(potion);
        } : undefined}
      />
    )}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "#000000AA", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.game.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 1, borderColor: Colors.game.border,
    maxHeight: "92%",
  },

  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.game.border,
  },
  title: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.game.text, flex: 1 },
  levelBadge: {
    backgroundColor: Colors.game.blue + "22",
    borderRadius: 8, borderWidth: 1, borderColor: Colors.game.blue + "55",
    paddingHorizontal: 8, paddingVertical: 3,
  },
  levelText: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.game.blue },
  closeBtn: { padding: 2 },

  topSection: {
    paddingHorizontal: 18, paddingVertical: 10, gap: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.game.border,
  },

  scroll: { flex: 1 },
  scrollContent: { padding: 18, paddingBottom: 40 },

  sectionLabel: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 1,
    marginBottom: 6,
  },
  divider: { height: 1, backgroundColor: Colors.game.border, marginVertical: 16 },

  // Active job cards
  jobCard: {
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 10, borderWidth: 1,
    padding: 10, marginBottom: 8, gap: 6, overflow: "hidden",
  },
  jobInfo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  jobRarity: { fontSize: 12, fontFamily: "Inter_700Bold" },
  jobMat: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.game.textDim },
  jobTimer: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.game.text, textAlign: "right" },
  jobProgress: {
    height: 4, backgroundColor: Colors.game.border, borderRadius: 2, overflow: "hidden",
  },
  jobProgressFill: { height: "100%", borderRadius: 2 },

  // Batch cards
  batchCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 10, borderWidth: 1,
    padding: 10, marginBottom: 8,
  },
  batchInfo: { flex: 1, gap: 2 },
  batchRarity: { fontSize: 13, fontFamily: "Inter_700Bold" },
  batchSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.game.green },
  collectBtn: {
    borderRadius: 8, borderWidth: 1.5,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  collectBtnTxt: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },

  // Rarity + Tier selectors
  rarityRow: { gap: 6, paddingBottom: 2 },
  rarityBtn: {
    alignItems: "center", justifyContent: "center",
    minWidth: 36, height: 36, borderRadius: 8, borderWidth: 1.5,
  },
  rarityBtnLocked: { opacity: 0.45 },
  rarityBtnLabel: { fontSize: 10, fontFamily: "Inter_700Bold" },
  lockText: { fontSize: 7, fontFamily: "Inter_400Regular", color: Colors.game.textMuted, marginTop: 1 },
  tierRow: { flexDirection: "row", gap: 8, marginBottom: 2 },
  tierBtn: {
    flex: 1, alignItems: "center", justifyContent: "center",
    height: 34, borderRadius: 8, borderWidth: 1.5,
  },
  tierBtnText: { fontSize: 12, fontFamily: "Inter_700Bold" },

  // 1-craft-at-a-time busy notice
  busyNotice: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.game.border,
    paddingVertical: 10, paddingHorizontal: 12,
    marginTop: 14, marginBottom: 4,
  },
  busyText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.game.textDim },

  // Allocation
  allocHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 14, marginBottom: 8,
  },
  allocProgress: {
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.game.border,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  allocProgressFull: { borderColor: Colors.game.green },
  allocProgressTxt: { fontSize: 12, fontFamily: "Inter_700Bold" },
  allocGrid: { gap: 6 },
  allocRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.game.border,
    paddingVertical: 8, paddingHorizontal: 10,
  },
  allocRowDisabled: { opacity: 0.4 },
  allocInfo: { flex: 1, gap: 2 },
  allocType: { fontSize: 13, fontFamily: "Inter_700Bold" },
  allocAvail: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.game.textDim },
  allocStepper: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepBtn: {
    width: 30, height: 30, borderRadius: 8,
    borderWidth: 1.5, borderColor: Colors.game.border,
    alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.game.surface,
  },
  stepBtnDisabled: { opacity: 0.35 },
  stepBtnTxt: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.game.text, lineHeight: 22 },
  stepQty: { minWidth: 28, textAlign: "center", fontSize: 15, fontFamily: "Inter_700Bold" },

  // Cost panel
  costPanel: {
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 10, borderWidth: 1,
    padding: 12, gap: 6, marginTop: 12,
  },
  costRow: { flexDirection: "row", justifyContent: "space-between" },
  costLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.game.textDim },
  costVal: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.game.text },

  // Locked / hint notices
  lockedNotice: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginTop: 14, padding: 12,
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.game.border,
  },
  lockedText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.game.textDim, flex: 1 },

  // Craft button
  craftBtn: {
    marginTop: 14, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, alignItems: "center",
  },
  craftBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
});
