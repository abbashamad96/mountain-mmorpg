import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { DragonCrest } from "@/components/ui";
import { useMultiplayer } from "@/context/MultiplayerContext";

const REMEMBER_ME_KEY = "@mountain_remember_username";

type Screen = "auth" | "forgot" | "forgot-sent";
type Tab = "login" | "register";

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AuthModal({ visible, onClose }: AuthModalProps) {
  const mp = useMultiplayer();

  const [tab, setTab] = useState<Tab>("login");
  const [screen, setScreen] = useState<Screen>("auth");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [forgotPending, setForgotPending] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Sync forgot-password sent state
  useEffect(() => {
    if (mp.forgotPasswordSent) setScreen("forgot-sent");
  }, [mp.forgotPasswordSent]);

  // On open: pre-fill remembered username
  useEffect(() => {
    if (visible) {
      setScreen("auth");
      setLocalError(null);
      AsyncStorage.getItem(REMEMBER_ME_KEY).then((saved) => {
        if (saved) { setUsername(saved); setRememberMe(true); }
      });
    }
  }, [visible]);

  useEffect(() => {
    setLocalError(null);
  }, [tab, screen]);

  const handleSubmit = () => {
    setLocalError(null);
    if (!username.trim()) { setLocalError("Username is required."); return; }
    if (!password) { setLocalError("Password is required."); return; }

    if (tab === "register") {
      if (!email.trim()) { setLocalError("Email address is required."); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setLocalError("Enter a valid email address."); return; }
      if (password !== confirmPw) { setLocalError("Passwords do not match."); return; }
      if (password.length < 6) { setLocalError("Password must be at least 6 characters."); return; }
      mp.register(username.trim(), password, null, email.trim());
    } else {
      if (rememberMe) {
        AsyncStorage.setItem(REMEMBER_ME_KEY, username.trim());
      } else {
        AsyncStorage.removeItem(REMEMBER_ME_KEY);
      }
      mp.login(username.trim(), password);
    }
  };

  const handleForgot = async () => {
    setLocalError(null);
    if (!forgotEmail.trim()) { setLocalError("Email address is required."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail.trim())) { setLocalError("Enter a valid email address."); return; }
    setForgotPending(true);
    await mp.forgotPassword(forgotEmail.trim());
    setForgotPending(false);
    if (mp.forgotPasswordError) setLocalError(mp.forgotPasswordError);
  };

  const handleLogout = () => {
    mp.logout();
    setScreen("auth");
    setTab("login");
    setUsername(""); setEmail(""); setPassword(""); setConfirmPw("");
    onClose();
  };

  const goBack = () => {
    setScreen("auth");
    setTab("login");
    setLocalError(null);
    mp.clearForgotState();
  };

  const displayError = localError || mp.authError;

  const mandatory = !mp.isAuthenticated;
  const sessionExpiredBanner = mp.sessionExpired && tab === "login" && screen === "auth";

  const handleOverlayPress = () => {
    if (mandatory) return;
    onClose();
  };

  // ── Logged-in view ─────────────────────────────────────────────────────────
  if (mp.isAuthenticated) {
    return (
      <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
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
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={mandatory ? undefined : onClose}>
      <Pressable style={styles.overlay} onPress={handleOverlayPress}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          {/* ── Forgot password form ──────────────────────────────────── */}
          {screen === "forgot" && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.iconRow}>
                <Feather name="unlock" size={28} color={Colors.game.gold} />
              </View>
              <Text style={styles.title}>FORGOT PASSWORD</Text>
              <Text style={styles.subtitle}>Enter your email and we'll send a reset link.</Text>
              {displayError && (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={13} color={Colors.game.red} />
                  <Text style={styles.errorTxt}>{displayError}</Text>
                </View>
              )}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  placeholder="your@email.com"
                  placeholderTextColor={Colors.game.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  selectionColor={Colors.game.gold}
                  {...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {})}
                />
              </View>
              <Pressable
                style={[styles.submitBtn, forgotPending && styles.submitBtnDisabled]}
                onPress={handleForgot}
                disabled={forgotPending}
              >
                {forgotPending ? (
                  <ActivityIndicator size="small" color={Colors.game.background} />
                ) : (
                  <Text style={styles.submitBtnTxt}>SEND RESET LINK</Text>
                )}
              </Pressable>
              <Pressable style={styles.closeBtn} onPress={goBack}>
                <Text style={styles.closeBtnTxt}>BACK TO LOGIN</Text>
              </Pressable>
            </ScrollView>
          )}

          {/* ── Forgot password sent ──────────────────────────────────── */}
          {screen === "forgot-sent" && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.iconRow}>
                <Feather name="mail" size={32} color={Colors.game.green} />
              </View>
              <Text style={styles.title}>CHECK YOUR EMAIL</Text>
              <Text style={styles.subtitle}>
                If an account with that email exists, we've sent a password reset link.
              </Text>
              <Text style={styles.hint}>
                The link expires in 1 hour. Check your spam folder if you don't see it.
              </Text>
              <Pressable style={[styles.submitBtn, { marginTop: 8 }]} onPress={goBack}>
                <Text style={styles.submitBtnTxt}>BACK TO LOGIN</Text>
              </Pressable>
            </ScrollView>
          )}

          {/* ── Main auth form ────────────────────────────────────────── */}
          {screen === "auth" && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <DragonCrest width={200} style={styles.crest} />
              <Text style={styles.title}>MOUNTAIN ACCOUNT</Text>
              <Text style={styles.subtitle}>
                {mandatory
                  ? "Create an account or sign in to play"
                  : "Save your progress & play from any device"}
              </Text>

              {/* Session expired notice */}
              {sessionExpiredBanner && (
                <View style={styles.sessionExpiredBox}>
                  <Feather name="clock" size={13} color={Colors.game.gold} />
                  <Text style={styles.sessionExpiredTxt}>
                    Your session expired. Please log in to continue.
                  </Text>
                </View>
              )}

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

              {/* Username */}
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

              {/* Email (register only) */}
              {tab === "register" && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="your@email.com"
                    placeholderTextColor={Colors.game.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    maxLength={100}
                    selectionColor={Colors.game.gold}
                    {...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {})}
                  />
                </View>
              )}

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={tab === "register" ? "Min. 6 characters" : "Your password"}
                  placeholderTextColor={Colors.game.textMuted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={64}
                  selectionColor={Colors.game.gold}
                  {...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {})}
                />
              </View>

              {/* Confirm password (register only) */}
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

              {/* Remember me (login only) */}
              {tab === "login" && (
                <Pressable style={styles.rememberRow} onPress={() => setRememberMe((v) => !v)}>
                  <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                    {rememberMe && <Feather name="check" size={10} color="#fff" />}
                  </View>
                  <Text style={styles.rememberLabel}>Remember my username</Text>
                </Pressable>
              )}

              {/* Forgot password (login only) */}
              {tab === "login" && (
                <Pressable
                  style={styles.forgotLink}
                  onPress={() => { setLocalError(null); setScreen("forgot"); }}
                >
                  <Text style={styles.forgotLinkTxt}>Forgot password?</Text>
                </Pressable>
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
                  Usernames: 3-20 chars, letters/numbers/underscores.{"\n"}
                  Your email is used for password recovery only.
                </Text>
              )}

              {!mandatory && (
                <Pressable style={styles.closeBtn} onPress={onClose}>
                  <Text style={styles.closeBtnTxt}>CANCEL</Text>
                </Pressable>
              )}
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
    backgroundColor: "rgba(0,0,0,0.85)",
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
    maxHeight: "90%",
  },
  handle: {
    width: 36, height: 4,
    backgroundColor: Colors.game.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  iconRow: {
    alignItems: "center",
    marginBottom: 16,
    padding: 14,
    backgroundColor: "rgba(201,168,76,0.1)",
    borderRadius: 50,
    alignSelf: "center",
    width: 64, height: 64,
    justifyContent: "center",
  },
  crest: {
    alignSelf: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 14, fontFamily: "Inter_700Bold",
    color: Colors.game.gold, letterSpacing: 3,
    textAlign: "center", marginBottom: 6,
  },
  subtitle: {
    fontSize: 12, fontFamily: "Inter_400Regular",
    color: Colors.game.textMuted, textAlign: "center",
    marginBottom: 20, lineHeight: 18,
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
  successBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(34,197,94,0.10)",
    borderRadius: 8, padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.game.green,
  },
  successTxt: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.game.green, flex: 1 },
  sessionExpiredBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(201,168,76,0.10)",
    borderRadius: 8, padding: 10, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.game.gold + "88",
  },
  sessionExpiredTxt: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.game.gold, flex: 1 },
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
  forgotLink: {
    alignSelf: "flex-end",
    marginBottom: 12,
    marginTop: -4,
  },
  forgotLinkTxt: {
    fontSize: 11, fontFamily: "Inter_500Medium",
    color: Colors.game.gold, opacity: 0.8,
  },
  rememberRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    alignSelf: "flex-start",
  },
  checkbox: {
    width: 16, height: 16, borderRadius: 4,
    borderWidth: 1.5, borderColor: Colors.game.border,
    alignItems: "center", justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: Colors.game.green,
    borderColor: Colors.game.green,
  },
  rememberLabel: {
    fontSize: 11, fontFamily: "Inter_500Medium",
    color: Colors.game.textMuted,
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
  secondaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "rgba(201,168,76,0.1)", borderRadius: 12,
    paddingVertical: 12, borderWidth: 1, borderColor: Colors.game.gold + "55",
    marginBottom: 10,
  },
  secondaryBtnTxt: {
    fontSize: 12, fontFamily: "Inter_700Bold",
    color: Colors.game.gold, letterSpacing: 1.5,
  },
  hint: {
    fontSize: 10, fontFamily: "Inter_400Regular",
    color: Colors.game.textMuted, textAlign: "center",
    marginBottom: 10, lineHeight: 15,
  },
  closeBtn: {
    backgroundColor: Colors.game.surface, borderRadius: 12,
    paddingVertical: 12, alignItems: "center",
    borderWidth: 1, borderColor: Colors.game.border,
    marginBottom: 4,
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
