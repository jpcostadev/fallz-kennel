import { useState } from "react";
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { colors, common } from "../src/theme";
import {
  checkAndInstallUpdate,
  updateStageLabel,
  type UpdateStage,
} from "../src/app-updates";
import { ThemedDialog } from "../src/ThemedDialog";
import { scheduleCareNotification } from "../src/notifications";

export default function Settings() {
  const router = useRouter(),
    [refreshing, setRefreshing] = useState(false),
    [updateStage, setUpdateStage] = useState<UpdateStage>("idle"),
    [dialog, setDialog] = useState<{
      title: string;
      message: string;
      confirmLabel?: string;
      onConfirm?: () => void;
    } | null>(null);
  const version = Constants.expoConfig?.version ?? "—";
  async function checkUpdate() {
    setRefreshing(true);
    try {
      await checkAndInstallUpdate(setUpdateStage, setDialog);
    } finally {
      setRefreshing(false);
    }
  }
  async function testNotification() {
    try {
      await scheduleCareNotification(
        "Teste do Fallz Kennel",
        "As notificações do canil estão funcionando.",
        new Date(Date.now() + 5000),
      );
      setDialog({
        title: "Teste agendado",
        message: "A notificação de teste aparecerá em aproximadamente 5 segundos.",
      });
    } catch (error) {
      setDialog({
        title: "Notificação bloqueada",
        message: error instanceof Error ? error.message : "Confira a permissão do aplicativo.",
      });
    }
  }
  return (
    <SafeAreaView style={common.screen} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={common.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void checkUpdate()}
            tintColor={colors.blue}
            colors={[colors.blue]}
          />
        }
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <Pressable style={common.iconButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={21} color={colors.text} />
          </Pressable>
          <View>
            <Text style={common.eyebrow}>PREFERÊNCIAS</Text>
            <Text style={[common.title, { fontSize: 27 }]}>Configurações</Text>
          </View>
        </View>
        <View style={common.card}>
          <Text style={{ color: colors.text, fontWeight: "900", fontSize: 17 }}>
            Atualização do aplicativo
          </Text>
          <Text style={[common.muted, { marginTop: 7, marginBottom: 14 }]}>
            Versão instalada: {version} • {updateStageLabel[updateStage]}
          </Text>
          <Pressable
            style={[common.button, updateStage !== "idle" && { opacity: 0.75 }]}
            onPress={() => void checkUpdate()}
            disabled={updateStage !== "idle"}
          >
            <Ionicons name="cloud-download-outline" size={19} color="white" />
            <Text style={common.buttonText}>
              {updateStageLabel[updateStage]}
            </Text>
          </Pressable>
        </View>
        <View style={common.card}>
          <Text style={{ color: colors.text, fontWeight: "900", fontSize: 17 }}>
            Notificações
          </Text>
          <Text style={[common.muted, { marginTop: 7, marginBottom: 14 }]}>
            Controle a permissão dos lembretes de alimentação, consultas e
            cuidados.
          </Text>
          <Pressable
            style={common.actionButton}
            onPress={() => void Linking.openSettings()}
          >
            <Ionicons
              name="notifications-outline"
              size={19}
              color={colors.blue}
            />
            <Text style={{ color: colors.text, fontWeight: "800" }}>
              Abrir configurações do celular
            </Text>
          </Pressable>
          <Pressable
            style={[common.actionButton, { marginTop: 10 }]}
            onPress={() => void testNotification()}
          >
            <Ionicons name="notifications-circle-outline" size={20} color={colors.blue} />
            <Text style={{ color: colors.text, fontWeight: "800" }}>
              Testar notificação em 5 segundos
            </Text>
          </Pressable>
        </View>
        <View style={common.card}>
          <Text style={{ color: colors.text, fontWeight: "900", fontSize: 17 }}>
            Dados e sincronização
          </Text>
          <Text style={[common.muted, { marginTop: 7, marginBottom: 14 }]}>
            Acesse sua conta Firebase, confira pendências e sincronize os
            dispositivos.
          </Text>
          <Pressable
            style={common.actionButton}
            onPress={() => router.push("/more")}
          >
            <Ionicons
              name="cloud-done-outline"
              size={19}
              color={colors.green}
            />
            <Text style={{ color: colors.text, fontWeight: "800" }}>
              Abrir sincronização
            </Text>
          </Pressable>
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
