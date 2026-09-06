import { useState } from 'react'
import { Alert, Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import * as Updates from 'expo-updates'
import { colors, common } from '../src/theme'

export default function Settings(){
  const router=useRouter(),[refreshing,setRefreshing]=useState(false)
  const version=Constants.expoConfig?.version??'—'
  async function checkUpdate(){try{setRefreshing(true);if(__DEV__){Alert.alert('Atualizações','A verificação funciona no APK instalado.');return}const update=await Updates.checkForUpdateAsync();if(!update.isAvailable){Alert.alert('Tudo atualizado',`Você está usando a versão ${version}.`);return}await Updates.fetchUpdateAsync();Alert.alert('Atualização pronta','Deseja reiniciar e aplicar agora?',[{text:'Depois'},{text:'Reiniciar',onPress:()=>void Updates.reloadAsync()}])}catch(error){Alert.alert('Falha na atualização',error instanceof Error?error.message:'Tente novamente.')}finally{setRefreshing(false)}}
  return <SafeAreaView style={common.screen} edges={['top','left','right']}><ScrollView contentContainerStyle={common.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>void checkUpdate()} tintColor={colors.blue} colors={[colors.blue]}/> }>
    <View style={{flexDirection:'row',alignItems:'center',gap:12,marginBottom:18}}><Pressable style={common.iconButton} onPress={()=>router.back()}><Ionicons name="arrow-back" size={21} color={colors.text}/></Pressable><View><Text style={common.eyebrow}>PREFERÊNCIAS</Text><Text style={[common.title,{fontSize:27}]}>Configurações</Text></View></View>
    <View style={common.card}><Text style={{color:colors.text,fontWeight:'900',fontSize:17}}>Atualização do aplicativo</Text><Text style={[common.muted,{marginTop:7,marginBottom:14}]}>Versão instalada: {version}</Text><Pressable style={common.button} onPress={()=>void checkUpdate()} disabled={refreshing}><Ionicons name="cloud-download-outline" size={19} color="white"/><Text style={common.buttonText}>{refreshing?'Verificando...':'Verificar atualização'}</Text></Pressable></View>
    <View style={common.card}><Text style={{color:colors.text,fontWeight:'900',fontSize:17}}>Notificações</Text><Text style={[common.muted,{marginTop:7,marginBottom:14}]}>Controle a permissão dos lembretes de alimentação, consultas e cuidados.</Text><Pressable style={common.actionButton} onPress={()=>void Linking.openSettings()}><Ionicons name="notifications-outline" size={19} color={colors.blue}/><Text style={{color:colors.text,fontWeight:'800'}}>Abrir configurações do celular</Text></Pressable></View>
    <View style={common.card}><Text style={{color:colors.text,fontWeight:'900',fontSize:17}}>Dados e sincronização</Text><Text style={[common.muted,{marginTop:7,marginBottom:14}]}>Acesse sua conta Firebase, confira pendências e sincronize os dispositivos.</Text><Pressable style={common.actionButton} onPress={()=>router.push('/more')}><Ionicons name="cloud-done-outline" size={19} color={colors.green}/><Text style={{color:colors.text,fontWeight:'800'}}>Abrir sincronização</Text></Pressable></View>
  </ScrollView></SafeAreaView>
}
