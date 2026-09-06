import { join } from 'node:path'
import { writeFile } from 'node:fs/promises'
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { electronApp, is } from '@electron-toolkit/utils'
import { closeDatabase, dashboardSummary, dogRepository, measurementRepository, moduleRecordRepository, openDatabase, settingsRepository, syncRepository } from './database'
import { createDogSchema } from '../shared/dog'
import { kennelSettingsSchema, moduleRecordInputSchema, operationalModuleSchema, recordIdSchema } from '../shared/module'
import { measurementInputSchema } from '../shared/measurement'
import { syncEventSchema } from '../shared/sync'
import { z } from 'zod'

function registerIpc(): void {
  ipcMain.handle('dogs:list', () => dogRepository.findAll())
  ipcMain.handle('dogs:create', (_event, rawInput: unknown) => dogRepository.create(createDogSchema.parse(rawInput)))
  ipcMain.handle('dogs:update', (_event, id:unknown,rawInput:unknown) => dogRepository.update(recordIdSchema.parse(id),createDogSchema.parse(rawInput)))
  ipcMain.handle('dogs:remove', (_event, id:unknown) => dogRepository.softDelete(recordIdSchema.parse(id)))
  ipcMain.handle('dashboard:summary', () => dashboardSummary())
  ipcMain.handle('records:list', (_event, module: unknown) => moduleRecordRepository.findAll(operationalModuleSchema.parse(module)))
  ipcMain.handle('records:list-by-dog', (_event, dogId: unknown) => moduleRecordRepository.findByDog(recordIdSchema.parse(dogId)))
  ipcMain.handle('records:create', (_event, input: unknown) => moduleRecordRepository.create(moduleRecordInputSchema.parse(input)))
  ipcMain.handle('records:update', (_event, id: unknown, input: unknown) => moduleRecordRepository.update(recordIdSchema.parse(id), moduleRecordInputSchema.parse(input)))
  ipcMain.handle('records:remove', (_event, id: unknown) => moduleRecordRepository.softDelete(recordIdSchema.parse(id)))
  ipcMain.handle('settings:get', () => settingsRepository.get())
  ipcMain.handle('settings:save', (_event, input: unknown) => settingsRepository.save(kennelSettingsSchema.parse(input)))
  ipcMain.handle('reports:dog', (_event, dogId: unknown) => {
    const id = recordIdSchema.parse(dogId)
    const dog = dogRepository.findById(id)
    if (!dog) throw new Error('Cão não encontrado.')
    return { dog, records: moduleRecordRepository.findByDog(id), measurements: measurementRepository.findByDog(id) }
  })
  ipcMain.handle('measurements:list', (_event, dogId: unknown) => measurementRepository.findByDog(recordIdSchema.parse(dogId)))
  ipcMain.handle('measurements:create', (_event, input: unknown) => measurementRepository.create(measurementInputSchema.parse(input)))
  ipcMain.handle('measurements:update', (_event, id: unknown, input: unknown) => measurementRepository.update(recordIdSchema.parse(id), measurementInputSchema.parse(input)))
  ipcMain.handle('measurements:remove', (_event, id: unknown) => measurementRepository.softDelete(recordIdSchema.parse(id)))
  ipcMain.handle('sync:summary', () => syncRepository.summary())
  ipcMain.handle('sync:pending', () => syncRepository.pending())
  ipcMain.handle('sync:mark-uploaded', (_event, ids: unknown) => syncRepository.markUploaded(z.array(recordIdSchema).parse(ids)))
  ipcMain.handle('sync:apply', (_event, events: unknown) => syncRepository.apply(z.array(syncEventSchema).parse(events)))
  ipcMain.handle('reports:export-pdf', async (event, rawTitle: unknown) => {
    const title = typeof rawTitle === 'string' && rawTitle.trim() ? rawTitle.trim().slice(0, 80) : 'Relatório Fallz Kennel'
    const owner = BrowserWindow.fromWebContents(event.sender)
    if (!owner) return null
    const result = await dialog.showSaveDialog(owner, { title: 'Salvar relatório', defaultPath: `${title.replaceAll(/[^a-zA-Z0-9À-ÿ _-]/g, '')}.pdf`, filters: [{ name: 'Documento PDF', extensions: ['pdf'] }] })
    if (result.canceled || !result.filePath) return null
    const pdf = await event.sender.printToPDF({ printBackground: true, pageSize: 'A4' })
    await writeFile(result.filePath, pdf)
    return result.filePath
  })
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#07090d',
    title: 'Fallz Kennel',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  window.on('ready-to-show', () => window.show())
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else window.loadFile(join(__dirname, '../renderer/index.html'))
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.fallzkennel.desktop')
  openDatabase()
  registerIpc()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('before-quit', closeDatabase)
