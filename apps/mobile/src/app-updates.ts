import { Alert } from 'react-native'
import * as Updates from 'expo-updates'

export type UpdateStage = 'idle' | 'checking' | 'downloading' | 'ready' | 'restarting'
export const updateStageLabel: Record<UpdateStage, string> = {
  idle: 'Verificar atualização', checking: 'Verificando...', downloading: 'Baixando atualização...', ready: 'Atualização pronta', restarting: 'Reiniciando...'
}

export async function checkAndInstallUpdate(setStage: (stage: UpdateStage) => void): Promise<void> {
  if (__DEV__) { Alert.alert('Atualizações', 'A verificação funciona no APK instalado.'); return }
  try {
    setStage('checking')
    const update = await Updates.checkForUpdateAsync()
    if (!update.isAvailable) { setStage('idle'); Alert.alert('Tudo atualizado', 'Você já está na versão mais recente.'); return }
    setStage('downloading')
    await Updates.fetchUpdateAsync()
    setStage('ready')
    Alert.alert('Atualização pronta', 'O download terminou. Reiniciar agora para aplicar?', [
      { text: 'Depois', onPress: () => setStage('idle') },
      { text: 'Reiniciar', onPress: () => { setStage('restarting'); setTimeout(() => void Updates.reloadAsync({ reloadScreenOptions: { backgroundColor: '#050a10', fade: true, spinner: { enabled: true, color: '#1686ff', size: 'large' } } }), 200) } }
    ])
  } catch (error) {
    Alert.alert('Falha na atualização', error instanceof Error ? error.message : 'Tente novamente.')
    setStage('idle')
  }
}
