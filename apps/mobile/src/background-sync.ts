import * as BackgroundTask from 'expo-background-task'
import * as TaskManager from 'expo-task-manager'
import { synchronize } from './firebase'

const DATABASE_SYNC_TASK = 'fallz-kennel-database-sync'

TaskManager.defineTask(DATABASE_SYNC_TASK, async () => {
  try {
    await synchronize()
    return BackgroundTask.BackgroundTaskResult.Success
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed
  }
})

export async function registerBackgroundDatabaseSync(): Promise<void> {
  const available = await BackgroundTask.getStatusAsync()
  if (available !== BackgroundTask.BackgroundTaskStatus.Available) return
  if (await TaskManager.isTaskRegisteredAsync(DATABASE_SYNC_TASK)) return
  await BackgroundTask.registerTaskAsync(DATABASE_SYNC_TASK, { minimumInterval: 15 })
}
