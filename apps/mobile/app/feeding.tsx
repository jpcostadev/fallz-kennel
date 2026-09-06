import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  calculateFeedingPlan,
  suggestFeedingAdjustment,
  type LifeStage,
  type WeightGoal,
} from "@fallz/core";
import { dogService, feedingService, type MobileDog, type WeightRecord } from "../src/database";
import { cancelDogFeedingNotifications, scheduleDailyFeedingNotification } from "../src/notifications";
import { colors, common } from "../src/theme";

const stages: Array<[LifeStage, string]> = [
  ["puppy-under-4m", "Filhote até 4 meses"],
  ["puppy-over-4m", "Filhote após 4 meses"],
  ["adult-intact", "Adulto inteiro"],
  ["adult-neutered", "Adulto castrado"],
  ["senior", "Idoso"],
];
export default function Feeding() {
  const [dogs, setDogs] = useState<MobileDog[]>([]);
  const [dogId, setDogId] = useState("");
  const [foodName, setFoodName] = useState("");
  const [kcal, setKcal] = useState("");
  const [stage, setStage] = useState<LifeStage>("puppy-under-4m");
  const [goal, setGoal] = useState<WeightGoal>("maintain");
  const [meals, setMeals] = useState("4");
  const [times, setTimes] = useState("07:00, 11:00, 15:00, 19:00");
  const [adjustment, setAdjustment] = useState(0);
  const [weightHistory, setWeightHistory] = useState<WeightRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  useFocusEffect(
    useCallback(() => {
      void dogService.list().then((rows) => {
        setDogs(rows);
        setDogId((current) => current || rows[0]?.id || "");
      });
    }, []),
  );
  const dog = dogs.find((item) => item.id === dogId);
  const refresh=async()=>{setRefreshing(true);try{const rows=await dogService.list();setDogs(rows);if(dogId)setWeightHistory(await dogService.weights(dogId))}finally{setRefreshing(false)}};
  useEffect(() => { if (!dogId) return; void Promise.all([feedingService.find(dogId),dogService.weights(dogId)]).then(([saved,history]) => { setWeightHistory(history); if (!saved) { setAdjustment(0); return; } setFoodName(saved.foodName); setKcal(String(saved.kcalPerKg)); setStage(saved.lifeStage); setGoal(saved.goal); setMeals(String(saved.mealsPerDay)); setTimes(saved.times.join(", ")); setAdjustment(saved.adjustmentPercent); }); }, [dogId]);
  const plan = useMemo(() => {
    try {
      return dog
        ? calculateFeedingPlan({
            weightKg: dog.weightKg,
            foodKcalPerKg: Number(kcal.replace(",", ".")),
            lifeStage: stage,
            goal,
            mealsPerDay: Number(meals),
            adjustmentPercent: adjustment,
          })
        : null;
    } catch {
      return null;
    }
  }, [dog, kcal, stage, goal, meals, adjustment]);
  const recommendation = useMemo(() => { try { if (weightHistory.length < 2) return null; const previous=weightHistory.at(-2)!,current=weightHistory.at(-1)!,elapsed=Math.max(1,Math.round((Date.parse(current.date)-Date.parse(previous.date))/86400000)); return suggestFeedingAdjustment({previousWeightKg:previous.weightGrams/1000,currentWeightKg:current.weightGrams/1000,daysBetween:elapsed,bodyConditionScore:current.bodyConditionScore,lifeStage:stage,goal,currentAdjustmentPercent:adjustment}); } catch { return null; } },[weightHistory,stage,goal,adjustment]);
  async function save() {
    try {
      if (!dog || !plan || !foodName.trim())
        throw new Error(
          "Selecione o cão e preencha ração, kcal/kg e refeições.",
        );
      const parsedTimes = times
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (parsedTimes.length !== plan.mealsPerDay)
        throw new Error(
          `Informe exatamente ${plan.mealsPerDay} horários separados por vírgula.`,
        );
      await cancelDogFeedingNotifications(dog.id);
      for (const time of parsedTimes)
        await scheduleDailyFeedingNotification(
          dog.id,
          dog.name,
          plan.gramsPerMeal,
          time,
        );
      await feedingService.save({
        dogId: dog.id,
        foodName,
        kcalPerKg: Number(kcal.replace(",", ".")),
        dailyGrams: plan.dailyGrams,
        gramsPerMeal: plan.gramsPerMeal,
        mealsPerDay: plan.mealsPerDay,
        times: parsedTimes,
        lifeStage: stage,
        goal,
        adjustmentPercent: adjustment,
      });
      Alert.alert(
        "Plano salvo",
        `${plan.gramsPerMeal} g, ${plan.mealsPerDay} vezes ao dia. Lembretes programados.`,
      );
    } catch (error) {
      Alert.alert(
        "Não foi possível salvar",
        error instanceof Error ? error.message : "Confira os dados.",
      );
    }
  }
  return (
    <SafeAreaView style={common.screen} edges={["top","left","right"]}><ScrollView contentContainerStyle={common.content} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>void refresh()} tintColor={colors.blue} colors={[colors.blue]}/> }>
      <Text style={common.eyebrow}>NUTRIÇÃO</Text>
      <Text style={common.title}>Alimentação</Text>
      <Text style={common.subtitle}>
        Estimativa inicial baseada no peso e na energia da ração.
      </Text>
      <Text style={common.label}>SELECIONE O CÃO</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 14 }}
      >
        {dogs.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setDogId(item.id)}
            style={[
              common.card,
              { marginRight: 10, minWidth: 130 },
              dogId === item.id && common.selected,
            ]}
          >
            <Text style={{ color: colors.text, fontWeight: "800" }}>
              {item.name}
            </Text>
            <Text style={common.muted}>{item.weightKg} kg</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={common.card}>
        <Text style={common.label}>RAÇÃO</Text>
        <TextInput
          style={common.input}
          value={foodName}
          onChangeText={setFoodName}
          placeholder="Marca e linha"
          placeholderTextColor={colors.muted}
        />
        <Text style={common.label}>ENERGIA DA EMBALAGEM (KCAL/KG)</Text>
        <TextInput
          style={common.input}
          value={kcal}
          onChangeText={setKcal}
          keyboardType="number-pad"
          placeholder="Ex.: 3850"
          placeholderTextColor={colors.muted}
        />
        <Text style={common.label}>FASE</Text>
        {stages.map(([value, label]) => (
          <Pressable
            key={value}
            onPress={() => {
              setStage(value);
              setMeals(
                value === "puppy-under-4m"
                  ? "4"
                  : value === "puppy-over-4m"
                    ? "3"
                    : "2",
              );
            }}
            style={[
              common.card,
              { padding: 12 },
              stage === value && common.selected,
            ]}
          >
            <Text style={{ color: colors.text }}>{label}</Text>
          </Pressable>
        ))}
        <Text style={common.label}>OBJETIVO</Text>
        <View style={[common.row, { marginBottom: 12 }]}>
          {(
            [
              ["lose", "Perder"],
              ["maintain", "Manter"],
              ["gain", "Ganhar"],
            ] as const
          ).map(([value, label]) => (
            <Pressable
              key={value}
              onPress={() => setGoal(value)}
              style={[
                common.card,
                { flex: 1, padding: 10 },
                goal === value && common.selected,
              ]}
            >
              <Text style={{ color: colors.text, textAlign: "center" }}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={common.label}>REFEIÇÕES POR DIA</Text>
        <TextInput
          style={common.input}
          value={meals}
          onChangeText={setMeals}
          keyboardType="number-pad"
        />
        <Text style={common.label}>HORÁRIOS, SEPARADOS POR VÍRGULA</Text>
        <TextInput style={common.input} value={times} onChangeText={setTimes} />
      </View>
      {plan && (
        <View style={[common.card, { borderColor: colors.blue }]}>
          <Text style={common.label}>PORÇÃO CALCULADA</Text>
          <Text style={[common.value, { color: colors.blue }]}>
            {plan.gramsPerMeal} g por refeição
          </Text>
          <Text style={[common.muted, { marginTop: 7 }]}>
            {plan.mealsPerDay}× ao dia · {plan.dailyGrams} g/dia ·{" "}
            {plan.dailyKcal} kcal/dia
          </Text>
          <Text style={[common.muted, { marginTop: 7 }]}>
            RER: {plan.rerKcal} kcal · fator inicial: {plan.factor}
          </Text>
        </View>
      )}
      {recommendation && (
        <View style={[common.card, { borderColor: colors.green }]}>
          <Text style={{ color: colors.green, fontWeight: "800" }}>AJUSTE PELA EVOLUÇÃO</Text>
          <Text style={[common.muted, { marginTop: 7 }]}>Variação: {recommendation.weeklyChangePercent.toLocaleString("pt-BR")}%/semana. {recommendation.reason}</Text>
          <Text style={[common.value, { marginTop: 10 }]}>{recommendation.recommendedAdjustmentPercent > 0 ? "+" : ""}{recommendation.recommendedAdjustmentPercent}%</Text>
          {recommendation.recommendedAdjustmentPercent !== adjustment && <Pressable style={[common.button, { marginTop: 12 }]} onPress={() => setAdjustment(recommendation.recommendedAdjustmentPercent)}><Text style={common.buttonText}>Aplicar ajuste sugerido</Text></Pressable>}
        </View>
      )}
      <View style={[common.card, { borderColor: "#5a4721" }]}>
        <Text style={{ color: "#f6c453", fontWeight: "800" }}>Importante</Text>
        <Text style={[common.muted, { marginTop: 7 }]}>
          É uma estimativa inicial, não uma prescrição. Filhotes, gestantes,
          animais doentes ou fora do escore corporal ideal precisam de avaliação
          veterinária. Reavalie peso e BCS regularmente.
        </Text>
      </View>
      <Pressable
        style={[common.button, { marginBottom: 40 }]}
        onPress={() => void save()}
      >
        <Ionicons name="save-outline" size={19} color="white" /><Text style={common.buttonText}>Salvar e criar lembretes</Text>
      </Pressable>
    </ScrollView></SafeAreaView>
  );
}
