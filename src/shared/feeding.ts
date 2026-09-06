import { z } from 'zod'

export const feedingPlanRecordSchema = z.object({
  id: z.string().uuid(),
  dogId: z.string().uuid(),
  foodName: z.string().trim().min(1).max(160),
  kcalPerKg: z.number().min(500).max(10000),
  dailyGrams: z.number().positive(),
  gramsPerMeal: z.number().positive(),
  mealsPerDay: z.number().int().min(1).max(8),
  times: z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)).min(1).max(8),
  lifeStage: z.enum(['puppy-under-4m', 'puppy-over-4m', 'adult-intact', 'adult-neutered', 'senior']),
  goal: z.enum(['lose', 'maintain', 'gain']),
  adjustmentPercent: z.number().min(-50).max(50),
  createdAt: z.string(), updatedAt: z.string(), deletedAt: z.string().nullable(), version: z.number().int().positive(), deviceId: z.string().uuid()
})
export type FeedingPlanRecord = z.infer<typeof feedingPlanRecordSchema>

export const feedingPlanInputSchema = feedingPlanRecordSchema.pick({ dogId:true,foodName:true,kcalPerKg:true,dailyGrams:true,gramsPerMeal:true,mealsPerDay:true,times:true,lifeStage:true,goal:true,adjustmentPercent:true })
export type FeedingPlanInput = z.infer<typeof feedingPlanInputSchema>
export interface FeedingApi { feeding:{ list():Promise<FeedingPlanRecord[]>; save(input:FeedingPlanInput):Promise<FeedingPlanRecord>; remove(id:string):Promise<void> } }
