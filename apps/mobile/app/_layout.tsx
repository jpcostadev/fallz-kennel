import { Tabs } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { colors } from '../src/theme'

export default function Layout() {
  return <><StatusBar style="light"/><Tabs screenOptions={{ headerShown:false, tabBarActiveTintColor:colors.blue, tabBarInactiveTintColor:colors.muted, tabBarStyle:{ backgroundColor:'#08101a',borderTopColor:colors.line,height:66,paddingBottom:8 }, tabBarLabelStyle:{ fontWeight:'700' } }}>
    <Tabs.Screen name="index" options={{ title:'Início' }}/>
    <Tabs.Screen name="dogs" options={{ title:'Cães' }}/>
    <Tabs.Screen name="feeding" options={{ title:'Alimentação' }}/>
    <Tabs.Screen name="agenda" options={{ title:'Agenda' }}/>
    <Tabs.Screen name="more" options={{ title:'Mais' }}/>
  </Tabs></>
}
