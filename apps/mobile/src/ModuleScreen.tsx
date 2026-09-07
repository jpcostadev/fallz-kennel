import { useCallback, useState } from "react";
import {
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
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { DogPicker } from "./DogPicker";
import { colors, common } from "./theme";
import {
  dogService,
  moduleService,
  type MobileDog,
  type MobileModule,
  type MobileModuleRecord,
} from "./database";

const info: Record<
  MobileModule,
  { eyebrow: string; title: string; action: string; categories: string[] }
> = {
  health: {
    eyebrow: "CUIDADOS",
    title: "Saúde",
    action: "Novo registro",
    categories: ["Vacina", "Vermífugo", "Medicamento", "Consulta", "Exame"],
  },
  breeding: {
    eyebrow: "PLANEJAMENTO",
    title: "Reprodução",
    action: "Novo acompanhamento",
    categories: ["Cio", "Cruzamento", "Gestação", "Parto", "Ninhada"],
  },
  clients: {
    eyebrow: "RELACIONAMENTO",
    title: "Clientes",
    action: "Adicionar cliente",
    categories: ["Interessado", "Reserva", "Comprador", "Entrega"],
  },
  finance: {
    eyebrow: "CONTROLE",
    title: "Financeiro",
    action: "Novo lançamento",
    categories: [
      "Ração",
      "Vacina",
      "Medicamento",
      "Coleira",
      "Veterinário",
      "Venda",
      "Outros",
    ],
  },
};
const today = () => new Date().toISOString().slice(0, 10);
type ModuleForm = Omit<
  MobileModuleRecord,
  "id" | "createdAt" | "updatedAt" | "deletedAt" | "version" | "deviceId"
>;
const blank = (module: MobileModule): ModuleForm => ({
  module,
  title: "",
  category: info[module].categories[0],
  date: today(),
  description: "",
  amount: null,
  dogId: null,
  phone: "",
  whatsapp: "",
  email: "",
  transactionType: module === "finance" ? "expense" : null,
  quantity: null,
  unit: "",
});

export function ModuleScreen({ module }: { module: MobileModule }) {
  const meta = info[module],
    [dogs, setDogs] = useState<MobileDog[]>([]),
    [records, setRecords] = useState<MobileModuleRecord[]>([]),
    [editing, setEditing] = useState<MobileModuleRecord | null | undefined>(
      undefined,
    ),
    [form, setForm] = useState(blank(module)),
    [showDate, setShowDate] = useState(false),
    [refreshing, setRefreshing] = useState(false),
    [error, setError] = useState(""),
    [deleting, setDeleting] = useState<MobileModuleRecord | null>(null);
  const load = useCallback(async () => {
    const [d, r] = await Promise.all([
      dogService.list(),
      moduleService.list(module),
    ]);
    setDogs(d);
    setRecords(r);
  }, [module]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  const open = (record?: MobileModuleRecord) => {
    setEditing(record ?? null);
    setError("");
    setForm(
      record
        ? {
            module: record.module,
            title: record.title,
            category: record.category,
            date: record.date,
            description: record.description,
            amount: record.amount,
            dogId: record.dogId,
            phone: record.phone,
            whatsapp: record.whatsapp,
            email: record.email,
            transactionType: record.transactionType,
            quantity: record.quantity,
            unit: record.unit,
          }
        : blank(module),
    );
  };
  const save = async () => {
    if (!form.title.trim()) {
      setError(
        module === "clients"
          ? "Informe o nome do cliente."
          : "Informe o título.",
      );
      return;
    }
    try {
      await moduleService.save(form, editing?.id);
      setEditing(undefined);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  };
  const refresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };
  return (
    <SafeAreaView style={common.screen} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={common.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.blue}
          />
        }
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Text style={common.eyebrow}>{meta.eyebrow}</Text>
            <Text style={common.title}>{meta.title}</Text>
          </View>
          <Pressable style={common.iconButton} onPress={() => open()}>
            <Ionicons name="add" size={24} color={colors.blue} />
          </Pressable>
        </View>
        <Text style={common.subtitle}>
          Dados completos sincronizados com o Desktop.
        </Text>
        <Pressable
          style={[common.button, { marginBottom: 18 }]}
          onPress={() => open()}
        >
          <Ionicons name="add-circle-outline" size={20} color="white" />
          <Text style={common.buttonText}>{meta.action}</Text>
        </Pressable>
        {records.map((r) => (
          <View style={common.card} key={r.id}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={[common.iconButton, { backgroundColor: "#0b2744" }]}>
                <Ionicons
                  name={
                    module === "clients"
                      ? "person"
                      : module === "finance"
                        ? "wallet"
                        : "document-text"
                  }
                  size={20}
                  color={colors.blue}
                />
              </View>
              <Pressable style={{ flex: 1 }} onPress={() => open(r)}>
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "900",
                    fontSize: 17,
                  }}
                >
                  {r.title}
                </Text>
                <Text style={common.muted}>
                  {r.category} •{" "}
                  {new Date(`${r.date}T12:00`).toLocaleDateString("pt-BR")}
                </Text>
                {r.amount != null && (
                  <Text
                    style={{
                      color:
                        r.transactionType === "income"
                          ? colors.green
                          : colors.red,
                      fontWeight: "900",
                      marginTop: 5,
                    }}
                  >
                    R${" "}
                    {r.amount.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </Text>
                )}
              </Pressable>
              <Pressable style={common.iconButton} onPress={() => open(r)}>
                <Ionicons name="create-outline" size={19} color={colors.blue} />
              </Pressable>
              <Pressable
                style={common.iconButton}
                onPress={() => setDeleting(r)}
              >
                <Ionicons name="trash-outline" size={19} color={colors.red} />
              </Pressable>
            </View>
          </View>
        ))}
        {!records.length && (
          <View
            style={[common.card, { alignItems: "center", paddingVertical: 35 }]}
          >
            <Ionicons name="file-tray-outline" size={38} color={colors.muted} />
            <Text
              style={{ color: colors.text, fontWeight: "900", marginTop: 12 }}
            >
              Nenhum registro
            </Text>
          </View>
        )}
      </ScrollView>
      <Modal visible={editing !== undefined} transparent animationType="slide">
        <View style={common.modalBackdrop}>
          <SafeAreaView style={common.sheet} edges={["bottom"]}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={common.eyebrow}>
                    {editing ? "EDITAR" : "NOVO REGISTRO"}
                  </Text>
                  <Text style={[common.title, { fontSize: 24 }]}>
                    {meta.title}
                  </Text>
                </View>
                <Pressable
                  style={common.iconButton}
                  onPress={() => setEditing(undefined)}
                >
                  <Ionicons name="close" size={22} color={colors.text} />
                </Pressable>
              </View>
              <Text style={common.label}>
                {module === "clients"
                  ? "NOME DO CLIENTE"
                  : module === "health"
                    ? "VACINA / MEDICAMENTO / PROCEDIMENTO"
                    : "TÍTULO"}{" "}
                *
              </Text>
              <TextInput
                style={common.input}
                value={form.title}
                onChangeText={(title) => setForm({ ...form, title })}
              />
              {module !== "clients" && (
                <>
                  <Text style={common.label}>
                    CÃO {module === "finance" ? "(OPCIONAL)" : "*"}
                  </Text>
                  <DogPicker
                    dogs={dogs}
                    value={form.dogId}
                    optional={module === "finance"}
                    onChange={(dogId) => setForm({ ...form, dogId })}
                  />
                </>
              )}
              <Text style={common.label}>CATEGORIA</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 14 }}
              >
                {meta.categories.map((category) => (
                  <Pressable
                    key={category}
                    onPress={() => setForm({ ...form, category })}
                    style={[
                      common.actionButton,
                      { marginRight: 8 },
                      form.category === category && common.selected,
                    ]}
                  >
                    <Text style={{ color: colors.text, fontWeight: "800" }}>
                      {category}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={common.label}>DATA</Text>
              <Pressable
                style={[
                  common.input,
                  { flexDirection: "row", alignItems: "center" },
                ]}
                onPress={() => setShowDate(true)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={19}
                  color={colors.blue}
                />
                <Text style={{ color: colors.text, marginLeft: 10 }}>
                  {new Date(`${form.date}T12:00`).toLocaleDateString("pt-BR")}
                </Text>
              </Pressable>
              {showDate && (
                <DateTimePicker
                  value={new Date(`${form.date}T12:00`)}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(_, date) => {
                    setShowDate(Platform.OS === "ios");
                    if (date)
                      setForm({
                        ...form,
                        date: date.toISOString().slice(0, 10),
                      });
                  }}
                />
              )}
              {module === "clients" && (
                <>
                  <Text style={common.label}>TELEFONE</Text>
                  <TextInput
                    style={common.input}
                    keyboardType="phone-pad"
                    value={form.phone}
                    onChangeText={(phone) => setForm({ ...form, phone })}
                  />
                  <Text style={common.label}>WHATSAPP</Text>
                  <TextInput
                    style={common.input}
                    keyboardType="phone-pad"
                    value={form.whatsapp}
                    onChangeText={(whatsapp) => setForm({ ...form, whatsapp })}
                  />
                  <Text style={common.label}>E-MAIL</Text>
                  <TextInput
                    style={common.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={form.email}
                    onChangeText={(email) => setForm({ ...form, email })}
                  />
                </>
              )}
              {module === "finance" && (
                <>
                  <Text style={common.label}>TIPO</Text>
                  <View style={[common.row, { marginBottom: 14 }]}>
                    {(["income", "expense"] as const).map((type) => (
                      <Pressable
                        key={type}
                        style={[
                          common.actionButton,
                          { flex: 1 },
                          form.transactionType === type && common.selected,
                        ]}
                        onPress={() =>
                          setForm({ ...form, transactionType: type })
                        }
                      >
                        <Text style={{ color: colors.text, fontWeight: "800" }}>
                          {type === "income" ? "Receita" : "Despesa"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={common.label}>VALOR (R$)</Text>
                  <TextInput
                    style={common.input}
                    keyboardType="decimal-pad"
                    value={form.amount == null ? "" : String(form.amount)}
                    onChangeText={(v) =>
                      setForm({
                        ...form,
                        amount: v ? Number(v.replace(",", ".")) : null,
                      })
                    }
                  />
                  <Text style={common.label}>QUANTIDADE</Text>
                  <TextInput
                    style={common.input}
                    keyboardType="decimal-pad"
                    value={form.quantity == null ? "" : String(form.quantity)}
                    onChangeText={(v) =>
                      setForm({
                        ...form,
                        quantity: v ? Number(v.replace(",", ".")) : null,
                      })
                    }
                  />
                  <Text style={common.label}>UNIDADE</Text>
                  <TextInput
                    style={common.input}
                    value={form.unit}
                    onChangeText={(unit) => setForm({ ...form, unit })}
                    placeholder="kg, unidade, caixa..."
                    placeholderTextColor={colors.muted}
                  />
                </>
              )}
              <Text style={common.label}>
                {module === "health"
                  ? "MARCA, LOTE, DOSE, VETERINÁRIO E OBSERVAÇÕES"
                  : "OBSERVAÇÕES"}
              </Text>
              <TextInput
                style={[
                  common.input,
                  { minHeight: 90, textAlignVertical: "top" },
                ]}
                multiline
                value={form.description}
                placeholder={
                  module === "health"
                    ? "Ex.: Zoetis · lote 123 · 1ª dose · Dr(a)..."
                    : ""
                }
                placeholderTextColor={colors.muted}
                onChangeText={(description) =>
                  setForm({ ...form, description })
                }
              />
              {error && (
                <Text
                  style={{
                    color: colors.red,
                    fontWeight: "800",
                    marginBottom: 12,
                  }}
                >
                  {error}
                </Text>
              )}
              <Pressable style={common.button} onPress={() => void save()}>
                <Ionicons name="save-outline" size={19} color="white" />
                <Text style={common.buttonText}>Salvar</Text>
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
      <Modal visible={Boolean(deleting)} transparent animationType="fade">
        <View
          style={[
            common.modalBackdrop,
            { justifyContent: "center", padding: 24 },
          ]}
        >
          <View style={common.card}>
            <Text
              style={{ color: colors.text, fontSize: 20, fontWeight: "900" }}
            >
              Excluir registro?
            </Text>
            <Text style={[common.muted, { marginVertical: 12 }]}>
              Esta ação será sincronizada com todos os dispositivos.
            </Text>
            <View style={[common.row, { flexWrap: "nowrap" }]}>
              <Pressable
                style={[common.actionButton, { flex: 1 }]}
                onPress={() => setDeleting(null)}
              >
                <Text style={{ color: colors.text, fontWeight: "800" }}>
                  Cancelar
                </Text>
              </Pressable>
              <Pressable
                style={[common.button, { flex: 1, backgroundColor: "#b72d45" }]}
                onPress={() => {
                  if (deleting)
                    void moduleService.remove(deleting.id).then(() => {
                      setDeleting(null);
                      return load();
                    });
                }}
              >
                <Text style={common.buttonText}>Excluir</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
