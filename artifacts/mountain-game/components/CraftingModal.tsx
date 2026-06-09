import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { ITEM_RARITIES } from "@/lib/items";
import {
  CraftResult, CRAFTING_MATERIALS_NEEDED, CRAFTING_UNLOCK_LEVELS,
  CRAFTING_XP_REWARDS, getXpToNextCraftingLevel, CRAFTING_MAX_LEVEL,
  CRAFTING_ENERGY_COST, CRAFTING_DURATION_MS, CRAFTING_MAX_ENERGY,
  CRAFTING_ENERGY_REGEN_MS,
} from "@/lib/crafting";
import { useGame } from "@/context/GameContext";
import { RarityName, VersionNum, RARITY_COLORS } from "@/context/GameContext";
import { GameItem, Potion } from "@/lib/items";
import { ItemImage } from "./ItemImage";
import { PotionImage } from "./PotionImage";
import { ToolImage } from "./ToolImage";
import { MaterialImage } from "./MaterialImage";
import { CraftRevealModal } from "./CraftRevealModal";

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
  const [quantity, setQuantity] = useState(1);
  const [allocation, setAllocation] = useState<Record<MaterialType, number>>({ ...INITIAL_ALLOCATION });
  const [now, setNow] = useState(Date.now());
  const [showReveal, setShowReveal] = useState(false);
  const [revealResults, setRevealResults] = useState<CraftResult[]>([]);

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
  }, []);

  const handleSelectRarity = useCallback((r: RarityName) => {
    setSelectedRarity(r);
    setQuantity(1);
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
  const baseEnergyCost = CRAFTING_ENERGY_COST[selectedRarity];
  const baseDurationMs = CRAFTING_DURATION_MS[selectedRarity];
  const energyCost = baseEnergyCost * quantity;
  const durationMs = baseDurationMs * quantity;

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
  const hasMatsForQuantity = MATERIAL_TYPES.every(t => {
    const qty = allocation[t] ?? 0;
    if (qty === 0) return true;
    return (matByType[t] ?? 0) >= qty * quantity;
  });
  const canCraft =
    isRarityUnlocked &&
    !hasActiveJob &&
    totalAllocated === needed &&
    char.craftingEnergy >= energyCost &&
    hasMatsForQuantity;

  const adjustAllocation = useCallback((type: MaterialType, delta: number) => {
    setAllocation((prev) => {
      const current = prev[type] ?? 0;
      const avail = matByType[type] ?? 0;
      const effectiveMax = Math.floor(avail / quantity);
      const remaining = needed - totalAllocated;
      let next = current + delta;
      if (delta > 0) {
        next = Math.min(current + delta, current + remaining, effectiveMax);
      } else {
        next = Math.max(0, next);
      }
      if (next === current) return prev;
      return { ...prev, [type]: next };
    });
  }, [matByType, needed, quantity, totalAllocated]);

  const handleCraft = () => {
    if (!canCraft) return;
    const ok = startCraftingJob(selectedRarity, selectedTier, allocation as Record<string, number>, quantity);
    if (ok) {
      setAllocation({ ...INITIAL_ALLOCATION });
    }
  };

  const handleCollect = (batchId: string) => {
    const results = collectCraftBatch(batchId);
    if (results.length > 0) {
      setRevealResults(results);
      setShowReveal(true);
    }
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
                        <Text style={[s.jobRarity, { color: jrc }]}>
                          {job.rarity} T{job.tier}{job.count > 1 ? ` ×${job.count}` : ""}
                        </Text>
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
                        <Text style={[s.batchRarity, { color: brc }]}>
                          {batch.rarity} T{batch.tier}{batch.count > 1 ? ` ×${batch.count}` : ""}
                        </Text>
                        <Text style={s.batchSub}>✨ Crafting complete!</Text>
                      </View>
                      <Pressable style={[s.collectBtn, { borderColor: brc, backgroundColor: brc + "22" }]} onPress={() => handleCollect(batch.id)}>
                        <Text style={[s.collectBtnTxt, { color: brc }]}>COLLECT</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </>
            )}

            {(activeJobs.length > 0 || pendingBatches.length > 0) && (
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

            {/* ── Quantity selector ── */}
            {isRarityUnlocked && !hasActiveJob && (
              <>
                <Text style={[s.sectionLabel, { marginTop: 10 }]}>QUANTITY</Text>
                <View style={s.tierRow}>
                  {[1, 2, 3, 4, 5].map((q) => {
                    const maxForEnergy = Math.floor(char.craftingEnergy / baseEnergyCost);
                    const disabled = q > maxForEnergy;
                    return (
                      <Pressable
                        key={q}
                        style={[
                          s.tierBtn,
                          quantity === q && { borderColor: rc, backgroundColor: rc + "22" },
                          quantity !== q && { borderColor: Colors.game.border },
                          disabled && { opacity: 0.35 },
                        ]}
                        onPress={() => { setQuantity(q); setAllocation({ ...INITIAL_ALLOCATION }); }}
                        disabled={disabled}
                      >
                        <Text style={[s.tierBtnText, { color: quantity === q ? rc : disabled ? Colors.game.textMuted : Colors.game.textDim }]}>×{q}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

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
                    const effectiveAvail = quantity > 1 ? Math.floor(avail / quantity) : avail;
                    const qty = allocation[type] ?? 0;
                    const canAdd = qty < effectiveAvail && totalAllocated < needed;
                    const canSub = qty > 0;

                    return (
                      <View key={type} style={[s.allocRow, effectiveAvail === 0 && s.allocRowDisabled]}>
                        <MaterialImage
                          type={type as any}
                          rarity={selectedRarity}
                          version={selectedTier}
                          size={50}
                          compact
                          animateParticles={false}
                        />
                        <View style={s.allocInfo}>
                          <Text style={[s.allocType, { color: effectiveAvail > 0 ? rc : Colors.game.textMuted }]}>
                            {type}
                          </Text>
                          <Text style={s.allocAvail}>
                            {avail > 0
                              ? quantity > 1
                                ? `${effectiveAvail} usable (${avail} total ÷${quantity})`
                                : `${avail} available`
                              : "none available"}
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
                    ⚡ {energyCost}{quantity > 1 ? ` (${baseEnergyCost}×${quantity})` : ""} — have {char.craftingEnergy}
                  </Text>
                </View>
                <View style={s.costRow}>
                  <Text style={s.costLabel}>Duration</Text>
                  <Text style={s.costVal}>
                    ⏱ {durationMs / 60_000} min{quantity > 1 ? ` (${baseDurationMs / 60_000}×${quantity})` : ""}
                  </Text>
                </View>
                <View style={s.costRow}>
                  <Text style={s.costLabel}>XP reward</Text>
                  <Text style={[s.costVal, { color: Colors.game.blue }]}>
                    +{CRAFTING_XP_REWARDS[selectedRarity] * quantity} crafting XP
                    {quantity > 1 ? ` (×${quantity})` : ""}
                  </Text>
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
                    ? `⚗  CRAFT ×${quantity}`
                    : char.craftingEnergy < energyCost
                      ? `Need ⚡${energyCost} energy (have ${char.craftingEnergy})`
                      : totalAllocated < needed
                        ? `Allocate ${needed} materials (${totalAllocated}/${needed})`
                        : "Insufficient materials for ×" + quantity}
                </Text>
              </Pressable>
            )}

          </ScrollView>
        </View>
      </View>
    </Modal>

    <CraftRevealModal
      visible={showReveal}
      results={revealResults}
      onClose={() => setShowReveal(false)}
      onEquipItem={(item) => {
        equipItem(item);
        removeItemFromBag(item.id);
      }}
      onSalvageItem={(item) => salvageItem(item.id)}
      onSellItemToNpc={(item) => sellItemToNpc(item.id)}
      onSellOnAh={onListItemOnAh ? (item) => {
        setShowReveal(false);
        onListItemOnAh(item);
      } : undefined}
      onUsePotion={(potion) => consumePotion(potion)}
      onSellPotionOnAh={onListPotionOnAh ? (potion) => {
        setShowReveal(false);
        onListPotionOnAh(potion);
      } : undefined}
    />
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
