import { useEffect, useState } from "react";
import {
  AppState,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Tabs, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../src/theme";
import { observeUser, registerPushDevice, synchronize } from "../src/firebase";
import { registerBackgroundDatabaseSync } from "../src/background-sync";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
const tabIcon =
  (name: IconName) =>
  ({ color, size }: { color: unknown; size: number }) => (
    <Ionicons name={name} color={color as string} size={size} />
  );

export default function Layout() {
  const [menu, setMenu] = useState(false);
  const router = useRouter();
  const go = (
    path:
      | "/dogs"
      | "/feeding"
      | "/agenda"
      | "/more"
      | "/settings"
      | "/health"
      | "/breeding"
      | "/clients"
      | "/finance"
      | "/reports"
      | "/veterinary-guide",
  ) => {
    setMenu(false);
    router.push(path);
  };
  const actions: Array<[IconName, string, () => void]> = [
    ["paw", "Cadastrar ou abrir cães", () => go("/dogs")],
    ["trending-up", "Registrar pesagem", () => go("/dogs")],
    ["restaurant", "Plano de alimentação", () => go("/feeding")],
    ["notifications", "Criar lembrete", () => go("/agenda")],
    ["medkit", "Saúde", () => go("/health")],
    ["sparkles", "Reprodução", () => go("/breeding")],
    ["people", "Clientes", () => go("/clients")],
    ["wallet", "Financeiro", () => go("/finance")],
    ["document-text", "Relatórios", () => go("/reports")],
    ["book", "Guia veterinário", () => go("/veterinary-guide")],
    ["cloud-done", "Sincronização Firebase", () => go("/more")],
    ["settings", "Configurações", () => go("/settings")],
  ];
  useEffect(() => {
    const run = () => void synchronize().catch(() => undefined);
    run();
    const timer = setInterval(run, 10 * 60 * 1000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") run();
    });
    void registerBackgroundDatabaseSync();
    const unsubscribeAuth = observeUser((user) => {
      if (user) void registerPushDevice().catch(() => undefined);
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
      unsubscribeAuth();
    };
  }, []);
  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.blue,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            backgroundColor: "#08101a",
            borderTopColor: colors.line,
            height: 72,
            paddingBottom: 10,
            paddingTop: 6,
          },
          tabBarLabelStyle: { fontWeight: "700", fontSize: 10 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: "Início", tabBarIcon: tabIcon("home-outline") }}
        />
        <Tabs.Screen
          name="dogs"
          options={{ title: "Cães", tabBarIcon: tabIcon("paw-outline") }}
        />
        <Tabs.Screen
          name="feeding"
          options={{
            title: "Alimentação",
            tabBarIcon: tabIcon("restaurant-outline"),
          }}
        />
        <Tabs.Screen
          name="agenda"
          options={{ title: "Agenda", tabBarIcon: tabIcon("calendar-outline") }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: "Mais",
            tabBarIcon: tabIcon("add-circle-outline"),
            tabBarButton: () => (
              <Pressable
                onPress={() => setMenu(true)}
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={27}
                  color={colors.muted}
                />
                <Text
                  style={{
                    color: colors.muted,
                    fontSize: 10,
                    fontWeight: "700",
                  }}
                >
                  Mais
                </Text>
              </Pressable>
            ),
          }}
        />
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="health" options={{ href: null }} />
        <Tabs.Screen name="breeding" options={{ href: null }} />
        <Tabs.Screen name="clients" options={{ href: null }} />
        <Tabs.Screen name="finance" options={{ href: null }} />
        <Tabs.Screen name="reports" options={{ href: null }} />
        <Tabs.Screen name="veterinary-guide" options={{ href: null }} />
      </Tabs>
      <Modal
        visible={menu}
        transparent
        animationType="slide"
        onRequestClose={() => setMenu(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,.7)",
            justifyContent: "flex-end",
          }}
          onPress={() => setMenu(false)}
        >
          <Pressable
            style={{
              backgroundColor: colors.panel,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 20,
              paddingBottom: 40,
              borderWidth: 1,
              borderColor: colors.line,
              maxHeight: "88%",
            }}
            onPress={() => {}}
          >
            <View
              style={{
                width: 42,
                height: 4,
                borderRadius: 2,
                backgroundColor: "#405166",
                alignSelf: "center",
                marginBottom: 18,
              }}
            />
            <Text
              style={{ color: colors.text, fontSize: 22, fontWeight: "900" }}
            >
              Ações rápidas
            </Text>
            <Text
              style={{ color: colors.muted, marginTop: 4, marginBottom: 14 }}
            >
              Escolha o que deseja fazer.
            </Text>
            <ScrollView>
              {actions.map(([name, label, onPress]) => (
                <Pressable
                  key={label}
                  onPress={onPress}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.line,
                  }}
                >
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 13,
                      backgroundColor: "#0b2744",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name={name} size={21} color={colors.blue} />
                  </View>
                  <Text
                    style={{
                      color: colors.text,
                      fontWeight: "800",
                      fontSize: 16,
                      flex: 1,
                    }}
                  >
                    {label}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.muted}
                  />
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
