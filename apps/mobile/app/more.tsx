import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import type { User } from "firebase/auth";
import { login, logout, observeUser, synchronize } from "../src/firebase";
import { syncService } from "../src/database";
import { colors, common } from "../src/theme";

export default function More() {
  const [user, setUser] = useState<User | null>(null),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [pending, setPending] = useState(0);
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
      Alert.alert(
        "Falha na sincronização",
        e instanceof Error ? e.message : "Tente novamente.",
      );
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
      Alert.alert(
        "Não foi possível entrar",
        e instanceof Error ? e.message : "Confira e-mail e senha.",
      );
      setBusy(false);
    }
  }
  return (
    <ScrollView style={common.screen} keyboardShouldPersistTaps="handled">
      <Text style={common.eyebrow}>FIREBASE</Text>
      <Text style={common.title}>Sincronização</Text>
      <Text style={common.subtitle}>
        A mesma conta e os mesmos dados do Desktop.
      </Text>
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
  );
}
