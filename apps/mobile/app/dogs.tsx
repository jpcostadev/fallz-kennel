import { useCallback, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  dogPhotoService,
  dogService,
  type MobileDog,
  type WeightRecord,
} from "../src/database";
import { colors, common } from "../src/theme";
import { ThemedDialog } from "../src/ThemedDialog";
import { selectOptimizedDogPhoto } from "../src/dog-photo";

type Mode = "profile" | "form" | "tracking" | null;
const age = (date: string) => {
  const months = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(`${date}T12:00`)) / 2629800000),
  );
  return months < 12 ? `${months} meses` : `${Math.floor(months / 12)} ano(s)`;
};
type DogForm = {
  name: string;
  registeredName: string;
  breed: string;
  birthDate: string;
  weight: string;
  color: string;
  notes: string;
  status: string;
  sex: "male" | "female";
};
const empty: DogForm = {
  name: "",
  registeredName: "",
  breed: "American Bully Standard",
  birthDate: "",
  weight: "",
  color: "",
  notes: "",
  status: "puppy",
  sex: "male",
};

export default function Dogs() {
  const [dogs, setDogs] = useState<MobileDog[]>([]),
    [photos, setPhotos] = useState<Record<string, string>>({}),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState<MobileDog | null>(null),
    [mode, setMode] = useState<Mode>(null),
    [form, setForm] = useState<DogForm>(empty),
    [weights, setWeights] = useState<WeightRecord[]>([]),
    [weight, setWeight] = useState(""),
    [bcs, setBcs] = useState(""),
    [editingWeight, setEditingWeight] = useState<string | null>(null),
    [refreshing, setRefreshing] = useState(false),
    [showBirthPicker, setShowBirthPicker] = useState(false),
    [dialog, setDialog] = useState<{
      title: string;
      message: string;
      action?: () => void;
      danger?: boolean;
    } | null>(null);
  const load = useCallback(() => {
    void Promise.all([dogService.list(), dogPhotoService.list()]).then(
      ([rows, pics]) => {
        setDogs(rows);
        setPhotos(pics);
      },
    );
  }, []);
  useFocusEffect(load);
  const refresh = async () => {
    setRefreshing(true);
    try {
      setDogs(await dogService.list());
    } finally {
      setRefreshing(false);
    }
  };
  const visible = dogs.filter((d) =>
    `${d.name} ${d.registeredName} ${d.breed}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const close = () => {
    setMode(null);
    setEditingWeight(null);
    setWeight("");
    setBcs("");
  };
  const openForm = (dog?: MobileDog) => {
    setSelected(dog ?? null);
    setForm(
      dog
        ? {
            name: dog.name,
            registeredName: dog.registeredName,
            breed: dog.breed,
            birthDate: dog.birthDate,
            weight: String(dog.weightKg).replace(".", ","),
            color: dog.color,
            notes: dog.notes,
            status: dog.status,
            sex: dog.sex,
          }
        : empty,
    );
    setMode("form");
  };
  const openTracking = async (d: MobileDog) => {
    setSelected(d);
    setWeights(await dogService.weights(d.id));
    setMode("tracking");
  };
  const pickPhoto = async () => {
    if (!selected) return;
    try {
      const uri = await selectOptimizedDogPhoto(selected.id);
      if (uri) {
        await dogPhotoService.save(selected.id, uri);
        setPhotos((current) => ({ ...current, [selected.id]: uri }));
      }
    } catch (e) {
      setDialog({
        title: "Não foi possível atualizar a foto",
        message: e instanceof Error ? e.message : "Tente novamente.",
      });
    }
  };
  async function saveDog() {
    try {
      if (
        !form.name.trim() ||
        !/^\d{4}-\d{2}-\d{2}$/.test(form.birthDate) ||
        Number.isNaN(Date.parse(`${form.birthDate}T12:00:00`))
      )
        throw new Error(
          "Informe nome e selecione uma data de nascimento válida.",
        );
      const data = {
        name: form.name,
        birthDate: form.birthDate,
        breed: form.breed,
        sex: form.sex,
        registeredName: form.registeredName,
        color: form.color,
        status: form.status,
        notes: form.notes,
      };
      if (selected) await dogService.update(selected.id, data);
      else {
        const kg = Number(form.weight.replace(",", "."));
        if (!kg || kg <= 0) throw new Error("Informe o peso inicial.");
        await dogService.create({ ...data, weightKg: kg });
      }
      close();
      load();
    } catch (e) {
      setDialog({
        title: "Não foi possível salvar",
        message: e instanceof Error ? e.message : "Confira os dados.",
      });
    }
  }
  async function saveWeight() {
    try {
      if (!selected) return;
      const kg = Number(weight.replace(",", ".")),
        score = bcs ? Number(bcs) : null;
      if (!kg || kg <= 0 || (score !== null && (score < 1 || score > 9)))
        throw new Error("Informe peso válido e BCS entre 1 e 9.");
      if (editingWeight)
        await dogService.updateWeight(editingWeight, kg, score);
      else await dogService.addWeight(selected.id, kg, score);
      setWeight("");
      setBcs("");
      setEditingWeight(null);
      setWeights(await dogService.weights(selected.id));
      load();
    } catch (e) {
      setDialog({
        title: "Não foi possível registrar",
        message: e instanceof Error ? e.message : "Confira os dados.",
      });
    }
  }
  const field = (label: string, key: keyof typeof form, placeholder = "") => (
    <>
      <Text style={common.label}>{label}</Text>
      <TextInput
        style={common.input}
        value={form[key]}
        onChangeText={(v) => setForm({ ...form, [key]: v })}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
      />
    </>
  );
  return (
    <SafeAreaView style={common.screen} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={common.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.blue}
            colors={[colors.blue]}
          />
        }
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text style={common.eyebrow}>PLANTEL</Text>
            <Text style={common.title}>Cães</Text>
          </View>
          <Pressable style={common.iconButton} onPress={() => openForm()}>
            <Ionicons name="add" size={24} color={colors.blue} />
          </Pressable>
        </View>
        <Text style={common.subtitle}>
          Toque em um animal para abrir a ficha completa.
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: "#07101a",
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: 14,
            paddingHorizontal: 13,
            marginBottom: 16,
          }}
        >
          <Ionicons name="search" size={19} color={colors.muted} />
          <TextInput
            style={{ flex: 1, color: colors.text, paddingVertical: 14 }}
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por nome ou raça"
            placeholderTextColor={colors.muted}
          />
        </View>
        <Pressable
          style={[common.button, { marginBottom: 18 }]}
          onPress={() => openForm()}
        >
          <Ionicons name="add-circle-outline" size={20} color="white" />
          <Text style={common.buttonText}>Cadastrar cão</Text>
        </Pressable>
        {visible.map((d) => (
          <Pressable
            key={d.id}
            style={common.card}
            onPress={() => {
              setSelected(d);
              setMode("profile");
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 13 }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 17,
                  overflow: "hidden",
                  backgroundColor: d.sex === "female" ? "#3a1d34" : "#0b2744",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {photos[d.id] ? (
                  <Image
                    source={{ uri: photos[d.id] }}
                    style={{ width: "100%", height: "100%" }}
                  />
                ) : (
                  <Ionicons
                    name="paw"
                    size={24}
                    color={d.sex === "female" ? "#f18ac6" : colors.blue}
                  />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 18,
                    fontWeight: "900",
                  }}
                >
                  {d.name}
                </Text>
                <Text style={common.muted}>
                  {d.breed} • {age(d.birthDate)}
                </Text>
                <Text
                  style={{
                    color: colors.green,
                    fontSize: 12,
                    fontWeight: "800",
                    marginTop: 4,
                  }}
                >
                  {d.weightKg.toLocaleString("pt-BR")} kg
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </View>
          </Pressable>
        ))}
        {!visible.length && (
          <View
            style={[common.card, { alignItems: "center", paddingVertical: 35 }]}
          >
            <Ionicons name="paw-outline" size={40} color={colors.muted} />
            <Text
              style={{
                color: colors.text,
                fontWeight: "900",
                fontSize: 18,
                marginTop: 12,
              }}
            >
              Nenhum cão encontrado
            </Text>
          </View>
        )}
      </ScrollView>
      <Modal
        visible={mode !== null}
        transparent
        animationType="slide"
        onRequestClose={close}
      >
        <View style={common.modalBackdrop}>
          <SafeAreaView style={common.sheet} edges={["bottom"]}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 18,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={common.eyebrow}>
                    {mode === "form"
                      ? selected
                        ? "EDITAR PERFIL"
                        : "NOVO PERFIL"
                      : mode === "tracking"
                        ? "ACOMPANHAMENTO"
                        : "FICHA DO ANIMAL"}
                  </Text>
                  <Text style={[common.title, { fontSize: 25 }]}>
                    {mode === "form"
                      ? selected
                        ? `Editar ${selected.name}`
                        : "Cadastrar cão"
                      : selected?.name}
                  </Text>
                </View>
                <Pressable style={common.iconButton} onPress={close}>
                  <Ionicons name="close" size={23} color={colors.text} />
                </Pressable>
              </View>
              {mode === "profile" && selected && (
                <>
                  <Pressable
                    onPress={() => void pickPhoto()}
                    style={{
                      alignSelf: "center",
                      marginBottom: 18,
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 118,
                        height: 118,
                        borderRadius: 38,
                        overflow: "hidden",
                        borderWidth: 2,
                        borderColor: colors.blue,
                        backgroundColor: "#0b2744",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {photos[selected.id] ? (
                        <Image
                          source={{ uri: photos[selected.id] }}
                          style={{ width: "100%", height: "100%" }}
                        />
                      ) : (
                        <Ionicons
                          name="camera-outline"
                          size={36}
                          color={colors.blue}
                        />
                      )}
                    </View>
                    <Text
                      style={{
                        color: colors.blue,
                        fontWeight: "900",
                        marginTop: 8,
                      }}
                    >
                      {photos[selected.id]
                        ? "Atualizar foto"
                        : "Adicionar foto"}
                    </Text>
                  </Pressable>
                  <View style={[common.card, { backgroundColor: "#091b2c" }]}>
                    <Text style={common.label}>DADOS PRINCIPAIS</Text>
                    {[
                      [
                        "Nome de registro",
                        selected.registeredName || "Não informado",
                      ],
                      [
                        "Nascimento",
                        selected.birthDate.split("-").reverse().join("/"),
                      ],
                      ["Idade", age(selected.birthDate)],
                      ["Sexo", selected.sex === "female" ? "Fêmea" : "Macho"],
                      ["Raça", selected.breed],
                      ["Cor", selected.color || "Não informada"],
                      [
                        "Peso atual",
                        `${selected.weightKg.toLocaleString("pt-BR")} kg`,
                      ],
                    ].map(([l, v]) => (
                      <View
                        key={l}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          gap: 15,
                          paddingVertical: 10,
                          borderBottomWidth: 1,
                          borderBottomColor: colors.line,
                        }}
                      >
                        <Text style={common.muted}>{l}</Text>
                        <Text
                          style={{
                            color: colors.text,
                            fontWeight: "800",
                            flex: 1,
                            textAlign: "right",
                          }}
                        >
                          {v}
                        </Text>
                      </View>
                    ))}
                    {selected.notes ? (
                      <Text style={[common.muted, { marginTop: 12 }]}>
                        {selected.notes}
                      </Text>
                    ) : null}
                  </View>
                  <View style={[common.row, { flexWrap: "nowrap" }]}>
                    <Pressable
                      style={[common.actionButton, { flex: 1 }]}
                      onPress={() => openForm(selected)}
                    >
                      <Ionicons
                        name="create-outline"
                        size={18}
                        color={colors.blue}
                      />
                      <Text style={{ color: colors.text, fontWeight: "800" }}>
                        Editar
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[common.actionButton, { flex: 1 }]}
                      onPress={() => void openTracking(selected)}
                    >
                      <Ionicons
                        name="trending-up"
                        size={18}
                        color={colors.green}
                      />
                      <Text style={{ color: colors.text, fontWeight: "800" }}>
                        Pesagens
                      </Text>
                    </Pressable>
                  </View>
                  <Pressable
                    style={[
                      common.actionButton,
                      { marginTop: 10, borderColor: "#67303b" },
                    ]}
                    onPress={() =>
                      Alert.alert("Excluir cão", `Excluir ${selected.name}?`, [
                        { text: "Cancelar" },
                        {
                          text: "Excluir",
                          style: "destructive",
                          onPress: () =>
                            void dogService.remove(selected.id).then(() => {
                              close();
                              load();
                            }),
                        },
                      ])
                    }
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={colors.red}
                    />
                    <Text style={{ color: colors.red, fontWeight: "900" }}>
                      Excluir cão
                    </Text>
                  </Pressable>
                </>
              )}
              {mode === "form" && (
                <>
                  {field("NOME *", "name", "Nome do cão")}
                  {field(
                    "NOME DE REGISTRO",
                    "registeredName",
                    "Nome no pedigree",
                  )}
                  {field("RAÇA *", "breed")}
                  <Text style={common.label}>DATA DE NASCIMENTO *</Text>
                  <Pressable
                    style={[
                      common.input,
                      { flexDirection: "row", alignItems: "center" },
                    ]}
                    onPress={() => setShowBirthPicker(true)}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={19}
                      color={colors.blue}
                    />
                    <Text
                      style={{
                        color: form.birthDate ? colors.text : colors.muted,
                        marginLeft: 10,
                        flex: 1,
                      }}
                    >
                      {form.birthDate
                        ? new Date(
                            `${form.birthDate}T12:00:00`,
                          ).toLocaleDateString("pt-BR")
                        : "Selecionar data"}
                    </Text>
                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color={colors.muted}
                    />
                  </Pressable>
                  {showBirthPicker && (
                    <DateTimePicker
                      value={
                        form.birthDate
                          ? new Date(`${form.birthDate}T12:00:00`)
                          : new Date()
                      }
                      maximumDate={new Date()}
                      mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={(_, date) => {
                        setShowBirthPicker(Platform.OS === "ios");
                        if (date)
                          setForm({
                            ...form,
                            birthDate: date.toISOString().slice(0, 10),
                          });
                      }}
                    />
                  )}
                  {!selected && (
                    <>
                      <Text style={common.label}>PESO INICIAL (KG) *</Text>
                      <TextInput
                        style={common.input}
                        value={form.weight}
                        onChangeText={(v) => setForm({ ...form, weight: v })}
                        keyboardType="decimal-pad"
                        placeholder="Ex.: 4,650"
                        placeholderTextColor={colors.muted}
                      />
                    </>
                  )}
                  {field("COR", "color", "Ex.: blue tri")}
                  <Text style={common.label}>SEXO</Text>
                  <View
                    style={[
                      common.row,
                      { flexWrap: "nowrap", marginBottom: 14 },
                    ]}
                  >
                    {(["male", "female"] as const).map((s) => (
                      <Pressable
                        key={s}
                        onPress={() => setForm({ ...form, sex: s })}
                        style={[
                          common.actionButton,
                          { flex: 1 },
                          form.sex === s && common.selected,
                        ]}
                      >
                        <Ionicons
                          name={s === "male" ? "male" : "female"}
                          size={18}
                          color={colors.blue}
                        />
                        <Text style={{ color: colors.text, fontWeight: "800" }}>
                          {s === "male" ? "Macho" : "Fêmea"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  {field("OBSERVAÇÕES", "notes", "Informações importantes")}
                  <Pressable
                    style={common.button}
                    onPress={() => void saveDog()}
                  >
                    <Ionicons name="save-outline" size={19} color="white" />
                    <Text style={common.buttonText}>Salvar cão</Text>
                  </Pressable>
                </>
              )}
              {mode === "tracking" && selected && (
                <>
                  <View style={common.card}>
                    <Text style={common.label}>
                      {editingWeight ? "EDITAR PESAGEM" : "NOVA PESAGEM — KG"}
                    </Text>
                    <TextInput
                      style={common.input}
                      value={weight}
                      onChangeText={setWeight}
                      keyboardType="decimal-pad"
                      placeholder="4,650"
                      placeholderTextColor={colors.muted}
                    />
                    <Text style={common.label}>ESCORE CORPORAL (1–9)</Text>
                    <TextInput
                      style={common.input}
                      value={bcs}
                      onChangeText={setBcs}
                      keyboardType="number-pad"
                      placeholder="4 ou 5 é a faixa ideal"
                      placeholderTextColor={colors.muted}
                    />
                    <Pressable
                      style={common.button}
                      onPress={() => void saveWeight()}
                    >
                      <Ionicons name="scale-outline" size={19} color="white" />
                      <Text style={common.buttonText}>
                        {editingWeight
                          ? "Salvar alteração"
                          : "Registrar pesagem"}
                      </Text>
                    </Pressable>
                  </View>
                  {[...weights].reverse().map((w, i) => {
                    const prev = [...weights].reverse()[i + 1],
                      delta = prev ? w.weightGrams - prev.weightGrams : null;
                    return (
                      <View key={w.id} style={common.card}>
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                          }}
                        >
                          <View>
                            <Text style={common.value}>
                              {(w.weightGrams / 1000).toLocaleString("pt-BR")}{" "}
                              kg
                            </Text>
                            <Text style={common.muted}>
                              {new Date(`${w.date}T12:00`).toLocaleDateString(
                                "pt-BR",
                              )}{" "}
                              • BCS {w.bodyConditionScore ?? "—"}/9
                            </Text>
                          </View>
                          {delta !== null && (
                            <Text
                              style={{
                                color: delta >= 0 ? colors.green : colors.red,
                                fontWeight: "900",
                              }}
                            >
                              {delta >= 0 ? "+" : ""}
                              {(delta / 1000).toLocaleString("pt-BR")} kg
                            </Text>
                          )}
                        </View>
                        <View style={[common.row, { marginTop: 12 }]}>
                          <Pressable
                            style={common.actionButton}
                            onPress={() => {
                              setWeight(
                                String(w.weightGrams / 1000).replace(".", ","),
                              );
                              setBcs(String(w.bodyConditionScore ?? ""));
                              setEditingWeight(w.id);
                            }}
                          >
                            <Ionicons
                              name="create-outline"
                              size={17}
                              color={colors.blue}
                            />
                            <Text style={{ color: colors.text }}>Editar</Text>
                          </Pressable>
                          <Pressable
                            style={common.actionButton}
                            onPress={() =>
                              Alert.alert(
                                "Excluir pesagem",
                                "Confirmar exclusão?",
                                [
                                  { text: "Cancelar" },
                                  {
                                    text: "Excluir",
                                    style: "destructive",
                                    onPress: () =>
                                      void dogService
                                        .removeWeight(w.id)
                                        .then(() => openTracking(selected)),
                                  },
                                ],
                              )
                            }
                          >
                            <Ionicons
                              name="trash-outline"
                              size={17}
                              color={colors.red}
                            />
                            <Text style={{ color: colors.red }}>Excluir</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
      <ThemedDialog
        visible={!!dialog}
        title={dialog?.title ?? ""}
        message={dialog?.message ?? ""}
        onClose={() => setDialog(null)}
        onConfirm={dialog?.action}
        confirmLabel="Excluir"
        danger={dialog?.danger}
      />
    </SafeAreaView>
  );
}
