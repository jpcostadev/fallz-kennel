import { contextBridge, ipcRenderer } from 'electron'
import type { CreateDogInput, FallzApi } from '../shared/dog'
import type { KennelSettings, ModuleRecordInput, OperationalModule } from '../shared/module'
import type { MeasurementInput } from '../shared/measurement'
import type { SyncEvent } from '../shared/sync'

const api: FallzApi = {
  dogs: {
    list: () => ipcRenderer.invoke('dogs:list'),
    create: (input: CreateDogInput) => ipcRenderer.invoke('dogs:create', input),
    update: (id:string,input:CreateDogInput) => ipcRenderer.invoke('dogs:update',id,input),
    remove: (id:string) => ipcRenderer.invoke('dogs:remove',id)
  },
  dashboard: { summary: () => ipcRenderer.invoke('dashboard:summary') },
  records: {
    list: (module: OperationalModule) => ipcRenderer.invoke('records:list', module),
    listByDog: (dogId: string) => ipcRenderer.invoke('records:list-by-dog', dogId),
    create: (input: ModuleRecordInput) => ipcRenderer.invoke('records:create', input),
    update: (id: string, input: ModuleRecordInput) => ipcRenderer.invoke('records:update', id, input),
    remove: (id: string) => ipcRenderer.invoke('records:remove', id)
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (settings: KennelSettings) => ipcRenderer.invoke('settings:save', settings)
  },
  measurements: {
    list: (dogId: string) => ipcRenderer.invoke('measurements:list', dogId),
    create: (input: MeasurementInput) => ipcRenderer.invoke('measurements:create', input),
    update: (id: string, input: MeasurementInput) => ipcRenderer.invoke('measurements:update', id, input),
    remove: (id: string) => ipcRenderer.invoke('measurements:remove', id)
  },
  sync: {
    summary: () => ipcRenderer.invoke('sync:summary'),
    pending: () => ipcRenderer.invoke('sync:pending'),
    markUploaded: (ids: string[]) => ipcRenderer.invoke('sync:mark-uploaded', ids),
    apply: (events: SyncEvent[]) => ipcRenderer.invoke('sync:apply', events)
  },
  reports: {
    dog: (dogId: string) => ipcRenderer.invoke('reports:dog', dogId),
    exportPdf: (title: string) => ipcRenderer.invoke('reports:export-pdf', title)
  }
}

contextBridge.exposeInMainWorld('fallz', api)
