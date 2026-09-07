import { useMemo, useState } from "react";
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, common } from "../src/theme";
import { veterinaryTopics, type VetTopic } from "../src/veterinary-knowledge";

export default function VeterinaryGuide() {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("Todos"),
    [selected, setSelected] = useState<VetTopic | null>(null);
  const categories = [
    "Todos",
    ...new Set(veterinaryTopics.map((x) => x.category)),
  ];
  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    return veterinaryTopics.filter(
      (x) =>
        (category === "Todos" || x.category === category) &&
        (!q ||
          `${x.title} ${x.summary} ${x.details} ${x.keywords.join(" ")}`
            .toLocaleLowerCase("pt-BR")
            .includes(q)),
    );
  }, [query, category]);
  return (
    <SafeAreaView style={common.screen} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={common.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={common.eyebrow}>CONHECIMENTO</Text>
        <Text style={common.title}>Guia veterinário</Text>
        <Text style={common.subtitle}>
          {veterinaryTopics.length} informações revisadas com links para fontes
          veterinárias. Conteúdo educativo, não substitui consulta.
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
            marginBottom: 14,
          }}
        >
          <Ionicons name="search" size={19} color={colors.muted} />
          <TextInput
            style={{ flex: 1, color: colors.text, paddingVertical: 14 }}
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar BCS, vacina, peso, emergência..."
            placeholderTextColor={colors.muted}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 16 }}
        >
          {categories.map((item) => (
            <Pressable
              key={item}
              onPress={() => setCategory(item)}
              style={[
                common.actionButton,
                { marginRight: 8 },
                category === item && common.selected,
              ]}
            >
              <Text style={{ color: colors.text, fontWeight: "800" }}>
                {item}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={[common.muted, { marginBottom: 12 }]}>
          {rows.length} resultado(s)
        </Text>
        {rows.map((item) => (
          <Pressable
            key={item.id}
            style={common.card}
            onPress={() => setSelected(item)}
          >
            <Text style={common.eyebrow}>{item.category.toUpperCase()}</Text>
            <Text
              style={{
                color: colors.text,
                fontSize: 18,
                fontWeight: "900",
                marginTop: 4,
              }}
            >
              {item.title}
            </Text>
            <Text style={[common.muted, { marginTop: 7, lineHeight: 20 }]}>
              {item.summary}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 12,
              }}
            >
              <Text style={{ color: colors.blue, fontWeight: "800", flex: 1 }}>
                Fonte: {item.sourceName}
              </Text>
              <Ionicons name="chevron-forward" size={19} color={colors.blue} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <View style={common.modalBackdrop}>
          <SafeAreaView style={common.sheet} edges={["bottom"]}>
            <ScrollView>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={[common.eyebrow, { flex: 1 }]}>
                  {selected?.category.toUpperCase()}
                </Text>
                <Pressable
                  style={common.iconButton}
                  onPress={() => setSelected(null)}
                >
                  <Ionicons name="close" size={22} color={colors.text} />
                </Pressable>
              </View>
              <Text style={[common.title, { fontSize: 26, marginTop: 12 }]}>
                {selected?.title}
              </Text>
              <Text
                style={[
                  common.muted,
                  { fontSize: 16, lineHeight: 24, marginBottom: 18 },
                ]}
              >
                {selected?.summary}
              </Text>
              <View style={common.card}>
                <Text
                  style={{ color: colors.text, fontSize: 16, lineHeight: 25 }}
                >
                  {selected?.details}
                </Text>
              </View>
              <View style={[common.card, { borderColor: "#715c25" }]}>
                <Text style={{ color: "#f6c453", fontWeight: "900" }}>
                  Atenção
                </Text>
                <Text style={[common.muted, { marginTop: 7, lineHeight: 21 }]}>
                  Use estas informações para observar e registrar. Diagnóstico,
                  tratamento, vacinação e dieta terapêutica devem ser definidos
                  por médico-veterinário.
                </Text>
              </View>
              <Pressable
                style={common.button}
                onPress={() =>
                  selected && void Linking.openURL(selected.source)
                }
              >
                <Ionicons name="open-outline" size={19} color="white" />
                <Text style={common.buttonText}>
                  Abrir fonte: {selected?.sourceName}
                </Text>
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
