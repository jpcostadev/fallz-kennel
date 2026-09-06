import { z } from 'zod'
import type { ModuleApi } from './module'
import type { MeasurementApi } from './measurement'
import type { SyncApi } from './sync'

export const dogSexSchema = z.enum(['male', 'female'])
export const dogStatusSchema = z.enum(['puppy', 'young', 'adult', 'breeder', 'retired', 'sold', 'deceased'])

export const createDogSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome').max(80),
  registeredName: z.string().trim().max(160).optional().default(''),
  sex: dogSexSchema,
  birthDate: z.iso.date(),
  breed: z.string().trim().min(1, 'Informe a raça').max(100),
  color: z.string().trim().max(80).optional().default(''),
  status: dogStatusSchema.default('puppy'),
  notes: z.string().trim().max(2000).optional().default('')
})

export const dogRecordSchema = createDogSchema.extend({ id: z.string().uuid(), createdAt: z.string(), updatedAt: z.string(), deletedAt: z.string().nullable(), version: z.number().int().positive(), deviceId: z.string().uuid() })

export type CreateDogFormInput = z.input<typeof createDogSchema>
export type CreateDogInput = z.output<typeof createDogSchema>
export type DogSex = z.infer<typeof dogSexSchema>
export type DogStatus = z.infer<typeof dogStatusSchema>

export interface Dog extends CreateDogInput {
  id: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  version: number
  deviceId: string
}

export interface DashboardSummary {
  activeDogs: number
  males: number
  females: number
  puppies: number
}

export interface FallzApi extends ModuleApi, MeasurementApi, SyncApi {
  dogs: {
    list(): Promise<Dog[]>
    create(input: CreateDogInput): Promise<Dog>
    update(id:string,input:CreateDogInput):Promise<Dog>
    remove(id:string):Promise<void>
  }
  dashboard: { summary(): Promise<DashboardSummary> }
}
