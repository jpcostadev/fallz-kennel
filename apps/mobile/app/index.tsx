import { useCallback, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { dogService, reminderService } from '../src/database'
import { colors, common } from '../src/theme'

export default function Home() {
  const [counts,setCounts]=useState({dogs:0,reminders:0})
  useFocusEffect(useCallback(()=>{ void Promise.all([dogService.list(),reminderService.list()]).then(([dogs,reminders])=>setCounts({dogs:dogs.length,reminders:reminders.filter(r=>new Date(r.dateTime)>new Date()).length})) },[]))
  return <ScrollView style={common.screen}><Text style={common.eyebrow}>CENTRAL DO CANIL</Text><Text style={common.title}>Fallz Kennel</Text><Text style={common.subtitle}>Acompanhe seus cães, alimentação e cuidados em qualquer lugar.</Text>
    <View style={common.row}><View style={[common.card,{flex:1}]}><Text style={common.label}>CÃES</Text><Text style={common.value}>{counts.dogs}</Text><Text style={common.muted}>cadastrados</Text></View><View style={[common.card,{flex:1}]}><Text style={common.label}>LEMBRETES</Text><Text style={common.value}>{counts.reminders}</Text><Text style={common.muted}>programados</Text></View></View>
    <View style={common.card}><Text style={{color:colors.green,fontWeight:'800'}}>Offline-first ativo</Text><Text style={[common.muted,{marginTop:8}]}>Seus dados ficam no SQLite do celular e continuam disponíveis sem internet.</Text></View>
    <View style={common.card}><Text style={{color:colors.text,fontWeight:'800',fontSize:18}}>Próximo passo</Text><Text style={[common.muted,{marginTop:8}]}>Cadastre o cão e seu peso. Depois informe as kcal/kg da embalagem para calcular a porção inicial.</Text></View>
  </ScrollView>
}
