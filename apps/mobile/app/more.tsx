import { useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import type { User } from "firebase/auth";
import { login, logout, observeUser, synchronize } from "../src/firebase";
import { syncService } from "../src/database";
import { colors, common } from "../src/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  checkAndInstallUpdate,
  updateStageLabel,
  type UpdateStage,
} from "../src/app-updates";
import { ThemedDialog } from "../src/ThemedDialog";

export default function More() {
  const [user, setUser] = useState<User | null>(null),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [pending, setPending] = useState(0);
  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm?: () => void;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [updateStage, setUpdateStage] = useState<UpdateStage>("idle");
  useEffect(() => {
    void syncService.summary().then((s) => setPending(s.pending));
    return observeUser(setUser);
  }, []);
  async function sync() {
    try {
      setBusy(true);
      const r = await synchronize();
      setPending(r.summary.pending);
      setStatus(`${r.uploaded} enviada(s), ${r.downloaded} recebida(s).`);
    } catch (e) {
      setDialog({
        title: "Falha na sincronização",
        message: e instanceof Error ? e.message : "Tente novamente.",
      });
    } finally {
      setBusy(false);
    }
  }
  async function enter() {
    try {
      setBusy(true);
      await login(email, password);
      setPassword("");
      await sync();
    } catch (e) {
      setDialog({
        title: "Não foi possível entrar",
        message: e instanceof Error ? e.message : "Confira e-mail e senha.",
      });
      setBusy(false);
    }
  }
  async function checkUpdate() {
    await checkAndInstallUpdate(setUpdateStage, setDialog);
  }
  async function refresh() {
    setRefreshing(true);
    try {
      setPending((await syncService.summary()).pending);
    } finally {
      setRefreshing(false);
    }
  }
  return (
    <SafeAreaView style={common.screen} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={common.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.blue}
            colors={[colors.blue]}
          />
        }
      >
        <Text style={common.eyebrow}>FIREBASE</Text>
        <Text style={common.title}>Sincronização</Text>
        <Text style={common.subtitle}>
          A mesma conta e os mesmos dados do Desktop.
        </Text>
        <View style={common.card}>
          <Text style={{ color: colors.text, fontWeight: "800", fontSize: 17 }}>
            Atualização do aplicativo
          </Text>
          <Text style={[common.muted, { marginTop: 8, marginBottom: 14 }]}>
            {updateStage === "idle"
              ? "Baixe melhorias sem reinstalar o APK."
              : updateStageLabel[updateStage]}
          </Text>
          <Pressable
            style={[common.button, updateStage !== "idle" && { opacity: 0.75 }]}
            disabled={updateStage !== "idle"}
            onPress={() => void checkUpdate()}
          >
            <Ionicons
              name={
                updateStage === "ready"
                  ? "checkmark-circle-outline"
                  : "cloud-download-outline"
              }
              size={19}
              color="white"
            />
            <Text style={common.buttonText}>
              {updateStageLabel[updateStage]}
            </Text>
          </Pressable>
        </View>
        <View style={common.card}>
          {user ? (
            <>
              <Text style={{ color: colors.green, fontWeight: "800" }}>
                Conectado
              </Text>
              <Text style={[common.muted, { marginVertical: 10 }]}>
                {user.email}
              </Text>
              <Text style={common.muted}>
                {pending} alteração(ões) pendente(s)
              </Text>
              <Pressable
                style={[common.button, { marginTop: 14 }]}
                disabled={busy}
                onPress={() => void sync()}
              >
                <Text style={common.buttonText}>
                  {busy ? "Sincronizando..." : "Sincronizar agora"}
                </Text>
              </Pressable>
              <Pressable
                style={{ padding: 14, alignItems: "center" }}
                onPress={() => void logout()}
              >
                <Text style={{ color: colors.muted }}>Desconectar</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={common.label}>E-MAIL</Text>
              <TextInput
                style={common.input}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <Text style={common.label}>SENHA</Text>
              <TextInput
                style={common.input}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <Pressable
                style={common.button}
                disabled={busy}
                onPress={() => void enter()}
              >
                <Text style={common.buttonText}>
                  {busy ? "Conectando..." : "Entrar e sincronizar"}
                </Text>
              </Pressable>
            </>
          )}
        </View>
        {status && (
          <View style={[common.card, { borderColor: colors.green }]}>
            <Text style={{ color: colors.green }}>{status}</Text>
          </View>
        )}
        <View style={common.card}>
          <Text style={{ color: colors.text, fontWeight: "800" }}>
            Privacidade
          </Text>
          <Text style={[common.muted, { marginTop: 8 }]}>
            A senha vai diretamente ao Firebase e não é gravada no SQLite.
          </Text>
        </View>
      </ScrollView>
      <ThemedDialog
        visible={!!dialog}
        title={dialog?.title ?? ""}
        message={dialog?.message ?? ""}
        onClose={() => {
          setDialog(null);
          if (updateStage === "ready") setUpdateStage("idle");
        }}
        onConfirm={dialog?.onConfirm}
        confirmLabel={dialog?.confirmLabel}
      />
    </SafeAreaView>
  );
}
