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
import { GameItem, useGame } from "@/context/GameContext";
import {
  formatItemName,
  ITEM_QUALITY_COLORS,
  ITEM_RARITY_COLORS,
  ITEM_SLOT_ICONS,
} from "@/lib/items";
import { SALVAGE_NPC_PRICES, SALVAGE_XP_REWARDS, SalvageResult } from "@/lib/salvaging";
import { ItemImage } from "./ItemImage";
import { MaterialImage } from "./MaterialImage";
import { RARITY_COLORS, RarityName, VersionNum } from "@/context/GameContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(v: number) {
  return v > 0 ? `+${(v * 100).toFixed(1)}%` : `${(v * 100).toFixed(1)}%`;
}

function formatGold(n: number) {
  return n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `${(n / 1_000).toFixed(0)}k`
    : String(n);
}

const STAT_ROWS = [
  { key: "strength" as const, label: "Strength", icon: "⚔" },
  { key: "health"   as const, label: "Health",   icon: "♥" },
  { key: "defence"  as const, label: "Defence",  icon: "🛡" },
  { key: "speed"    as const, label: "Speed",    icon: "⚡" },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

interface ItemBagModalProps {
  item: GameItem;
  onClose: () => void;
  onEquip?: () => void;
  onSellOnAh?: () => void;
  onSalvage?: () => void;
  onSellToNpc?: () => void;
}

export function ItemBagModal({ item, onClose, onEquip, onSellOnAh, onSalvage, onSellToNpc }: ItemBagModalProps) {
  const { gameState, salvageItem } = useGame();
  const level = gameState.character.level;
  const rc = ITEM_RARITY_COLORS[item.rarity];
  const qc = ITEM_QUALITY_COLORS[item.quality];
  const meetsLevel = level >= (item.levelRequirement ?? 0);

  const [confirmSalvage, setConfirmSalvage] = useState(false);
  const [confirmSellNpc, setConfirmSellNpc] = useState(false);
  const [salvageResult, setSalvageResult] = useState<SalvageResult | null>(null);

  const hasFlatStat = STAT_ROWS.some(({ key }) => item.stats[key] > 0);
  const hasPctStat  = STAT_ROWS.some(({ key }) => item.percentStats[key] > 0);

  const npcPrice = SALVAGE_NPC_PRICES[item.rarity as keyof typeof SALVAGE_NPC_PRICES] ?? 1000;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable style={ss.overlay} onPress={onClose}>
        <Pressable style={[ss.card, { borderColor: rc + "99" }]} onPress={(e) => e.stopPropagation()}>

          {/* ── Art + identity ───────────────────────────────────────── */}
          <View style={ss.header}>
            <ItemImage slot={item.slot} rarity={item.rarity} quality={item.quality} tier={item.tier} size={84} />
            <View style={ss.headerInfo}>
              <Text style={[ss.name, { color: rc }]} numberOfLines={2}>{formatItemName(item)}</Text>

              <View style={ss.tagRow}>
                <View style={[ss.tag, { borderColor: rc }]}>
                  <Text style={[ss.tagTxt, { color: rc }]}>{item.rarity.toUpperCase()}</Text>
                </View>
                <View style={[ss.tag, { borderColor: "#444" }]}>
                  <Text style={[ss.tagTxt, { color: "#aaa" }]}>T{item.tier}</Text>
                </View>
                <View style={[ss.tag, { borderColor: qc + "88" }]}>
                  <Text style={[ss.tagTxt, { color: qc }]}>{item.quality.toUpperCase()}</Text>
                </View>
              </View>

              <View style={ss.slotRow}>
                <Text style={[ss.slotIcon, { color: rc }]}>{ITEM_SLOT_ICONS[item.slot]}</Text>
                <Text style={ss.slotLabel}>{item.slot}</Text>
              </View>

              {(item.levelRequirement ?? 0) > 0 && (
                <Text style={[ss.lvReq, !meetsLevel && ss.lvReqFail]}>
                  Req. Lv {item.levelRequirement}{meetsLevel ? " ✓" : " ✗"}
                </Text>
              )}
            </View>
          </View>

          <View style={ss.divider} />

          {/* ── Stats ────────────────────────────────────────────────── */}
          <ScrollView style={ss.statsScroll} showsVerticalScrollIndicator={false}>
            {hasFlatStat && (
              <>
                <Text style={ss.sectionLabel}>FLAT BONUSES</Text>
                {STAT_ROWS.map(({ key, label, icon }) => {
                  const v = item.stats[key];
                  if (v === 0) return null;
                  return (
                    <View key={key} style={ss.statRow}>
                      <Text style={ss.statIcon}>{icon}</Text>
                      <Text style={ss.statLabel}>{label}</Text>
                      <Text style={[ss.statVal, { color: Colors.game.green }]}>+{v}</Text>
                    </View>
                  );
                })}
              </>
            )}

            {hasPctStat && (
              <>
                <Text style={[ss.sectionLabel, { marginTop: 8 }]}>% BONUSES</Text>
                {STAT_ROWS.map(({ key, label, icon }) => {
                  const v = item.percentStats[key];
                  if (v === 0) return null;
                  return (
                    <View key={key} style={ss.statRow}>
                      <Text style={ss.statIcon}>{icon}</Text>
                      <Text style={ss.statLabel}>{label}</Text>
                      <Text style={[ss.statVal, { color: Colors.game.gold }]}>{pct(v)}</Text>
                    </View>
                  );
                })}
              </>
            )}

            {!hasFlatStat && !hasPctStat && (
              <Text style={ss.noStats}>No stat bonuses.</Text>
            )}
          </ScrollView>

          {/* ── Tradable indicator ───────────────────────────────────── */}
          <Text style={ss.tradable}>{item.tradable ? "⚖  Tradable" : "🔒  Account Bound"}</Text>

          {/* ── Action buttons ───────────────────────────────────────── */}
          <View style={ss.actions}>
            {onEquip && (
              <Pressable
                style={[ss.actionBtn, { borderColor: rc, backgroundColor: rc + "22" }, !meetsLevel && ss.btnDim]}
                onPress={meetsLevel ? onEquip : undefined}
                disabled={!meetsLevel}
              >
                <Text style={[ss.actionBtnTxt, { color: meetsLevel ? rc : Colors.game.textMuted }]}>
                  EQUIP
                </Text>
              </Pressable>
            )}
            {onSellOnAh && item.tradable && (
              <Pressable style={[ss.actionBtn, ss.ahBtn]} onPress={onSellOnAh}>
                <Text style={ss.ahBtnTxt}>SELL ON AH</Text>
              </Pressable>
            )}
          </View>

          {/* ── Salvage result ───────────────────────────────────────── */}
          {salvageResult && (
            <View style={ss.salvageResultBox}>
              <Text style={ss.salvageResultTitle}>🔨 Salvage Result</Text>
              {salvageResult.materials.map((m, i) => (
                <View key={i} style={ss.salvageResultRow}>
                  <MaterialImage
                    type={m.type as any}
                    rarity={item.rarity as RarityName}
                    version={m.tier as VersionNum}
                    size={46}
                    compact
                  />
                  <View style={ss.salvageResultInfo}>
                    <Text style={[ss.salvageResultMat, { color: RARITY_COLORS[item.rarity as RarityName] }]}>
                      {item.rarity} {m.type}
                    </Text>
                    <Text style={ss.salvageResultSub}>T{m.tier} · +{m.count} material{m.count !== 1 ? "s" : ""}</Text>
                  </View>
                </View>
              ))}
              <Text style={ss.salvageResultTotal}>
                {salvageResult.totalCount} material{salvageResult.totalCount !== 1 ? "s" : ""} recovered ·{" "}
                +{SALVAGE_XP_REWARDS[item.rarity as keyof typeof SALVAGE_XP_REWARDS] ?? 5} salvage XP
              </Text>
              <Pressable style={ss.salvageDoneBtn} onPress={() => { onSalvage?.(); onClose(); }}>
                <Text style={ss.salvageDoneBtnTxt}>DONE</Text>
              </Pressable>
            </View>
          )}

          {/* ── Salvage / Sell to NPC row ─────────────────────────────── */}
          {!salvageResult && (
          <View style={ss.actions}>
            {onSalvage && (
              confirmSalvage ? (
                <Pressable style={[ss.actionBtn, ss.confirmBtn]} onPress={() => {
                  const result = salvageItem(item.id);
                  if (result) setSalvageResult(result);
                }}>
                  <Text style={ss.confirmBtnTxt}>⚠ CONFIRM SALVAGE</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[ss.actionBtn, ss.salvageBtn]}
                  onPress={() => setConfirmSalvage(true)}
                >
                  <Text style={ss.salvageBtnTxt}>🔨 SALVAGE</Text>
                </Pressable>
              )
            )}
            {onSellToNpc && (
              confirmSellNpc ? (
                <Pressable style={[ss.actionBtn, ss.confirmBtn]} onPress={onSellToNpc}>
                  <Text style={ss.confirmBtnTxt}>⚠ CONFIRM SELL</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[ss.actionBtn, ss.npcBtn]}
                  onPress={() => setConfirmSellNpc(true)}
                >
                  <Text style={ss.npcBtnTxt}>🪙 SELL TO NPC</Text>
                  <Text style={ss.subHint}>{formatGold(npcPrice)} gold</Text>
                </Pressable>
              )
            )}
          </View>
          )}

          {!salvageResult && (
          <Pressable style={ss.closeBtn} onPress={onClose}>
            <Text style={ss.closeBtnTxt}>CLOSE</Text>
          </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center", alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 20, borderWidth: 2,
    width: "100%", maxWidth: 340,
    padding: 18, gap: 10,
  },
  header: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  headerInfo: { flex: 1, gap: 6 },
  name: { fontSize: 15, fontFamily: "Inter_700Bold", lineHeight: 20 },
  tagRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  tag: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  tagTxt: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  slotRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  slotIcon: { fontSize: 14 },
  slotLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.game.textDim },
  lvReq: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.game.green },
  lvReqFail: { color: "#F87171" },
  divider: { height: 1, backgroundColor: Colors.game.border },
  statsScroll: { maxHeight: 150 },
  sectionLabel: {
    fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 2,
    color: Colors.game.textMuted, marginBottom: 4,
  },
  statRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 3 },
  statIcon: { fontSize: 13, width: 18 },
  statLabel: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.game.text },
  statVal: { fontSize: 13, fontFamily: "Inter_700Bold" },
  noStats: {
    fontSize: 12, fontFamily: "Inter_400Regular",
    color: Colors.game.textMuted, textAlign: "center", paddingVertical: 8,
  },
  tradable: {
    fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.game.textMuted,
    textAlign: "center", letterSpacing: 0.5,
  },
  actions: { flexDirection: "row", gap: 8 },
  subHint: {
    fontSize: 9, fontFamily: "Inter_400Regular",
    color: Colors.game.textMuted, marginTop: 2,
  },

  // Equip / AH
  actionBtn: {
    flex: 1, borderRadius: 12, borderWidth: 1.5,
    paddingVertical: 10, alignItems: "center",
  },
  actionBtnTxt: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  btnDim: { opacity: 0.4 },
  ahBtn: {
    borderColor: Colors.game.gold,
    backgroundColor: "rgba(201,168,76,0.10)",
  },
  ahBtnTxt: {
    fontSize: 12, fontFamily: "Inter_700Bold",
    color: Colors.game.gold, letterSpacing: 1.5,
  },

  // Salvage
  salvageBtn: {
    borderColor: "#7C6544",
    backgroundColor: "rgba(124,101,68,0.15)",
  },
  salvageBtnTxt: {
    fontSize: 12, fontFamily: "Inter_700Bold",
    color: "#C4A06A", letterSpacing: 1,
  },
  salvageResultBox: {
    backgroundColor: Colors.game.surface,
    borderRadius: 12, borderWidth: 1, borderColor: "#7C6544",
    padding: 14, gap: 8,
  },
  salvageResultTitle: {
    fontSize: 13, fontFamily: "Inter_700Bold", color: "#C4A06A", marginBottom: 2,
  },
  salvageResultRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  salvageResultInfo: { flex: 1, gap: 2 },
  salvageResultMat: { fontSize: 12, fontFamily: "Inter_700Bold" },
  salvageResultSub: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.game.textDim },
  salvageResultTotal: {
    fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.game.textMuted,
    borderTopWidth: 1, borderTopColor: Colors.game.border, paddingTop: 8, marginTop: 2,
  },
  salvageDoneBtn: {
    borderRadius: 10, borderWidth: 1, borderColor: "#7C6544",
    backgroundColor: "rgba(124,101,68,0.15)", paddingVertical: 10, alignItems: "center",
  },
  salvageDoneBtnTxt: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#C4A06A", letterSpacing: 1 },

  // NPC sell
  npcBtn: {
    borderColor: Colors.game.green + "99",
    backgroundColor: Colors.game.green + "18",
  },
  npcBtnTxt: {
    fontSize: 12, fontFamily: "Inter_700Bold",
    color: Colors.game.green, letterSpacing: 1,
  },

  // Confirm (orange warning state)
  confirmBtn: {
    borderColor: "#F59E0B",
    backgroundColor: "rgba(245,158,11,0.15)",
  },
  confirmBtnTxt: {
    fontSize: 11, fontFamily: "Inter_700Bold",
    color: "#F59E0B", letterSpacing: 0.8,
  },

  closeBtn: {
    borderRadius: 12, paddingVertical: 11, alignItems: "center",
    backgroundColor: Colors.game.surface,
    borderWidth: 1, borderColor: Colors.game.border,
  },
  closeBtnTxt: {
    fontSize: 12, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 2,
  },
});
