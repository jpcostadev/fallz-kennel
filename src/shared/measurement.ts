import { z } from 'zod'

export const measurementInputSchema = z.object({
  dogId: z.string().uuid(),
  date: z.iso.date(),
  kilograms: z.number().int().min(0).max(150),
  grams: z.number().int().min(0).max(999),
  height: z.number().positive().max(150).nullable().default(null),
  chestCircumference: z.number().positive().max(250).nullable().default(null),
  headCircumference: z.number().positive().max(150).nullable().default(null),
  bodyConditionScore: z.number().int().min(1).max(9).nullable().default(null),
  notes: z.string().trim().max(2000).default('')
}).refine((value) => value.kilograms > 0 || value.grams > 0, { path: ['kilograms'], message: 'Informe um peso maior que zero' })

export type MeasurementFormInput = z.input<typeof measurementInputSchema>
export type MeasurementInput = z.output<typeof measurementInputSchema>
export const measurementRecordSchema = measurementInputSchema.and(z.object({ id: z.string().uuid(), weightGrams: z.number().int().positive(), ageDays: z.number().int().nonnegative(), createdAt: z.string(), updatedAt: z.string(), deletedAt: z.string().nullable(), version: z.number().int().positive(), deviceId: z.string().uuid() }))

export interface Measurement extends MeasurementInput {
  id: string
  weightGrams: number
  ageDays: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  version: number
  deviceId: string
}

export interface MeasurementApi {
  measurements: {
    list(dogId: string): Promise<Measurement[]>
    create(input: MeasurementInput): Promise<Measurement>
    update(id: string, input: MeasurementInput): Promise<Measurement>
    remove(id: string): Promise<void>
  }
}
