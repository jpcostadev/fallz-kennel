import { describe, expect, it } from 'vitest'
import { measurementInputSchema } from './measurement'

const dogId = '018f47d2-bf49-7c68-bd20-34ca3f3d6137'

describe('measurementInputSchema', () => {
  it('aceita quilos e gramas com condição corporal', () => {
    const measurement = measurementInputSchema.parse({ dogId, date: '2026-09-06', kilograms: 4, grams: 650, bodyConditionScore: 5 })
    expect(measurement.kilograms * 1000 + measurement.grams).toBe(4650)
  })

  it('rejeita peso zerado', () => {
    expect(measurementInputSchema.safeParse({ dogId, date: '2026-09-06', kilograms: 0, grams: 0 }).success).toBe(false)
  })
})
