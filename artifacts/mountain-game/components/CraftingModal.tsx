import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { FantasyButton, OrnatePanel, GemBar } from "@/components/ui";
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
      <GemBar progress={pct} gem="sapphire" height={8} />
      <Text style={xpS.label}>
        {level >= CRAFTING_MAX_LEVEL
          ? "MAX LEVEL"
          : `${current.toLocaleString()} / ${total.toLocaleString()} XP`}
      </Text>
    </View>
  );
}
const xpS = StyleSheet.create({
  wrap: { gap: 4 },
  label: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.game.textDim, textAlign: "right" },
});

function EnergyBar({ energy, lastRegen, now, maxEnergy }: { energy: number; lastRegen: number; now: number; maxEnergy: number }) {
  const msUntil = lastRegen + CRAFTING_ENERGY_REGEN_MS - now;
  const secs = Math.max(0, Math.ceil(msUntil / 1000));
  const m = Math.floor(secs / 60);
  const ss = String(secs % 60).padStart(2, "0");
  const regenLabel = energy >= maxEnergy ? "Full" : `+1 in ${m}:${ss}`;
  const pct = Math.min(1, energy / maxEnergy);
  return (
    <View style={eS.row}>
      <Text style={eS.icon}>⚡</Text>
      <GemBar progress={pct} gem="ember" height={6} style={eS.track} />
      <Text style={eS.count}>{energy}/{maxEnergy}</Text>
      <Text style={eS.regen}>{regenLabel}</Text>
    </View>
  );
}
const eS = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  icon: { fontSize: 11, color: Colors.game.ember },
  track: { flex: 1 },
  count: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.game.textMuted, minWidth: 24, textAlign: "right" },
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
        <LinearGradient colors={Colors.grad.panel} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={s.sheet}>

          {/* ── Header ── */}
          <View style={s.header}>
            <Text style={s.titleText}>Crafting</Text>
            <View style={s.levelBadge}>
              <Text style={s.levelText}>Lv {skill.level}</Text>
            </View>
            <FantasyButton icon="close" variant="dark" size="sm" onPress={onClose} style={s.closeBtn} />
          </View>

          {/* ── XP + Energy ── */}
          <View style={s.topSection}>
            <XpBar current={skill.xp} total={xpToNext} level={skill.level} />
          </View>

          <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

            {/* ── Active Jobs ── */}
            {activeJobs.length > 0 && (
              <>
                <Text style={[s.sectionLabel, { marginTop: 0 }]}>Crafting</Text>
                {activeJobs.map((job) => {
                  const msLeft = job.completesAt - now;
                  const prog = Math.min(1, Math.max(0, 1 - msLeft / (job.completesAt - job.startedAt)));
                  const jrc = RARITY_COLORS[job.rarity as RarityName];
                  return (
                    <View key={job.id} style={[s.jobCard, { borderColor: jrc + "55" }]}>
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
                <Text style={[s.sectionLabel, { marginTop: activeJobs.length > 0 ? 14 : 0 }]}>Ready to Collect</Text>
                {pendingBatches.map((batch) => {
                  const brc = RARITY_COLORS[batch.rarity as RarityName];
                  return (
                    <View key={batch.id} style={[s.batchCard, { borderColor: brc + "66" }]}>
                      <View style={s.batchInfo}>
                        <Text style={[s.batchRarity, { color: brc }]}>
                          {batch.rarity} T{batch.tier}{batch.count > 1 ? ` ×${batch.count}` : ""}
                        </Text>
                        <Text style={s.batchSub}>✨ Crafting complete!</Text>
                      </View>
                      <FantasyButton
                        label="COLLECT"
                        icon="gift"
                        variant="emerald"
                        size="sm"
                        onPress={() => handleCollect(batch.id)}
                      />
                    </View>
                  );
                })}
              </>
            )}

            {(activeJobs.length > 0 || pendingBatches.length > 0) && (
              <View style={s.divider} />
            )}

            {/* ── Rarity selector ── */}
            <Text style={[s.sectionLabel, { marginTop: 6 }]}>Rarity</Text>
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
            <Text style={[s.sectionLabel, { marginTop: 10 }]}>Tier</Text>
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
                <Text style={[s.sectionLabel, { marginTop: 10 }]}>Quantity</Text>
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
                  <Text style={s.sectionLabel}>Materials</Text>
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
                          <FantasyButton
                            icon="remove"
                            variant="dark"
                            size="sm"
                            onPress={() => adjustAllocation(type, -1)}
                            disabled={!canSub}
                            style={s.stepBtn}
                          />
                          <Text style={[s.stepQty, { color: qty > 0 ? rc : Colors.game.textMuted }]}>
                            {qty}
                          </Text>
                          <FantasyButton
                            icon="add"
                            variant="dark"
                            size="sm"
                            onPress={() => adjustAllocation(type, 1)}
                            disabled={!canAdd}
                            style={s.stepBtn}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {/* ── Cost summary + Craft button ── */}
            {isRarityUnlocked && !hasActiveJob && totalAllocated > 0 && (
              <OrnatePanel accent={rc} padding={12} style={s.costPanelWrap} contentStyle={s.costPanel}>
                <View style={s.costRow}>
                  <Text style={s.costLabel}>Energy</Text>
                  <Text style={[s.costVal, char.craftingEnergy < energyCost && { color: Colors.game.redLight }]}>
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
                  <Text style={[s.costVal, { color: Colors.game.blueLight }]}>
                    +{CRAFTING_XP_REWARDS[selectedRarity] * quantity} crafting XP
                    {quantity > 1 ? ` (×${quantity})` : ""}
                  </Text>
                </View>
              </OrnatePanel>
            )}

            {!isRarityUnlocked ? (
              <View style={s.lockedNotice}>
                <Feather name="lock" size={16} color={Colors.game.textMuted} />
                <Text style={s.lockedText}>Reach crafting level {unlockLevel} to unlock {selectedRarity} crafting</Text>
              </View>
            ) : !hasActiveJob && (
              <FantasyButton
                fullWidth
                size="lg"
                variant="gold"
                icon="hammer"
                glow={canCraft}
                disabled={!canCraft}
                onPress={handleCraft}
                style={s.craftBtn}
                label={
                  canCraft
                    ? `CRAFT ×${quantity}`
                    : char.craftingEnergy < energyCost
                      ? `Need ⚡${energyCost} energy (have ${char.craftingEnergy})`
                      : totalAllocated < needed
                        ? `Allocate ${needed} materials (${totalAllocated}/${needed})`
                        : "Insufficient materials for ×" + quantity
                }
              />
            )}

          </ScrollView>
        </LinearGradient>
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
  overlay: { flex: 1, backgroundColor: "rgba(7,4,9,0.8)", justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 1.5, borderLeftWidth: 1, borderRightWidth: 1,
    borderColor: Colors.game.gold + "55",
    maxHeight: "92%",
    overflow: "hidden",
  },

  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.game.gold + "22",
  },
  titleText: { flex: 1, fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.game.gold, letterSpacing: 0.5 },
  levelBadge: {
    backgroundColor: Colors.game.blue + "22",
    borderRadius: 8, borderWidth: 1, borderColor: Colors.game.blue + "55",
    paddingHorizontal: 8, paddingVertical: 3,
  },
  levelText: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.game.blueLight },
  closeBtn: {},

  topSection: {
    paddingHorizontal: 18, paddingVertical: 12, gap: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.game.gold + "22",
  },

  scroll: { flex: 1 },
  scrollContent: { padding: 18, paddingBottom: 40 },

  sectionHeading: { marginBottom: 8, alignSelf: "flex-start" },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.game.textDim,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  divider: { height: 1, backgroundColor: Colors.game.gold + "22", marginVertical: 16 },

  // Active job cards
  jobCard: {
    backgroundColor: Colors.game.surface,
    borderRadius: 12, borderWidth: 1,
    padding: 10, marginBottom: 8, gap: 6, overflow: "hidden",
  },
  jobInfo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  jobRarity: { fontSize: 12, fontFamily: "Inter_700Bold" },
  jobMat: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.game.textDim },
  jobTimer: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.game.text, textAlign: "right" },
  jobProgress: {
    height: 5, backgroundColor: Colors.game.backgroundDeep, borderRadius: 3, overflow: "hidden",
  },
  jobProgressFill: { height: "100%", borderRadius: 3 },

  // Batch cards
  batchCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.game.surface,
    borderRadius: 12, borderWidth: 1,
    padding: 10, marginBottom: 8,
  },
  batchInfo: { flex: 1, gap: 2 },
  batchRarity: { fontSize: 13, fontFamily: "Inter_700Bold" },
  batchSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.game.green },

  // Rarity + Tier selectors
  rarityRow: { gap: 6, paddingBottom: 2 },
  rarityBtn: {
    alignItems: "center", justifyContent: "center",
    minWidth: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.game.surface,
  },
  rarityBtnLocked: { opacity: 0.45 },
  rarityBtnLabel: { fontSize: 10, fontFamily: "Inter_700Bold" },
  lockText: { fontSize: 7, fontFamily: "Inter_400Regular", color: Colors.game.textMuted, marginTop: 1 },
  tierRow: { flexDirection: "row", gap: 8, marginBottom: 2 },
  tierBtn: {
    flex: 1, alignItems: "center", justifyContent: "center",
    height: 34, borderRadius: 10,
    backgroundColor: Colors.game.surface,
  },
  tierBtnText: { fontSize: 12, fontFamily: "Inter_700Bold" },

  // 1-craft-at-a-time busy notice
  busyNotice: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.game.surface,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.game.gold + "33",
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
    backgroundColor: Colors.game.surface,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.game.gold + "33",
    paddingHorizontal: 10, paddingVertical: 4,
  },
  allocProgressFull: { borderColor: Colors.game.green },
  allocProgressTxt: { fontSize: 12, fontFamily: "Inter_700Bold" },
  allocGrid: { gap: 6 },
  allocRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.game.surface,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.game.gold + "22",
    paddingVertical: 8, paddingHorizontal: 10,
  },
  allocRowDisabled: { opacity: 0.4 },
  allocInfo: { flex: 1, gap: 2 },
  allocType: { fontSize: 13, fontFamily: "Inter_700Bold" },
  allocAvail: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.game.textDim },
  allocStepper: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepBtn: { width: 38 },
  stepQty: { minWidth: 28, textAlign: "center", fontSize: 15, fontFamily: "Inter_700Bold" },

  // Cost panel
  costPanelWrap: { marginTop: 12 },
  costPanel: { gap: 8, padding: 8 },
  costRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  costLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.game.textDim, flexShrink: 0, marginRight: 8 },
  costVal: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.game.text, flexShrink: 1, textAlign: "right", flexWrap: "wrap" },

  // Locked / hint notices
  lockedNotice: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginTop: 14, padding: 12,
    backgroundColor: Colors.game.surface,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.game.gold + "33",
  },
  lockedText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.game.textDim, flex: 1 },

  // Craft button
  craftBtn: { marginTop: 14 },
});
