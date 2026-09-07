import { useCallback, useState } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  dogService,
  reminderService,
  type MobileDog,
  type Reminder,
} from "../src/database";
import {
  cancelCareNotification,
  scheduleCareNotification,
} from "../src/notifications";
import { colors, common } from "../src/theme";
import { ThemedDialog } from "../src/ThemedDialog";
import { DogPicker } from "../src/DogPicker";

export default function Agenda() {
  const [dogs, setDogs] = useState<MobileDog[]>([]);
  const [items, setItems] = useState<Reminder[]>([]);
  const [dogId, setDogId] = useState<string | null>(null);
  const [title, setTitle] = useState("Consulta veterinária");
  const [appointmentDate, setAppointmentDate] = useState<Date | null>(null);
  const [appointmentTime, setAppointmentTime] = useState<Date | null>(null);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showDate, setShowDate] = useState(false),
    [showTime, setShowTime] = useState(false);
  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    action?: () => void;
    danger?: boolean;
  } | null>(null);
  const load = useCallback(() => {
    void Promise.all([dogService.list(), reminderService.list()]).then(
      ([d, r]) => {
        setDogs(d);
        setItems(r);
      },
    );
  }, []);
  useFocusEffect(load);
  const refresh = async () => {
    setRefreshing(true);
    try {
      const [d, r] = await Promise.all([
        dogService.list(),
        reminderService.list(),
      ]);
      setDogs(d);
      setItems(r);
    } finally {
      setRefreshing(false);
    }
  };
  async function save() {
    try {
      if (!title.trim()) throw new Error("Informe o título do lembrete.");
      if (!appointmentDate) throw new Error("Selecione a data do lembrete.");
      if (!appointmentTime) throw new Error("Selecione o horário do lembrete.");
      const date = new Date(appointmentDate);
      date.setHours(appointmentTime.getHours(), appointmentTime.getMinutes(), 0, 0);
      if (date.getTime() <= Date.now())
        throw new Error("Selecione uma data e um horário futuros.");
      const dog = dogs.find((d) => d.id === dogId);
      const notificationId = await scheduleCareNotification(
        title,
        dog ? `Compromisso de ${dog.name}` : "Compromisso do canil",
        date,
      );
      const input = {
        dogId,
        title,
        dateTime: date.toISOString(),
        type: "appointment",
        notificationId,
      } as const;
      if (editing) {
        await cancelCareNotification(editing.notificationId);
        await reminderService.update(editing.id, input);
      } else await reminderService.create(input);
      setAppointmentDate(null);
      setAppointmentTime(null);
      setEditing(null);
      load();
    } catch (error) {
      setDialog({
        title: "Não foi possível agendar",
        message: error instanceof Error ? error.message : "Confira os dados.",
      });
    }
  }
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
        <Text style={common.eyebrow}>CUIDADOS</Text>
        <Text style={common.title}>Agenda</Text>
        <Text style={common.subtitle}>
          Consultas e lembretes com notificação no aparelho.
        </Text>
        <View style={common.card}>
          <Text style={common.label}>CÃO (OPCIONAL)</Text>
          <DogPicker
            dogs={dogs}
            value={dogId}
            onChange={setDogId}
            optional
          />
          <Text style={common.label}>TÍTULO</Text>
          <TextInput
            style={common.input}
            value={title}
            onChangeText={setTitle}
          />
          <Text style={common.label}>DATA E HORA</Text>
          <View style={[common.row, { flexWrap: "nowrap", marginBottom: 14 }]}>
            <Pressable
              style={[common.actionButton, { flex: 1 }]}
              onPress={() => setShowDate(true)}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.blue} />
              <Text
                style={{
                  color: appointmentDate ? colors.text : colors.muted,
                  fontWeight: "800",
                }}
              >
                {appointmentDate
                  ? appointmentDate.toLocaleDateString("pt-BR")
                  : "Selecionar data"}
              </Text>
            </Pressable>
            <Pressable
              style={[common.actionButton, { flex: 1 }]}
              onPress={() => setShowTime(true)}
            >
              <Ionicons name="time-outline" size={18} color={colors.blue} />
              <Text
                style={{
                  color: appointmentTime ? colors.text : colors.muted,
                  fontWeight: "800",
                }}
              >
                {appointmentTime
                  ? appointmentTime.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Selecionar hora"}
              </Text>
            </Pressable>
          </View>
          {showDate && (
            <DateTimePicker
              value={appointmentDate ?? new Date()}
              minimumDate={new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(_, date) => {
                setShowDate(Platform.OS === "ios");
                if (date) {
                  setAppointmentDate(date);
                }
              }}
            />
          )}
          {showTime && (
            <DateTimePicker
              value={appointmentTime ?? new Date()}
              mode="time"
              is24Hour
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(_, time) => {
                setShowTime(Platform.OS === "ios");
                if (time) {
                  setAppointmentTime(time);
                }
              }}
            />
          )}
          <Pressable style={common.button} onPress={() => void save()}>
            <Ionicons name="notifications-outline" size={19} color="white" />
            <Text style={common.buttonText}>
              {editing ? "Salvar alterações" : "Agendar notificação"}
            </Text>
          </Pressable>
        </View>
        {items.map((item) => (
          <View key={item.id} style={common.card}>
            <Text style={{ color: colors.text, fontWeight: "800" }}>
              {item.title}
            </Text>
            <Text style={[common.muted, { marginTop: 6 }]}>
              {new Date(item.dateTime).toLocaleString("pt-BR")}
            </Text>
            <View style={[common.row, { marginTop: 10 }]}>
              <Pressable
                onPress={() => {
                  setEditing(item);
                  setDogId(item.dogId);
                  setTitle(item.title);
                  const d = new Date(item.dateTime);
                  setAppointmentDate(new Date(d));
                  setAppointmentTime(new Date(d));
                }}
              >
                <Text style={{ color: colors.blue }}>Editar</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  setDialog({
                    title: "Excluir lembrete?",
                    message: `Excluir “${item.title}”?`,
                    danger: true,
                    action: () =>
                      void cancelCareNotification(item.notificationId)
                        .then(() => reminderService.remove(item.id))
                        .then(() => {
                          setDialog(null);
                          load();
                        }),
                  })
                }
              >
                <Text style={{ color: colors.red }}>Excluir</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
      <ThemedDialog
        visible={!!dialog}
        title={dialog?.title ?? ""}
        message={dialog?.message ?? ""}
        onClose={() => setDialog(null)}
        onConfirm={dialog?.action}
        confirmLabel={dialog?.action ? "Excluir" : "OK"}
        danger={dialog?.danger}
      />
    </SafeAreaView>
  );
}
