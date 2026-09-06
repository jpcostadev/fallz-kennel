import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { dogService, type MobileDog, type WeightRecord } from "../src/database";
import { colors, common } from "../src/theme";

export default function Dogs() {
  const [dogs, setDogs] = useState<MobileDog[]>([]),
    [name, setName] = useState(""),
    [breed, setBreed] = useState("American Bully Standard"),
    [birthDate, setBirthDate] = useState(""),
    [weight, setWeight] = useState(""),
    [sex, setSex] = useState<"male" | "female">("male"),
    [editing, setEditing] = useState<string | null>(null),
    [editingWeight, setEditingWeight] = useState<string | null>(null),
    [tracking, setTracking] = useState<MobileDog | null>(null),
    [weights, setWeights] = useState<WeightRecord[]>([]),
    [bcs, setBcs] = useState("");
  const load = useCallback(() => {
    void dogService.list().then(setDogs);
  }, []);
  useFocusEffect(load);
  function clear() {
    setName("");
    setBirthDate("");
    setWeight("");
    setSex("male");
    setEditing(null);
  }
  function edit(d: MobileDog) {
    setEditing(d.id);
    setName(d.name);
    setBreed(d.breed);
    setBirthDate(d.birthDate);
    setSex(d.sex);
    setTracking(null);
  }
  async function save() {
    try {
      if (!name.trim() || !birthDate)
        throw new Error("Preencha nome e nascimento.");
      if (editing)
        await dogService.update(editing, { name, birthDate, breed, sex });
      else {
        const weightKg = Number(weight.replace(",", "."));
        if (!Number.isFinite(weightKg) || weightKg <= 0)
          throw new Error("Informe o peso inicial.");
        await dogService.create({ name, birthDate, weightKg, breed, sex });
      }
      clear();
      load();
    } catch (e) {
      Alert.alert(
        "Não foi possível salvar",
        e instanceof Error ? e.message : "Confira os dados.",
      );
    }
  }
  async function openTracking(d: MobileDog) {
    setTracking(d);
    setEditing(null);
    setWeight("");
    setBcs("");
    setEditingWeight(null);
    setWeights(await dogService.weights(d.id));
  }
  async function addWeight() {
    try {
      if (!tracking) return;
      const kg = Number(weight.replace(",", ".")),
        score = bcs ? Number(bcs) : null;
      if (
        !Number.isFinite(kg) ||
        kg <= 0 ||
        (score !== null && (score < 1 || score > 9))
      )
        throw new Error("Informe peso e BCS entre 1 e 9.");
      if (editingWeight) await dogService.updateWeight(editingWeight, kg, score);
      else await dogService.addWeight(tracking.id, kg, score);
      setWeight("");
      setBcs("");
      setEditingWeight(null);
      await openTracking({ ...tracking, weightKg: kg });
      load();
    } catch (e) {
      Alert.alert(
        "Não foi possível registrar",
        e instanceof Error ? e.message : "Confira os dados.",
      );
    }
  }
  function removeDog(d: MobileDog) {
    Alert.alert("Excluir cão", `Excluir ${d.name}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => void dogService.remove(d.id).then(load),
      },
    ]);
  }
  return (
    <ScrollView style={common.screen} keyboardShouldPersistTaps="handled">
      <Text style={common.eyebrow}>PLANTEL</Text>
      <Text style={common.title}>
        {editing
          ? "Editar cão"
          : tracking
            ? `Acompanhamento — ${tracking.name}`
            : "Cães"}
      </Text>
      <Text style={common.subtitle}>
        Cadastro completo, edição e evolução do peso.
      </Text>
      {tracking ? (
        <>
          <View style={common.card}>
            <Text style={common.label}>NOVO PESO (KG)</Text>
            <TextInput
              style={common.input}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder="4,6"
              placeholderTextColor={colors.muted}
            />
            <Text style={common.label}>ESCORE CORPORAL BCS (1–9)</Text>
            <TextInput
              style={common.input}
              value={bcs}
              onChangeText={setBcs}
              keyboardType="number-pad"
              placeholder="4 ou 5 é a faixa ideal"
              placeholderTextColor={colors.muted}
            />
            <Pressable style={common.button} onPress={() => void addWeight()}>
              <Text style={common.buttonText}>{editingWeight ? "Salvar pesagem" : "Registrar pesagem"}</Text>
            </Pressable>
            <Pressable
              style={{ padding: 14, alignItems: "center" }}
              onPress={() => setTracking(null)}
            >
              <Text style={common.muted}>Voltar</Text>
            </Pressable>
          </View>
          {weights.map((w) => (
            <View key={w.id} style={common.card}>
              <Text style={common.value}>
                {(w.weightGrams / 1000).toLocaleString("pt-BR")} kg
              </Text>
              <Text style={common.muted}>
                {new Date(`${w.date}T12:00`).toLocaleDateString("pt-BR")} · BCS{" "}
                {w.bodyConditionScore ?? "não informado"}
              </Text>
              <View style={[common.row, { marginTop: 10 }]}>
                <Pressable
                  onPress={() => {
                    setWeight(String(w.weightGrams / 1000).replace(".", ","));
                    setBcs(String(w.bodyConditionScore ?? ""));
                    setEditingWeight(w.id);
                  }}
                >
                  <Text style={{ color: colors.blue }}>Editar</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    Alert.alert("Excluir pesagem", "Confirma a exclusão?", [
                      { text: "Cancelar" },
                      {
                        text: "Excluir",
                        style: "destructive",
                        onPress: () =>
                          void dogService
                            .removeWeight(w.id)
                            .then(() => openTracking(tracking)),
                      },
                    ])
                  }
                >
                  <Text style={{ color: colors.red }}>Excluir</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </>
      ) : (
        <>
          <View style={common.card}>
            <Text style={common.label}>NOME</Text>
            <TextInput
              style={common.input}
              value={name}
              onChangeText={setName}
              placeholder="Nome do cão"
              placeholderTextColor={colors.muted}
            />
            <Text style={common.label}>RAÇA</Text>
            <TextInput
              style={common.input}
              value={breed}
              onChangeText={setBreed}
            />
            <Text style={common.label}>NASCIMENTO (AAAA-MM-DD)</Text>
            <TextInput
              style={common.input}
              value={birthDate}
              onChangeText={setBirthDate}
              placeholder="2026-07-04"
              placeholderTextColor={colors.muted}
            />
            {!editing && (
              <>
                <Text style={common.label}>PESO INICIAL (KG)</Text>
                <TextInput
                  style={common.input}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  placeholder="4,6"
                  placeholderTextColor={colors.muted}
                />
              </>
            )}
            <View style={[common.row, { marginBottom: 12 }]}>
              {(["male", "female"] as const).map((v) => (
                <Pressable
                  key={v}
                  onPress={() => setSex(v)}
                  style={[
                    common.card,
                    { flex: 1, marginBottom: 0 },
                    sex === v && common.selected,
                  ]}
                >
                  <Text style={{ color: colors.text, textAlign: "center" }}>
                    {v === "male" ? "Macho" : "Fêmea"}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={common.button} onPress={() => void save()}>
              <Text style={common.buttonText}>
                {editing ? "Salvar alterações" : "Cadastrar cão"}
              </Text>
            </Pressable>
            {editing && (
              <Pressable
                style={{ padding: 14, alignItems: "center" }}
                onPress={clear}
              >
                <Text style={common.muted}>Cancelar edição</Text>
              </Pressable>
            )}
          </View>
          {dogs.map((d) => (
            <View key={d.id} style={common.card}>
              <Text
                style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}
              >
                {d.name}
              </Text>
              <Text style={common.muted}>
                {d.breed} · {d.weightKg.toLocaleString("pt-BR")} kg
              </Text>
              <View style={[common.row, { marginTop: 12 }]}>
                <Pressable onPress={() => edit(d)}>
                  <Text style={{ color: colors.blue }}>Editar cão</Text>
                </Pressable>
                <Pressable onPress={() => void openTracking(d)}>
                  <Text style={{ color: colors.green }}>Acompanhamento</Text>
                </Pressable>
                <Pressable onPress={() => removeDog(d)}>
                  <Text style={{ color: colors.red }}>Excluir</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}
