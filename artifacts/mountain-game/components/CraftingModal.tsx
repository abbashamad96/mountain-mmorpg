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
import { ItemImage } from "./ItemImage";
import { PotionImage } from "./PotionImage";
import { ToolImage } from "./ToolImage";

// ─── Constants ────────────────────────────────────────────────────────────────

const TIERS: VersionNum[] = [0, 1, 2, 3];
const MATERIAL_TYPES = ["Wood", "Ore", "Herb", "Leather"] as const;
const MATERIAL_ICONS: Record<string, string> = {
  Wood: "🪵", Herb: "🌿", Ore: "⛏", Leather: "🧶",
};
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

function ResultCard({ result }: { result: CraftResult }) {
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
  return (
    <View style={[rcS.card, { borderColor: rc + "55" }]}>
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
    </View>
  );
}
const rcS = StyleSheet.create({
  card: { flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: Colors.game.surface, borderRadius: 8, borderWidth: 1, padding: 8, marginTop: 6 },
  img: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  info: { flex: 1, gap: 2 },
  label: { fontSize: 12, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.game.textDim },
});

// ─── Main modal ───────────────────────────────────────────────────────────────

interface Props { visible: boolean; onClose: () => void; }

export function CraftingModal({ visible, onClose }: Props) {
  const { gameState, startCraftingJob, collectCraftBatch, regenCraftingEnergy, checkCraftingJobs } = useGame();
  const char = gameState.character;
  const skill = char.craftingSkill;

  const [selectedRarity, setSelectedRarity] = useState<RarityName>("Common");
  const [selectedTier, setSelectedTier] = useState<VersionNum>(0);
  const [selectedMatType, setSelectedMatType] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [now, setNow] = useState(Date.now());
  const [lastCollected, setLastCollected] = useState<CraftResult[] | null>(null);

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

  const handleSelectRarity = useCallback((r: RarityName) => {
    setSelectedRarity(r); setSelectedMatType(null); setQuantity(1); setLastCollected(null);
  }, []);
  const handleSelectTier = useCallback((t: VersionNum) => {
    setSelectedTier(t); setSelectedMatType(null); setQuantity(1); setLastCollected(null);
  }, []);

  const xpToNext = getXpToNextCraftingLevel(skill.level);
  const needed = CRAFTING_MATERIALS_NEEDED[selectedRarity];
  const unlockLevel = CRAFTING_UNLOCK_LEVELS[selectedRarity];
  const isRarityUnlocked = skill.level >= unlockLevel;
  const energyCostPer = CRAFTING_ENERGY_COST[selectedRarity];
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

  const maxByMats = selectedMatType ? Math.floor((matByType[selectedMatType] ?? 0) / needed) : 0;
  const maxByEnergy = Math.floor(char.craftingEnergy / energyCostPer);
  const maxQuantity = Math.min(5, maxByMats, maxByEnergy);

  useEffect(() => {
    if (maxQuantity > 0 && quantity > maxQuantity) setQuantity(maxQuantity);
  }, [maxQuantity]);

  const energyCostTotal = quantity * energyCostPer;
  const materialsCostTotal = quantity * needed;
  const canCraft = isRarityUnlocked && selectedMatType !== null && quantity >= 1 && quantity <= maxQuantity && char.craftingEnergy >= energyCostTotal;

  const handleCraft = () => {
    if (!canCraft || !selectedMatType) return;
    const ok = startCraftingJob(selectedRarity, selectedTier, selectedMatType, quantity);
    if (ok) { setSelectedMatType(null); setQuantity(1); setLastCollected(null); }
  };

  const handleCollect = (batchId: string) => {
    const results = collectCraftBatch(batchId);
    setLastCollected(results);
  };

  const rc = RARITY_COLORS[selectedRarity];
  const activeJobs = char.craftingJobs ?? [];
  const pendingBatches = char.pendingCraftBatches ?? [];

  return (
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
                        <Text style={[s.jobRarity, { color: jrc }]}>{job.rarity} T{job.tier} ×{job.count}</Text>
                        <Text style={s.jobMat}>{MATERIAL_ICONS[job.materialType]} {job.materialType}</Text>
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
                        <Text style={[s.batchRarity, { color: brc }]}>{batch.rarity} T{batch.tier} ×{batch.count}</Text>
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
                {lastCollected.map((r, i) => <ResultCard key={i} result={r} />)}
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

            {/* ── Material type selector ── */}
            {isRarityUnlocked && (
              <>
                <Text style={[s.sectionLabel, { marginTop: 10 }]}>MATERIAL</Text>
                <View style={s.matTypeGrid}>
                  {MATERIAL_TYPES.map((type) => {
                    const count = matByType[type] ?? 0;
                    const craftsAvail = Math.floor(count / needed);
                    const selectable = craftsAvail >= 1;
                    const isSelected = selectedMatType === type;
                    return (
                      <Pressable
                        key={type}
                        style={[
                          s.matTypeBtn,
                          isSelected && { borderColor: rc, backgroundColor: rc + "22" },
                          !isSelected && { borderColor: Colors.game.border },
                          !selectable && s.matTypeLocked,
                        ]}
                        onPress={selectable ? () => { setSelectedMatType(type); setQuantity(1); } : undefined}
                        disabled={!selectable}
                      >
                        <Text style={s.matTypeIcon}>{MATERIAL_ICONS[type]}</Text>
                        <Text style={[s.matTypeName, { color: isSelected ? rc : selectable ? Colors.game.textDim : Colors.game.textMuted }]}>
                          {type}
                        </Text>
                        <Text style={[s.matTypeCount, { color: selectable ? Colors.game.text : Colors.game.textMuted }]}>
                          {count}
                        </Text>
                        {selectable && (
                          <Text style={[s.matTypeCrafts, { color: isSelected ? rc : Colors.game.textMuted }]}>
                            ×{craftsAvail} available
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {/* ── Quantity selector ── */}
            {isRarityUnlocked && selectedMatType !== null && (
              <>
                <Text style={[s.sectionLabel, { marginTop: 10 }]}>QUANTITY</Text>
                <View style={s.qtyRow}>
                  {[1, 2, 3, 4, 5].map((q) => {
                    const avail = q <= maxQuantity;
                    const isSelected = quantity === q;
                    return (
                      <Pressable
                        key={q}
                        style={[
                          s.qtyBtn,
                          isSelected && { borderColor: rc, backgroundColor: rc + "22" },
                          !isSelected && { borderColor: Colors.game.border },
                          !avail && s.qtyBtnLocked,
                        ]}
                        onPress={avail ? () => setQuantity(q) : undefined}
                        disabled={!avail}
                      >
                        <Text style={[s.qtyBtnText, { color: isSelected ? rc : avail ? Colors.game.textDim : Colors.game.textMuted }]}>
                          {q}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {/* ── Cost summary + Craft button ── */}
            {isRarityUnlocked && selectedMatType !== null && (
              <View style={[s.costPanel, { borderColor: rc + "33" }]}>
                <View style={s.costRow}>
                  <Text style={s.costLabel}>Materials</Text>
                  <Text style={s.costVal}>{materialsCostTotal}× {MATERIAL_ICONS[selectedMatType]} {selectedMatType} {selectedRarity} T{selectedTier}</Text>
                </View>
                <View style={s.costRow}>
                  <Text style={s.costLabel}>Energy</Text>
                  <Text style={[s.costVal, char.craftingEnergy < energyCostTotal && { color: "#F87171" }]}>
                    ⚡ {energyCostTotal} (have {char.craftingEnergy})
                  </Text>
                </View>
                <View style={s.costRow}>
                  <Text style={s.costLabel}>Duration</Text>
                  <Text style={s.costVal}>⏱ {durationMs / 60_000} min</Text>
                </View>
                <View style={s.costRow}>
                  <Text style={s.costLabel}>XP reward</Text>
                  <Text style={[s.costVal, { color: Colors.game.blue }]}>+{CRAFTING_XP_REWARDS[selectedRarity] * quantity} crafting XP</Text>
                </View>
              </View>
            )}

            {!isRarityUnlocked ? (
              <View style={s.lockedNotice}>
                <Feather name="lock" size={16} color={Colors.game.textMuted} />
                <Text style={s.lockedText}>Reach crafting level {unlockLevel} to unlock {selectedRarity} crafting</Text>
              </View>
            ) : selectedMatType === null ? (
              <View style={[s.lockedNotice, { marginTop: 14 }]}>
                <Text style={s.lockedText}>Select a material type above to craft</Text>
              </View>
            ) : (
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
                    : char.craftingEnergy < energyCostTotal
                      ? `Need ⚡${energyCostTotal} energy (have ${char.craftingEnergy})`
                      : `Need ${materialsCostTotal} × ${selectedMatType}`}
                </Text>
              </Pressable>
            )}

          </ScrollView>
        </View>
      </View>
    </Modal>
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
    borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 6, gap: 6,
  },
  jobInfo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  jobRarity: { fontSize: 13, fontFamily: "Inter_700Bold" },
  jobMat: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.game.textDim },
  jobTimer: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.game.gold, textAlign: "right" },
  jobProgress: { height: 3, backgroundColor: Colors.game.border, borderRadius: 2, overflow: "hidden" },
  jobProgressFill: { height: "100%", borderRadius: 2 },

  // Ready to collect
  batchCard: {
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 10, borderWidth: 1.5, padding: 12, marginBottom: 6,
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  batchInfo: { flex: 1, gap: 2 },
  batchRarity: { fontSize: 13, fontFamily: "Inter_700Bold" },
  batchSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.game.green },
  collectBtn: {
    borderRadius: 8, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 8,
    alignItems: "center",
  },
  collectBtnTxt: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 1 },

  // Rarity
  rarityRow: { flexDirection: "row", gap: 6, paddingBottom: 4 },
  rarityBtn: {
    minWidth: 44, paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1, alignItems: "center", gap: 2,
  },
  rarityBtnLocked: { opacity: 0.5 },
  rarityBtnLabel: { fontSize: 12, fontFamily: "Inter_700Bold" },
  lockText: { fontSize: 9, fontFamily: "Inter_400Regular", color: Colors.game.textMuted },

  // Tier
  tierRow: { flexDirection: "row", gap: 6 },
  tierBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: "center" },
  tierBtnText: { fontSize: 13, fontFamily: "Inter_700Bold" },

  // Material type
  matTypeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  matTypeBtn: {
    width: "47%", borderRadius: 10, borderWidth: 1, padding: 10, gap: 3,
  },
  matTypeLocked: { opacity: 0.4 },
  matTypeIcon: { fontSize: 18 },
  matTypeName: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  matTypeCount: { fontSize: 13, fontFamily: "Inter_700Bold" },
  matTypeCrafts: { fontSize: 10, fontFamily: "Inter_400Regular" },

  // Quantity
  qtyRow: { flexDirection: "row", gap: 6 },
  qtyBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, alignItems: "center" },
  qtyBtnLocked: { opacity: 0.35 },
  qtyBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },

  // Cost panel
  costPanel: {
    marginTop: 14, borderRadius: 10, borderWidth: 1,
    backgroundColor: Colors.game.surfaceAlt, padding: 12, gap: 7,
  },
  costRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  costLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.game.textDim },
  costVal: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.game.text },

  // Locked notice
  lockedNotice: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginTop: 16, padding: 12,
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.game.border,
  },
  lockedText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.game.textMuted },

  // Craft button
  craftBtn: {
    marginTop: 14, padding: 16, borderRadius: 12, borderWidth: 1, alignItems: "center", gap: 4,
  },
  craftBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
});
