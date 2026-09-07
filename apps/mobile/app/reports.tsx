import { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { DogPicker } from "../src/DogPicker";
import {
  dogPhotoService,
  dogService,
  feedingService,
  moduleService,
  type FeedingPlan,
  type MobileDog,
  type MobileModuleRecord,
  type WeightRecord,
} from "../src/database";
import { colors, common } from "../src/theme";

export default function Reports() {
  const [dogs, setDogs] = useState<MobileDog[]>([]),
    [dogId, setDogId] = useState<string | null>(null),
    [weights, setWeights] = useState<WeightRecord[]>([]),
    [feeding, setFeeding] = useState<FeedingPlan | null>(null),
    [health, setHealth] = useState<MobileModuleRecord[]>([]),
    [breeding, setBreeding] = useState<MobileModuleRecord[]>([]),
    [photo, setPhoto] = useState<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      void dogService.list().then(setDogs);
    }, []),
  );
  const dog = dogs.find((d) => d.id === dogId);
  async function choose(id: string | null) {
    setDogId(id);
    if (!id) {
      setWeights([]);
      setFeeding(null);
      setHealth([]);
      setBreeding([]);
      setPhoto(null);
      return;
    }
    const [weightRows, plan, healthRows, breedingRows, picture] =
      await Promise.all([
        dogService.weights(id),
        feedingService.find(id),
        moduleService.list("health"),
        moduleService.list("breeding"),
        dogPhotoService.get(id),
      ]);
    setWeights(weightRows);
    setFeeding(plan);
    setHealth(healthRows.filter((row) => row.dogId === id));
    setBreeding(breedingRows.filter((row) => row.dogId === id));
    setPhoto(picture);
  }
  async function pdf() {
    if (!dog) return;
    const rows = weights
      .map(
        (w) =>
          `<tr><td>${new Date(`${w.date}T12:00`).toLocaleDateString("pt-BR")}</td><td>${(w.weightGrams / 1000).toLocaleString("pt-BR")} kg</td><td>${w.bodyConditionScore ?? "—"}/9</td></tr>`,
      )
      .join("");
    const healthRows = health
      .map(
        (item) =>
          `<tr><td>${new Date(`${item.date}T12:00`).toLocaleDateString("pt-BR")}</td><td>${item.category}</td><td>${item.title}</td><td>${item.description || "—"}</td></tr>`,
      )
      .join("");
    const breedingRows = breeding
      .map(
        (item) =>
          `<tr><td>${new Date(`${item.date}T12:00`).toLocaleDateString("pt-BR")}</td><td>${item.category}</td><td>${item.title}</td><td>${item.description || "—"}</td></tr>`,
      )
      .join("");
    const photoData = photo
      ? `data:image/jpeg;base64,${await FileSystem.readAsStringAsync(photo, { encoding: FileSystem.EncodingType.Base64 })}`
      : null;
    const file = await Print.printToFileAsync({
      html: `<html><head><style>body{font-family:Arial;color:#142033;padding:26px}h1{color:#087ff5;margin-bottom:3px}h2{margin-top:26px;border-bottom:2px solid #087ff5;padding-bottom:5px}table{width:100%;border-collapse:collapse}th{background:#e9f3ff;text-align:left}th,td{padding:8px;border:1px solid #ccd6e2}.photo{width:130px;height:130px;border-radius:24px;object-fit:cover;float:right}</style></head><body>${photoData ? `<img class="photo" src="${photoData}"/>` : ""}<h1>Ficha de ${dog.name}</h1><p><b>Registro:</b> ${dog.registeredName || "—"}<br/><b>Nascimento:</b> ${new Date(`${dog.birthDate}T12:00`).toLocaleDateString("pt-BR")}<br/><b>Raça:</b> ${dog.breed}<br/><b>Sexo:</b> ${dog.sex === "female" ? "Fêmea" : "Macho"}<br/><b>Cor:</b> ${dog.color || "—"}</p><h2>Alimentação</h2>${feeding ? `<p><b>Ração:</b> ${feeding.foodName}<br/><b>Porção:</b> ${feeding.gramsPerMeal} g, ${feeding.mealsPerDay}× ao dia (${feeding.dailyGrams} g/dia)<br/><b>Horários:</b> ${feeding.times.join(" · ")}</p>` : "<p>Sem plano cadastrado.</p>"}<h2>Pesagens</h2><table><tr><th>Data</th><th>Peso</th><th>BCS</th></tr>${rows}</table><h2>Saúde e vacinação</h2><table><tr><th>Data/dose</th><th>Tipo</th><th>Vacina/registro</th><th>Marca, lote e observações</th></tr>${healthRows}</table><h2>Reprodução</h2><table><tr><th>Data</th><th>Etapa</th><th>Registro</th><th>Observações</th></tr>${breedingRows}</table><p>${dog.notes || ""}</p></body></html>`,
    });
    await Sharing.shareAsync(file.uri, {
      mimeType: "application/pdf",
      dialogTitle: `Ficha de ${dog.name}`,
    });
  }
  return (
    <SafeAreaView style={common.screen} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={common.content}>
        <Text style={common.eyebrow}>DOCUMENTOS</Text>
        <Text style={common.title}>Relatórios</Text>
        <Text style={common.subtitle}>
          Visualize a ficha completa antes de compartilhar o PDF.
        </Text>
        <Text style={common.label}>SELECIONE O CÃO</Text>
        <DogPicker
          dogs={dogs}
          value={dogId}
          onChange={(id) => void choose(id)}
        />
        {dog && (
          <View style={common.card}>
            {photo && (
              <Image
                source={{ uri: photo }}
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: 28,
                  alignSelf: "center",
                  marginBottom: 14,
                }}
              />
            )}
            <Text
              style={{ color: colors.text, fontSize: 23, fontWeight: "900" }}
            >
              {dog.name}
            </Text>
            <Text style={[common.muted, { marginBottom: 14 }]}>
              {dog.registeredName || "Sem nome de registro"}
            </Text>
            {[
              [
                "Nascimento",
                new Date(`${dog.birthDate}T12:00`).toLocaleDateString("pt-BR"),
              ],
              ["Raça", dog.breed],
              ["Cor", dog.color || "—"],
              ["Peso atual", `${dog.weightKg.toLocaleString("pt-BR")} kg`],
              ["Pesagens", String(weights.length)],
            ].map(([l, v]) => (
              <View
                key={l}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.line,
                }}
              >
                <Text style={common.muted}>{l}</Text>
                <Text style={{ color: colors.text, fontWeight: "800" }}>
                  {v}
                </Text>
              </View>
            ))}
            <Pressable
              style={[common.button, { marginTop: 18 }]}
              onPress={() => void pdf()}
            >
              <Ionicons name="document-outline" size={19} color="white" />
              <Text style={common.buttonText}>Compartilhar PDF / WhatsApp</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
