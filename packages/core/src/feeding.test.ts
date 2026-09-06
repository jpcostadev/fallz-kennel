import { describe, expect, it } from 'vitest'
import { calculateFeedingPlan, calculateRer, suggestedMeals, suggestFeedingAdjustment } from './feeding'

describe('feeding calculations', () => {
  it('uses the metabolic RER formula', () => expect(calculateRer(10)).toBeCloseTo(393.64, 1))
  it('converts calories into exact food grams', () => {
    expect(calculateFeedingPlan({ weightKg: 10, foodKcalPerKg: 4000, lifeStage: 'adult-neutered', goal: 'maintain' })).toEqual({
      rerKcal: 394, factor: 1.6, dailyKcal: 630, dailyGrams: 157, gramsPerMeal: 79, mealsPerDay: 2
    })
  })
  it('suggests more meals for puppies', () => {
    expect(suggestedMeals('puppy-under-4m')).toBe(4)
    expect(suggestedMeals('puppy-over-4m')).toBe(3)
  })
  it('rejects absent or implausible label energy', () => {
    expect(() => calculateFeedingPlan({ weightKg: 5, foodKcalPerKg: 0, lifeStage: 'adult-intact', goal: 'maintain' })).toThrow()
  })
  it('limits automatic adjustments to conservative steps',()=>{const result=suggestFeedingAdjustment({previousWeightKg:10,currentWeightKg:10.4,daysBetween:7,bodyConditionScore:6,lifeStage:'adult-neutered',goal:'maintain',currentAdjustmentPercent:0});expect(result.recommendedAdjustmentPercent).toBe(-5);expect(result.weeklyChangePercent).toBe(4)})
  it('does not infer a puppy adjustment from growth alone',()=>{const result=suggestFeedingAdjustment({previousWeightKg:4,currentWeightKg:4.5,daysBetween:7,bodyConditionScore:null,lifeStage:'puppy-under-4m',goal:'gain',currentAdjustmentPercent:0});expect(result.recommendedAdjustmentPercent).toBe(0);expect(result.requiresVeterinarian).toBe(true)})
})
