import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) })

export async function prepareNotifications(): Promise<boolean> {
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('care', { name: 'Cuidados do canil', importance: Notifications.AndroidImportance.HIGH, sound: 'default' })
  const current = await Notifications.getPermissionsAsync()
  const permission = current.status === 'granted' ? current : await Notifications.requestPermissionsAsync()
  return permission.status === 'granted'
}

export async function scheduleCareNotification(title: string, body: string, date: Date): Promise<string> {
  if (date.getTime() <= Date.now()) throw new Error('Escolha um horário futuro.')
  if (!(await prepareNotifications())) throw new Error('Autorize as notificações nas configurações do celular.')
  return Notifications.scheduleNotificationAsync({ content: { title, body, sound: 'default' }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: 'care' } })
}
export async function cancelCareNotification(identifier:string|null):Promise<void>{if(identifier)await Notifications.cancelScheduledNotificationAsync(identifier)}

export async function cancelDogFeedingNotifications(dogId: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  for (const item of scheduled) if (item.content.data?.kind === 'feeding' && item.content.data?.dogId === dogId) await Notifications.cancelScheduledNotificationAsync(item.identifier)
}

export async function scheduleDailyFeedingNotification(dogId: string, dogName: string, grams: number, time: string): Promise<string> {
  if (!(await prepareNotifications())) throw new Error('Autorize as notificações nas configurações do celular.')
  const [hour, minute] = time.split(':').map(Number)
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) throw new Error('Horário inválido.')
  return Notifications.scheduleNotificationAsync({ content: { title: `Hora da ração — ${dogName}`, body: `Sirva ${grams} g da ração cadastrada.`, sound: 'default', data: { kind: 'feeding', dogId } }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: 'care' } })
}
