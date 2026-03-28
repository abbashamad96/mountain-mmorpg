import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Colors from "@/constants/colors";
import { useMultiplayer } from "@/context/MultiplayerContext";

type Tab = "login" | "register";

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AuthModal({ visible, onClose }: AuthModalProps) {
  const mp = useMultiplayer();

  const [tab, setTab] = useState<Tab>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (mp.isAuthenticated && visible) {
      // don't auto-close — let user see their account info
    }
  }, [mp.isAuthenticated, visible]);

  useEffect(() => {
    setLocalError(null);
  }, [tab, visible]);

  const handleSubmit = () => {
    setLocalError(null);

    if (!username.trim()) { setLocalError("Username is required."); return; }
    if (!password) { setLocalError("Password is required."); return; }

    if (tab === "register") {
      if (password !== confirmPw) { setLocalError("Passwords do not match."); return; }
      if (password.length < 4) { setLocalError("Password must be at least 4 characters."); return; }
      mp.register(username.trim(), password, null);
    } else {
      mp.login(username.trim(), password);
    }
  };

  const handleLogout = () => {
    mp.logout();
    onClose();
  };

  const displayError = localError || mp.authError;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          {/* Logged-in view */}
          {mp.isAuthenticated ? (
            <View style={styles.loggedInView}>
              <View style={styles.avatarRow}>
                <View style={styles.avatar}>
                  <Feather name="user" size={28} color={Colors.game.gold} />
                </View>
                <View>
                  <Text style={styles.loggedInLabel}>SIGNED IN AS</Text>
                  <Text style={styles.loggedInName}>{mp.authUsername}</Text>
                </View>
              </View>
              <Text style={styles.loggedInDesc}>
                Your progress is automatically saved to the server. Log in on any device to continue.
              </Text>
              <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                <Feather name="log-out" size={14} color={Colors.game.red} />
                <Text style={styles.logoutBtnTxt}>SIGN OUT</Text>
              </Pressable>
              <Pressable style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeBtnTxt}>CLOSE</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <Text style={styles.title}>MOUNTAIN ACCOUNT</Text>
              <Text style={styles.subtitle}>Save your progress & play from any device</Text>

              {/* Tabs */}
              <View style={styles.tabs}>
                <Pressable
                  style={[styles.tabBtn, tab === "login" && styles.tabBtnActive]}
                  onPress={() => setTab("login")}
                >
                  <Text style={[styles.tabTxt, tab === "login" && styles.tabTxtActive]}>LOG IN</Text>
                </Pressable>
                <Pressable
                  style={[styles.tabBtn, tab === "register" && styles.tabBtnActive]}
                  onPress={() => setTab("register")}
                >
                  <Text style={[styles.tabTxt, tab === "register" && styles.tabTxtActive]}>REGISTER</Text>
                </Pressable>
              </View>

              {/* Error */}
              {displayError && (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={13} color={Colors.game.red} />
                  <Text style={styles.errorTxt}>{displayError}</Text>
                </View>
              )}

              {/* Inputs */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="e.g. MountainKing"
                  placeholderTextColor={Colors.game.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={20}
                  selectionColor={Colors.game.gold}
                  {...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {})}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 4 characters"
                  placeholderTextColor={Colors.game.textMuted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={64}
                  selectionColor={Colors.game.gold}
                  {...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {})}
                />
              </View>

              {tab === "register" && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPw}
                    onChangeText={setConfirmPw}
                    placeholder="Re-enter password"
                    placeholderTextColor={Colors.game.textMuted}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={64}
                    selectionColor={Colors.game.gold}
                    {...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {})}
                  />
                </View>
              )}

              {/* Submit */}
              <Pressable
                style={[styles.submitBtn, mp.authPending && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={mp.authPending}
              >
                {mp.authPending ? (
                  <ActivityIndicator size="small" color={Colors.game.background} />
                ) : (
                  <Text style={styles.submitBtnTxt}>
                    {tab === "login" ? "LOG IN" : "CREATE ACCOUNT"}
                  </Text>
                )}
              </Pressable>

              {tab === "register" && (
                <Text style={styles.hint}>
                  Usernames: 3-20 chars, letters/numbers/underscores only.
                </Text>
              )}

              <Pressable style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeBtnTxt}>CANCEL</Text>
              </Pressable>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: Colors.game.surfaceAlt,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.game.border,
  },
  handle: {
    width: 36, height: 4,
    backgroundColor: Colors.game.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 14, fontFamily: "Inter_700Bold",
    color: Colors.game.gold, letterSpacing: 3,
    textAlign: "center", marginBottom: 6,
  },
  subtitle: {
    fontSize: 12, fontFamily: "Inter_400Regular",
    color: Colors.game.textMuted, textAlign: "center",
    marginBottom: 20,
  },
  tabs: { flexDirection: "row", gap: 8, marginBottom: 16 },
  tabBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 10,
    backgroundColor: Colors.game.surface,
    borderWidth: 1, borderColor: Colors.game.border,
    alignItems: "center",
  },
  tabBtnActive: {
    borderColor: Colors.game.gold,
    backgroundColor: "rgba(201,168,76,0.12)",
  },
  tabTxt: {
    fontSize: 11, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 1.5,
  },
  tabTxtActive: { color: Colors.game.gold },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(239,68,68,0.10)",
    borderRadius: 8, padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.game.red,
  },
  errorTxt: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.game.red, flex: 1 },
  inputGroup: { marginBottom: 12 },
  inputLabel: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 2, marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.game.surface,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.game.border,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, fontFamily: "Inter_400Regular",
    color: Colors.game.text,
  },
  submitBtn: {
    backgroundColor: Colors.game.gold,
    borderRadius: 12, paddingVertical: 14,
    alignItems: "center", marginTop: 4, marginBottom: 12,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnTxt: {
    fontSize: 13, fontFamily: "Inter_700Bold",
    color: Colors.game.background, letterSpacing: 2,
  },
  hint: {
    fontSize: 10, fontFamily: "Inter_400Regular",
    color: Colors.game.textMuted, textAlign: "center",
    marginBottom: 10,
  },
  closeBtn: {
    backgroundColor: Colors.game.surface, borderRadius: 12,
    paddingVertical: 12, alignItems: "center",
    borderWidth: 1, borderColor: Colors.game.border,
  },
  closeBtnTxt: {
    fontSize: 12, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 2,
  },
  // Logged-in view
  loggedInView: { gap: 14 },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: "rgba(201,168,76,0.12)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: Colors.game.gold,
  },
  loggedInLabel: {
    fontSize: 9, fontFamily: "Inter_700Bold",
    color: Colors.game.textMuted, letterSpacing: 2,
  },
  loggedInName: {
    fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.game.gold,
  },
  loggedInDesc: {
    fontSize: 12, fontFamily: "Inter_400Regular",
    color: Colors.game.textDim, lineHeight: 18,
  },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "rgba(239,68,68,0.10)", borderRadius: 12,
    paddingVertical: 12, borderWidth: 1, borderColor: Colors.game.red,
  },
  logoutBtnTxt: {
    fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.game.red, letterSpacing: 2,
  },
});
