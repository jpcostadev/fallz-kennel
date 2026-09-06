export type LifeStage = 'puppy-under-4m' | 'puppy-over-4m' | 'adult-intact' | 'adult-neutered' | 'senior'
export type WeightGoal = 'lose' | 'maintain' | 'gain'

export interface FeedingPlanInput {
  weightKg: number
  foodKcalPerKg: number
  lifeStage: LifeStage
  goal: WeightGoal
  mealsPerDay?: number
  adjustmentPercent?: number
}

export interface FeedingPlanResult {
  rerKcal: number
  factor: number
  dailyKcal: number
  dailyGrams: number
  gramsPerMeal: number
  mealsPerDay: number
}

export interface FeedingAdjustmentInput { previousWeightKg:number; currentWeightKg:number; daysBetween:number; bodyConditionScore:number|null; lifeStage:LifeStage; goal:WeightGoal; currentAdjustmentPercent:number }
export interface FeedingAdjustment { weeklyChangePercent:number; recommendedAdjustmentPercent:number; reason:string; requiresVeterinarian:boolean }

export function suggestFeedingAdjustment(input:FeedingAdjustmentInput):FeedingAdjustment {
  if (input.previousWeightKg<=0||input.currentWeightKg<=0||input.daysBetween<3) throw new Error('São necessárias duas pesagens válidas com pelo menos 3 dias de intervalo.')
  const weekly=((input.currentWeightKg-input.previousWeightKg)/input.previousWeightKg)*(7/input.daysBetween)*100
  const puppy=input.lifeStage.startsWith('puppy')
  let delta=0,reason='Peso e escore corporal estáveis; mantenha a porção e continue acompanhando.',requiresVeterinarian=false
  if(input.bodyConditionScore!==null&&input.bodyConditionScore>5){delta=-5;reason='BCS acima de 5/9: redução conservadora inicial de 5%.'}
  else if(input.bodyConditionScore!==null&&input.bodyConditionScore<4){delta=5;reason='BCS abaixo de 4/9: aumento conservador inicial de 5%.'}
  else if(!puppy&&input.goal==='maintain'&&weekly>1){delta=-5;reason='Ganho superior a 1% por semana com objetivo de manutenção.'}
  else if(!puppy&&input.goal==='maintain'&&weekly< -1){delta=5;reason='Perda superior a 1% por semana com objetivo de manutenção.'}
  else if(puppy){reason='Em filhotes, o crescimento não deve gerar ajuste automático sem BCS e avaliação da curva individual.';requiresVeterinarian=input.bodyConditionScore===null}
  const recommended=Math.max(-20,Math.min(20,input.currentAdjustmentPercent+delta))
  return{weeklyChangePercent:Math.round(weekly*100)/100,recommendedAdjustmentPercent:recommended,reason,requiresVeterinarian}
}

const stageFactors: Record<LifeStage, number> = {
  'puppy-under-4m': 3,
  'puppy-over-4m': 2,
  'adult-intact': 1.8,
  'adult-neutered': 1.6,
  senior: 1.4
}

export function suggestedMeals(lifeStage: LifeStage): number {
  return lifeStage === 'puppy-under-4m' ? 4 : lifeStage === 'puppy-over-4m' ? 3 : 2
}

export function calculateRer(weightKg: number): number {
  if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 150) throw new Error('Peso inválido.')
  return 70 * weightKg ** 0.75
}

export function calculateFeedingPlan(input: FeedingPlanInput): FeedingPlanResult {
  if (!Number.isFinite(input.foodKcalPerKg) || input.foodKcalPerKg < 500 || input.foodKcalPerKg > 10000) {
    throw new Error('Informe as kcal/kg exatamente como aparecem na embalagem.')
  }
  const mealsPerDay = input.mealsPerDay ?? suggestedMeals(input.lifeStage)
  if (!Number.isInteger(mealsPerDay) || mealsPerDay < 1 || mealsPerDay > 8) throw new Error('Quantidade de refeições inválida.')
  const adjustmentPercent = input.adjustmentPercent ?? 0
  if (!Number.isFinite(adjustmentPercent) || adjustmentPercent < -50 || adjustmentPercent > 50) throw new Error('Ajuste inválido.')
  const goalMultiplier = input.goal === 'lose' ? 0.8 : input.goal === 'gain' ? 1.1 : 1
  const rerKcal = calculateRer(input.weightKg)
  const factor = stageFactors[input.lifeStage] * goalMultiplier
  const dailyKcal = rerKcal * factor * (1 + adjustmentPercent / 100)
  const dailyGrams = dailyKcal / (input.foodKcalPerKg / 1000)
  return {
    rerKcal: Math.round(rerKcal),
    factor: Math.round(factor * 100) / 100,
    dailyKcal: Math.round(dailyKcal),
    dailyGrams: Math.round(dailyGrams),
    gramsPerMeal: Math.round(dailyGrams / mealsPerDay),
    mealsPerDay
  }
}
