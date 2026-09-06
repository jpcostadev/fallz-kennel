import { useCallback, useState } from 'react'
import { Image, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { dogService, reminderService, type MobileDog, type Reminder } from '../src/database'
import { colors, common } from '../src/theme'
import logo from '../../../fallz-kennel.png'

export default function Home() {
  const router=useRouter(), [dogs,setDogs]=useState<MobileDog[]>([]), [reminders,setReminders]=useState<Reminder[]>([])
  useFocusEffect(useCallback(()=>{ void Promise.all([dogService.list(),reminderService.list()]).then(([d,r])=>{setDogs(d);setReminders(r.filter(x=>new Date(x.dateTime)>new Date()))}) },[]))
  const next=reminders[0]
  return <SafeAreaView style={common.screen} edges={['top','left','right']}><ScrollView contentContainerStyle={common.content}>
    <View style={{flexDirection:'row',alignItems:'center',gap:13,marginBottom:20}}><Image source={logo} style={{width:58,height:58,borderRadius:17}} resizeMode="contain"/><View style={{flex:1}}><Text style={common.eyebrow}>CENTRAL DO CANIL</Text><Text style={[common.title,{fontSize:25}]}>Fallz Kennel</Text></View><Pressable style={common.iconButton} onPress={()=>router.push('/agenda')}><Ionicons name="notifications-outline" size={21} color={colors.text}/>{reminders.length>0&&<View style={{position:'absolute',right:8,top:8,width:7,height:7,borderRadius:4,backgroundColor:colors.red}}/>}</Pressable></View>
    <Text style={common.subtitle}>Plantel, alimentação e cuidados em um só lugar.</Text>
    <View style={[common.row,{flexWrap:'nowrap'}]}>
      <Pressable onPress={()=>router.push('/dogs')} style={[common.card,{flex:1}]}><Ionicons name="paw" size={22} color={colors.blue}/><Text style={[common.value,{marginTop:12}]}>{dogs.length}</Text><Text style={common.muted}>cães cadastrados</Text></Pressable>
      <Pressable onPress={()=>router.push('/agenda')} style={[common.card,{flex:1}]}><Ionicons name="notifications" size={22} color={colors.gold}/><Text style={[common.value,{marginTop:12}]}>{reminders.length}</Text><Text style={common.muted}>lembretes ativos</Text></Pressable>
    </View>
    <Text style={{color:colors.text,fontSize:18,fontWeight:'900',marginBottom:12}}>Acesso rápido</Text>
    <View style={[common.row,{flexWrap:'nowrap'}]}>{([
      ['paw-outline','Cães','/dogs'],['scale-outline','Pesagem','/dogs'],['restaurant-outline','Alimentação','/feeding'],['calendar-outline','Agenda','/agenda']
    ] as const).map(([icon,label,path])=><Pressable key={label} onPress={()=>router.push(path)} style={{flex:1,alignItems:'center',gap:8}}><View style={[common.iconButton,{width:54,height:54,borderRadius:17}]}><Ionicons name={icon} size={23} color={colors.blue}/></View><Text style={{color:colors.muted,fontSize:11,fontWeight:'700'}} numberOfLines={1}>{label}</Text></Pressable>)}</View>
    <View style={[common.card,{marginTop:22,borderColor:next?colors.blue:colors.line}]}><View style={{flexDirection:'row',alignItems:'center',gap:12}}><View style={common.iconButton}><Ionicons name="calendar" size={20} color={next?colors.blue:colors.muted}/></View><View style={{flex:1}}><Text style={{color:colors.text,fontWeight:'900',fontSize:17}}>{next?'Próximo cuidado':'Agenda livre'}</Text><Text style={[common.muted,{marginTop:4}]}>{next?`${next.title} • ${new Date(next.dateTime).toLocaleString('pt-BR')}`:'Crie consultas, vacinas e lembretes com notificação.'}</Text></View></View><Pressable style={[common.button,{marginTop:14}]} onPress={()=>router.push('/agenda')}><Ionicons name={next?'open-outline':'add'} size={19} color="white"/><Text style={common.buttonText}>{next?'Abrir agenda':'Criar lembrete'}</Text></Pressable></View>
    <View style={[common.card,{backgroundColor:'#081c18',borderColor:'#174d3e'}]}><View style={{flexDirection:'row',gap:10,alignItems:'center'}}><Ionicons name="cloud-done-outline" size={20} color={colors.green}/><Text style={{color:colors.green,fontWeight:'900'}}>Disponível mesmo sem internet</Text></View><Text style={[common.muted,{marginTop:8}]}>Os dados ficam no celular e sincronizam com o Firebase quando houver conexão.</Text></View>
  </ScrollView></SafeAreaView>
}
