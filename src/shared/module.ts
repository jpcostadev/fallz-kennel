import { z } from 'zod'

export const operationalModuleSchema = z.enum(['health', 'breeding', 'clients', 'finance', 'agenda'])
export type OperationalModule = z.infer<typeof operationalModuleSchema>

export const moduleRecordInputSchema = z.object({
  module: operationalModuleSchema,
  title: z.string().trim().min(1, 'Informe o título').max(160),
  category: z.string().trim().min(1, 'Selecione uma categoria').max(80),
  date: z.iso.date(),
  description: z.string().trim().max(2000).default(''),
  amount: z.number().nonnegative().nullable().default(null),
  dogId: z.string().uuid().nullable().default(null),
  nextDate: z.union([z.literal(''), z.iso.date()]).default(''),
  phone: z.string().trim().max(30).default(''),
  whatsapp: z.string().trim().max(30).default(''),
  instagram: z.string().trim().max(80).default(''),
  email: z.union([z.literal(''), z.email('Informe um e-mail válido')]).default(''),
  city: z.string().trim().max(80).default(''),
  state: z.string().trim().max(2).default(''),
  cpf: z.string().trim().max(20).default(''),
  transactionType: z.enum(['income', 'expense']).nullable().default(null),
  quantity: z.number().positive().nullable().default(null),
  unit: z.string().trim().max(30).default(''),
  supplier: z.string().trim().max(120).default(''),
  manufacturer: z.string().trim().max(120).default(''),
  batch: z.string().trim().max(80).default(''),
  dose: z.string().trim().max(80).default(''),
  veterinarian: z.string().trim().max(120).default(''),
  clinic: z.string().trim().max(120).default('')
}).superRefine((value, context) => {
  if (value.module === 'health' && !value.dogId) context.addIssue({ code: 'custom', path: ['dogId'], message: 'Selecione o animal' })
  if (value.module === 'finance' && (value.amount === null || value.transactionType === null)) context.addIssue({ code: 'custom', path: ['amount'], message: 'Informe tipo e valor' })
})

export type ModuleRecordFormInput = z.input<typeof moduleRecordInputSchema>
export type ModuleRecordInput = z.output<typeof moduleRecordInputSchema>
export const moduleRecordSchema = moduleRecordInputSchema.and(z.object({ id: z.string().uuid(), createdAt: z.string(), updatedAt: z.string(), deletedAt: z.string().nullable(), version: z.number().int().positive(), deviceId: z.string().uuid() }))

export interface ModuleRecord extends ModuleRecordInput {
  id: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  version: number
  deviceId: string
}

export const recordIdSchema = z.string().uuid()

export interface KennelSettings {
  kennelName: string
  owner: string
  phone: string
  email: string
  city: string
  state: string
  mainBreed: string
}

export const kennelSettingsSchema = z.object({
  kennelName: z.string().trim().min(1).max(120),
  owner: z.string().trim().max(120),
  phone: z.string().trim().max(30),
  email: z.union([z.literal(''), z.email()]),
  city: z.string().trim().max(80),
  state: z.string().trim().max(2),
  mainBreed: z.string().trim().min(1).max(100)
})

export interface ModuleApi {
  records: {
    list(module: OperationalModule): Promise<ModuleRecord[]>
    listByDog(dogId: string): Promise<ModuleRecord[]>
    create(input: ModuleRecordInput): Promise<ModuleRecord>
    update(id: string, input: ModuleRecordInput): Promise<ModuleRecord>
    remove(id: string): Promise<void>
  }
  settings: {
    get(): Promise<KennelSettings>
    save(settings: KennelSettings): Promise<KennelSettings>
  }
  reports: {
    dog(dogId: string): Promise<{ dog: import('./dog').Dog; records: ModuleRecord[]; measurements: import('./measurement').Measurement[] }>
    exportPdf(title: string): Promise<string | null>
  }
}
