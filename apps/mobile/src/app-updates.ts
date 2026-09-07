import * as Updates from "expo-updates";

export type UpdateStage =
  "idle" | "checking" | "downloading" | "ready" | "restarting";
export const updateStageLabel: Record<UpdateStage, string> = {
  idle: "Verificar atualização",
  checking: "Verificando...",
  downloading: "Baixando atualização...",
  ready: "Atualização pronta",
  restarting: "Reiniciando...",
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
      message: "O download terminou. Reiniciar agora para aplicar?",
      confirmLabel: "Reiniciar",
      onConfirm: () => {
        setStage("restarting");
        setTimeout(
          () =>
            void Updates.reloadAsync({
              reloadScreenOptions: {
                backgroundColor: "#050a10",
                fade: true,
                spinner: { enabled: true, color: "#1686ff", size: "large" },
              },
            }),
          200,
        );
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
