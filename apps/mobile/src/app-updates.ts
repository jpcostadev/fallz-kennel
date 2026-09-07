import * as Updates from "expo-updates";
import { BackHandler, Platform } from "react-native";

export type UpdateStage =
  "idle" | "checking" | "downloading" | "ready" | "restarting";
export const updateStageLabel: Record<UpdateStage, string> = {
  idle: "Verificar atualização",
  checking: "Verificando...",
  downloading: "Baixando atualização...",
  ready: "Atualização pronta",
  restarting: "Fechando para aplicar...",
};

type ShowDialog = (dialog: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm?: () => void;
}) => void;
export async function checkAndInstallUpdate(
  setStage: (stage: UpdateStage) => void,
  showDialog: ShowDialog,
): Promise<void> {
  if (__DEV__) {
    showDialog({
      title: "Atualizações",
      message: "A verificação funciona no APK instalado.",
    });
    return;
  }
  try {
    setStage("checking");
    const update = await Updates.checkForUpdateAsync();
    if (!update.isAvailable) {
      setStage("idle");
      showDialog({
        title: "Tudo atualizado",
        message: "Você já está na versão mais recente.",
      });
      return;
    }
    setStage("downloading");
    await Updates.fetchUpdateAsync();
    setStage("ready");
    showDialog({
      title: "Atualização pronta",
      message:
        Platform.OS === "android"
          ? "O download terminou. O aplicativo será fechado com segurança. Abra-o novamente para aplicar a atualização."
          : "O download terminou. Feche e abra o aplicativo novamente para aplicar a atualização.",
      confirmLabel: Platform.OS === "android" ? "Fechar aplicativo" : "Entendi",
      onConfirm: () => {
        if (Platform.OS === "android") {
          setStage("restarting");
          setTimeout(() => BackHandler.exitApp(), 200);
        } else setStage("idle");
      },
    });
  } catch (error) {
    showDialog({
      title: "Falha na atualização",
      message: error instanceof Error ? error.message : "Tente novamente.",
    });
    setStage("idle");
  }
}
