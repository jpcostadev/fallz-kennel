import { z } from 'zod'

export const syncEventSchema = z.object({
  id: z.string().uuid(),
  entityType: z.enum(['dogs', 'health', 'breeding', 'clients', 'finance', 'agenda', 'dog_measurements', 'feeding_plans']),
  entityId: z.string().uuid(),
  operation: z.enum(['create', 'update', 'delete']),
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  deviceId: z.string().uuid()
})

export type SyncEvent = z.infer<typeof syncEventSchema>

export interface SyncSummary {
  pending: number
  lastSync: string | null
  deviceId: string
}

export interface SyncApi {
  sync: {
    summary(): Promise<SyncSummary>
    pending(): Promise<SyncEvent[]>
    markUploaded(eventIds: string[]): Promise<void>
    apply(events: SyncEvent[]): Promise<number>
  }
}
