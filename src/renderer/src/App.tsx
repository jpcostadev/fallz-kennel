import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Dog as DogIcon,
  FileBarChart,
  HeartPulse,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings,
  Sparkles,
  Users,
  WifiOff,
  X,
  Syringe,
  Pill,
  Activity,
  Baby,
  ReceiptText,
  UserRoundPlus,
  Pencil,
  Trash2,
  Download,
  Save,
  Cloud,
  RefreshCw,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Database,
  Utensils,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import {
  calculateFeedingPlan,
  type LifeStage,
  type WeightGoal,
} from "@fallz/core";
import {
  createDogSchema,
  type CreateDogFormInput,
  type CreateDogInput,
  type DashboardSummary,
  type Dog,
  type UpdateStatus,
} from "../../shared/dog";
import {
  kennelSettingsSchema,
  moduleRecordInputSchema,
  type KennelSettings,
  type ModuleRecord,
  type ModuleRecordFormInput,
  type ModuleRecordInput,
  type OperationalModule,
} from "../../shared/module";
import {
  measurementInputSchema,
  type Measurement,
  type MeasurementFormInput,
  type MeasurementInput,
} from "../../shared/measurement";
import logoUrl from "./assets/fallz-kennel.png";
import {
  loginFirebase,
  logoutFirebase,
  observeFirebaseUser,
  synchronizeFirebase,
} from "./firebase";
import type { SyncSummary } from "../../shared/sync";
import type { FeedingPlanRecord } from "../../shared/feeding";
import {
  veterinaryTopics,
  type VetTopic,
} from "../../../apps/mobile/src/veterinary-knowledge";
import { useUiDialog } from "./ui-dialog";

type Page =
  | "dashboard"
  | "dogs"
  | "feeding"
  | "health"
  | "breeding"
  | "clients"
  | "finance"
  | "agenda"
  | "reports"
  | "guide"
  | "sync"
  | "settings";

const pageInfo: Record<
  Exclude<Page, "dashboard" | "dogs" | "feeding" | "guide">,
  {
    eyebrow: string;
    title: string;
    description: string;
    action: string;
    cards: Array<{ title: string; text: string }>;
  }
> = {
  health: {
    eyebrow: "CUIDADOS",
    title: "Saúde",
    description: "Acompanhe vacinas, medicamentos e o histórico veterinário.",
    action: "Novo registro",
    cards: [
      { title: "Vacinas", text: "Aplicações e próximas doses" },
      { title: "Vermífugos", text: "Controle de aplicações" },
      { title: "Medicamentos", text: "Tratamentos em andamento" },
      { title: "Doenças", text: "Ocorrências, sintomas, tratamentos e evolução" },
      { title: "Veterinário", text: "Consultas, exames e retornos" },
    ],
  },
  breeding: {
    eyebrow: "PLANEJAMENTO",
    title: "Reprodução",
    description: "Organize ciclos, cruzamentos, gestações e ninhadas.",
    action: "Novo acompanhamento",
    cards: [
      { title: "Cios", text: "Ciclos e próximas previsões" },
      { title: "Cruzamentos", text: "Montas e inseminações" },
      { title: "Gestações", text: "Acompanhamento gestacional" },
      { title: "Ninhadas", text: "Partos e filhotes" },
    ],
  },
  clients: {
    eyebrow: "RELACIONAMENTO",
    title: "Clientes",
    description: "Centralize contatos, interessados, compradores e reservas.",
    action: "Adicionar cliente",
    cards: [
      { title: "Todos os clientes", text: "Contatos cadastrados" },
      { title: "Interessados", text: "Pessoas aguardando filhotes" },
      { title: "Reservas", text: "Sinais e saldos pendentes" },
      { title: "Entregas", text: "Próximas entregas programadas" },
    ],
  },
  finance: {
    eyebrow: "CONTROLE",
    title: "Financeiro",
    description: "Receitas, despesas e custos do canil em um só lugar.",
    action: "Novo lançamento",
    cards: [
      { title: "Receitas", text: "Entradas deste mês" },
      { title: "Despesas", text: "Saídas deste mês" },
      { title: "Saldo", text: "Resultado do período" },
      { title: "Custos por cão", text: "Visão detalhada do plantel" },
    ],
  },
  agenda: {
    eyebrow: "ORGANIZAÇÃO",
    title: "Agenda",
    description: "Não perca vacinas, consultas, cruzamentos ou entregas.",
    action: "Novo evento",
    cards: [
      { title: "Hoje", text: "Compromissos do dia" },
      { title: "Esta semana", text: "Próximos sete dias" },
      { title: "Cuidados", text: "Alertas de saúde" },
      { title: "Reprodução", text: "Eventos reprodutivos" },
    ],
  },
  reports: {
    eyebrow: "DOCUMENTOS",
    title: "Relatórios",
    description: "Gere fichas e relatórios completos do canil.",
    action: "Gerar relatório",
    cards: [
      { title: "Ficha do cão", text: "Perfil completo em PDF" },
      { title: "Saúde", text: "Vacinas e histórico clínico" },
      { title: "Ninhadas", text: "Resumo de pais e filhotes" },
      { title: "Financeiro", text: "Fechamento mensal ou anual" },
    ],
  },
  sync: {
    eyebrow: "NUVEM",
    title: "Sincronização",
    description: "Sincronize os registros entre seus dispositivos.",
    action: "Sincronizar",
    cards: [
      { title: "Conta", text: "Autenticação Firebase" },
      { title: "Pendências", text: "Alterações locais" },
      { title: "Dispositivo", text: "Identificação local" },
      { title: "Histórico", text: "Última sincronização" },
    ],
  },
  settings: {
    eyebrow: "PREFERÊNCIAS",
    title: "Configurações",
    description: "Personalize o canil, os dados locais e a segurança.",
    action: "Salvar alterações",
    cards: [
      { title: "Canil", text: "Identidade e dados de contato" },
      { title: "Banco de dados", text: "Integridade e armazenamento" },
      { title: "Backup", text: "Cópias de segurança locais" },
      { title: "Privacidade", text: "PIN e proteção do aplicativo" },
    ],
  },
};

function VeterinaryGuidePage(): React.JSX.Element {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("Todos"),
    [selected, setSelected] = useState<VetTopic | null>(null);
  const categories = [
    "Todos",
    ...new Set(veterinaryTopics.map((topic) => topic.category)),
  ];
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  const topics = veterinaryTopics.filter(
    (topic) =>
      (category === "Todos" || topic.category === category) &&
      (!normalized ||
        `${topic.title} ${topic.summary} ${topic.details} ${topic.keywords.join(" ")}`
          .toLocaleLowerCase("pt-BR")
          .includes(normalized)),
  );
  return (
    <>
      <section className="welcome module-welcome">
        <div>
          <p className="eyebrow">CONHECIMENTO</p>
          <h1>Guia veterinário</h1>
          <p>
            {veterinaryTopics.length} informações pesquisadas em fontes
            veterinárias, com busca e referências.
          </p>
        </div>
      </section>
      <section className="vet-guide-tools">
        <div className="search vet-guide-search">
          <Search />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar BCS, vacina, peso, emergência..."
          />
        </div>
        <div className="section-tabs vet-categories">
          {categories.map((item) => (
            <button
              key={item}
              className={category === item ? "active" : ""}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </section>
      <p className="guide-count">
        {topics.length} resultado(s) · Conteúdo educativo, não substitui
        consulta.
      </p>
      <section className="vet-topic-grid">
        {topics.map((topic) => (
          <button
            className="panel vet-topic"
            key={topic.id}
            onClick={() => setSelected(topic)}
          >
            <span>{topic.category}</span>
            <h2>{topic.title}</h2>
            <p>{topic.summary}</p>
            <small>
              Fonte: {topic.sourceName} <ChevronRight />
            </small>
          </button>
        ))}
      </section>
      {selected && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <div className="modal-card vet-topic-dialog">
            <div className="modal-header">
              <div>
                <p className="eyebrow">{selected.category.toUpperCase()}</p>
                <h2>{selected.title}</h2>
              </div>
              <button className="icon-button" onClick={() => setSelected(null)}>
                <X />
              </button>
            </div>
            <p className="vet-lead">{selected.summary}</p>
            <div className="smart-guidance">
              <HeartPulse />
              <div>
                <strong>Informação veterinária</strong>
                <p>{selected.details}</p>
              </div>
            </div>
            <div className="local-card">
              <strong>Atenção</strong>
              <p>
                Use para observar e registrar. Diagnóstico, tratamento,
                vacinação e dieta terapêutica devem ser definidos por
                médico-veterinário.
              </p>
            </div>
            <div className="modal-actions">
              <button
                className="primary-button"
                onClick={() =>
                  window.open(selected.source, "_blank", "noopener,noreferrer")
                }
              >
                <ExternalLink /> Abrir fonte: {selected.sourceName}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const emptySummary: DashboardSummary = {
  activeDogs: 0,
  males: 0,
  females: 0,
  puppies: 0,
};
const statusLabel: Record<Dog["status"], string> = {
  puppy: "Filhote",
  young: "Jovem",
  adult: "Adulto",
  breeder: "Reprodutor",
  retired: "Aposentado",
  sold: "Vendido",
  deceased: "Falecido",
};

function App(): React.JSX.Element {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [summary, setSummary] = useState(emptySummary);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<Page>("dashboard");
  const [quickCreate, setQuickCreate] = useState(0);
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);
  const [searchRecords, setSearchRecords] = useState<ModuleRecord[]>([]);

  async function refresh(): Promise<void> {
    const [dogList, dashboard] = await Promise.all([
      window.fallz.dogs.list(),
      window.fallz.dashboard.summary(),
    ]);
    setDogs(dogList);
    setSummary(dashboard);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    let authenticated = false;
    let syncing = false;
    const syncDatabase = async (): Promise<void> => {
      if (!authenticated || syncing || !navigator.onLine) return;
      syncing = true;
      try {
        await synchronizeFirebase();
        await refresh();
      } catch {
        /* tenta novamente no próximo ciclo */
      } finally {
        syncing = false;
      }
    };
    const stopAuth = observeFirebaseUser((user) => {
      authenticated = Boolean(user);
      if (user) void syncDatabase();
    });
    const online = (): void => {
      void syncDatabase();
    };
    window.addEventListener("online", online);
    const timer = window.setInterval(() => void syncDatabase(), 10 * 60 * 1000);
    return () => {
      stopAuth();
      window.removeEventListener("online", online);
      window.clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    void Promise.all(
      (
        [
          "health",
          "breeding",
          "clients",
          "finance",
          "agenda",
        ] as OperationalModule[]
      ).map((module) => window.fallz.records.list(module)),
    ).then((groups) => setSearchRecords(groups.flat()));
  }, []);
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent): void => {
      if (event.ctrlKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("global-search")?.focus();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);
  const filteredDogs = useMemo(
    () =>
      dogs.filter((dog) =>
        `${dog.name} ${dog.breed} ${dog.color}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [dogs, search],
  );
  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  const globalDogResults = normalizedSearch
    ? dogs
        .filter((dog) =>
          `${dog.name} ${dog.registeredName} ${dog.breed} ${dog.color}`
            .toLocaleLowerCase("pt-BR")
            .includes(normalizedSearch),
        )
        .slice(0, 5)
    : [];
  const globalRecordResults = normalizedSearch
    ? searchRecords
        .filter((record) =>
          `${record.title} ${record.category} ${record.description} ${record.phone} ${record.whatsapp} ${record.email}`
            .toLocaleLowerCase("pt-BR")
            .includes(normalizedSearch),
        )
        .slice(0, 7)
    : [];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setPage("dashboard")}>
          <img src={logoUrl} alt="Fallz Kennel" />
          <div>
            <strong>Fallz</strong>
            <span>Kennel</span>
          </div>
        </button>
        <nav>
          <span className="nav-label">Visão geral</span>
          <button
            className={`nav-item ${page === "dashboard" ? "active" : ""}`}
            onClick={() => setPage("dashboard")}
          >
            <LayoutDashboard /> Dashboard
          </button>
          <span className="nav-label">Gestão</span>
          <button
            className={`nav-item ${page === "dogs" ? "active" : ""}`}
            onClick={() => setPage("dogs")}
          >
            <DogIcon /> Cães{" "}
            <span className="nav-count">{summary.activeDogs}</span>
          </button>
          <button
            className={`nav-item ${page === "feeding" ? "active" : ""}`}
            onClick={() => setPage("feeding")}
          >
            <Utensils /> Alimentação
          </button>
          <button
            className={`nav-item ${page === "health" ? "active" : ""}`}
            onClick={() => setPage("health")}
          >
            <HeartPulse /> Saúde
          </button>
          <button
            className={`nav-item ${page === "breeding" ? "active" : ""}`}
            onClick={() => setPage("breeding")}
          >
            <Sparkles /> Reprodução
          </button>
          <button
            className={`nav-item ${page === "clients" ? "active" : ""}`}
            onClick={() => setPage("clients")}
          >
            <Users /> Clientes
          </button>
          <button
            className={`nav-item ${page === "finance" ? "active" : ""}`}
            onClick={() => setPage("finance")}
          >
            <CircleDollarSign /> Financeiro
          </button>
          <button
            className={`nav-item ${page === "agenda" ? "active" : ""}`}
            onClick={() => setPage("agenda")}
          >
            <CalendarDays /> Agenda
          </button>
          <button
            className={`nav-item ${page === "reports" ? "active" : ""}`}
            onClick={() => setPage("reports")}
          >
            <FileBarChart /> Relatórios
          </button>
          <button
            className={`nav-item ${page === "guide" ? "active" : ""}`}
            onClick={() => setPage("guide")}
          >
            <BookOpen /> Guia veterinário
          </button>
          <button
            className={`nav-item ${page === "sync" ? "active" : ""}`}
            onClick={() => setPage("sync")}
          >
            <Cloud /> Sincronização
          </button>
        </nav>
        <div className="sidebar-footer">
          <button
            className={`nav-item ${page === "settings" ? "active" : ""}`}
            onClick={() => setPage("settings")}
          >
            <Settings /> Configurações
          </button>
          <div className="sync-pill">
            <WifiOff /> Modo local <span>• Seguro</span>
          </div>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <button className="icon-button menu">
            <Menu />
          </button>
          <div className="search">
            <Search />
            <input
              id="global-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar cães, clientes, documentos..."
            />
            <kbd>Ctrl K</kbd>
            {normalizedSearch && (
              <div className="global-search-results">
                {globalDogResults.map((dog) => (
                  <button
                    type="button"
                    key={dog.id}
                    onClick={() => {
                      setSelectedDog(dog);
                      setSearch("");
                    }}
                  >
                    <DogIcon />
                    <span>
                      <strong>{dog.name}</strong>
                      <small>{dog.breed} • Abrir ficha completa</small>
                    </span>
                    <ChevronRight />
                  </button>
                ))}
                {globalRecordResults.map((record) => (
                  <button
                    type="button"
                    key={record.id}
                    onClick={() => {
                      setPage(record.module);
                      setSearch("");
                    }}
                  >
                    <Search />
                    <span>
                      <strong>{record.title}</strong>
                      <small>
                        {pageInfo[record.module].title} • {record.category}
                      </small>
                    </span>
                    <ChevronRight />
                  </button>
                ))}
                {!globalDogResults.length && !globalRecordResults.length && (
                  <p>Nenhum cão, cliente ou registro encontrado.</p>
                )}
              </div>
            )}
          </div>
          <button
            className="icon-button"
            title="Abrir agenda"
            onClick={() => setPage("agenda")}
          >
            <Bell />
            <span className="notification-dot" />
          </button>
          <div className="avatar">FK</div>
        </header>

        <div className="content" key={page}>
          {page === "dashboard" ? (
            <>
              <section className="welcome">
                <div>
                  <p className="eyebrow">CENTRAL DO CANIL</p>
                  <h1>
                    Olá, Fallz Kennel <span>👋</span>
                  </h1>
                  <p>Cuide do seu plantel com organização e tranquilidade.</p>
                </div>
                <button
                  className="primary-button"
                  onClick={() => setDialogOpen(true)}
                >
                  <Plus /> Adicionar cão
                </button>
              </section>

              <section className="stats-grid">
                <StatCard
                  label="Cães ativos"
                  value={summary.activeDogs}
                  detail="no plantel"
                  icon={<DogIcon />}
                  tone="blue"
                />
                <StatCard
                  label="Machos"
                  value={summary.males}
                  detail="cadastrados"
                  icon={<span className="gender">♂</span>}
                  tone="cyan"
                />
                <StatCard
                  label="Fêmeas"
                  value={summary.females}
                  detail="cadastradas"
                  icon={<span className="gender">♀</span>}
                  tone="pink"
                />
                <StatCard
                  label="Filhotes"
                  value={summary.puppies}
                  detail="em acompanhamento"
                  icon={<Sparkles />}
                  tone="gold"
                />
              </section>

              <section className="dashboard-grid">
                <div className="panel dogs-panel">
                  <div className="panel-header">
                    <div>
                      <h2>Seu plantel</h2>
                      <p>Perfis e acompanhamento dos cães</p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setPage("dogs")}
                    >
                      Ver todos <ChevronRight />
                    </button>
                  </div>
                  {loading ? (
                    <div className="empty-state">
                      <span className="loader" />
                      Carregando dados locais...
                    </div>
                  ) : filteredDogs.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">
                        <DogIcon />
                      </div>
                      <h3>
                        {search
                          ? "Nenhum resultado"
                          : "Seu plantel começa aqui"}
                      </h3>
                      <p>
                        {search
                          ? "Tente buscar por outro nome, raça ou cor."
                          : "Cadastre o primeiro cão para acompanhar sua história, saúde e evolução."}
                      </p>
                      {!search && (
                        <button
                          className="secondary-button"
                          onClick={() => setDialogOpen(true)}
                        >
                          <Plus /> Cadastrar primeiro cão
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="dog-list">
                      {filteredDogs.slice(0, 5).map((dog) => (
                        <DogRow
                          dog={dog}
                          key={dog.id}
                          onClick={() => setSelectedDog(dog)}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="panel agenda-panel">
                  <div className="panel-header">
                    <div>
                      <h2>Próximos cuidados</h2>
                      <p>Sua agenda está em dia</p>
                    </div>
                    <CalendarDays />
                  </div>
                  <div className="agenda-empty">
                    <div className="orbit">
                      <CalendarDays />
                    </div>
                    <h3>Nenhum compromisso próximo</h3>
                    <p>Vacinas, consultas e lembretes aparecerão aqui.</p>
                    <button
                      className="text-button"
                      onClick={() => {
                        setPage("agenda");
                        setQuickCreate((value) => value + 1);
                      }}
                    >
                      <Plus /> Criar lembrete
                    </button>
                  </div>
                  <div className="local-card">
                    <div>
                      <span className="live-dot" />
                      <strong>Dados protegidos localmente</strong>
                    </div>
                    <p>O Fallz Kennel funciona mesmo sem internet.</p>
                  </div>
                </div>
              </section>
            </>
          ) : page === "dogs" ? (
            <DogsPage
              dogs={filteredDogs}
              loading={loading}
              onAdd={() => setDialogOpen(true)}
              onChanged={refresh}
            />
          ) : page === "feeding" ? (
            <FeedingPage dogs={dogs} />
          ) : page === "settings" ? (
            <SettingsPage />
          ) : page === "reports" ? (
            <ReportsPage dogs={dogs} />
          ) : page === "guide" ? (
            <VeterinaryGuidePage />
          ) : page === "sync" ? (
            <SyncPage onSynchronized={() => void refresh()} />
          ) : (
            <ModulePage page={page} dogs={dogs} quickCreate={quickCreate} />
          )}
        </div>
      </main>
      {dialogOpen && (
        <DogDialog
          onClose={() => setDialogOpen(false)}
          onCreated={async () => {
            setDialogOpen(false);
            await refresh();
          }}
        />
      )}
      {selectedDog && (
        <DogProfileDialog
          dog={selectedDog}
          onClose={() => setSelectedDog(null)}
        />
      )}
    </div>
  );
}

function DogsPage({
  dogs,
  loading,
  onAdd,
  onChanged,
}: {
  dogs: Dog[];
  loading: boolean;
  onAdd(): void;
  onChanged(): Promise<void>;
}): React.JSX.Element {
  const dialog = useUiDialog();
  const [filter, setFilter] = useState<"all" | "male" | "female" | "puppy">(
    "all",
  );
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);
  const [editingDog, setEditingDog] = useState<Dog | null | undefined>(
    undefined,
  );
  const visibleDogs = dogs.filter(
    (dog) =>
      filter === "all" ||
      (filter === "puppy" ? dog.status === "puppy" : dog.sex === filter),
  );
  return (
    <>
      <section className="welcome module-welcome">
        <div>
          <p className="eyebrow">PLANTEL</p>
          <h1>Cães</h1>
          <p>Cadastros, perfis e evolução de todos os cães.</p>
        </div>
        <button className="primary-button" onClick={onAdd}>
          <Plus /> Adicionar cão
        </button>
      </section>
      <section className="section-tabs">
        <button
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          Todos
        </button>
        <button
          className={filter === "male" ? "active" : ""}
          onClick={() => setFilter("male")}
        >
          Machos
        </button>
        <button
          className={filter === "female" ? "active" : ""}
          onClick={() => setFilter("female")}
        >
          Fêmeas
        </button>
        <button
          className={filter === "puppy" ? "active" : ""}
          onClick={() => setFilter("puppy")}
        >
          Filhotes
        </button>
      </section>
      <section className="panel page-panel">
        <div className="panel-header">
          <div>
            <h2>Todos os cães</h2>
            <p>
              {visibleDogs.length}{" "}
              {visibleDogs.length === 1
                ? "perfil cadastrado"
                : "perfis cadastrados"}
            </p>
          </div>
        </div>
        {loading ? (
          <div className="empty-state">
            <span className="loader" />
            Carregando...
          </div>
        ) : visibleDogs.length ? (
          <div className="dog-list">
            {visibleDogs.map((dog) => (
              <div className="dog-list-item" key={dog.id}>
                <DogRow dog={dog} onClick={() => setSelectedDog(dog)} />
                <div className="dog-row-actions">
                  <button
                    className="row-action"
                    type="button"
                    aria-label={`Editar ${dog.name}`}
                    title="Editar cão"
                    onClick={() => setEditingDog(dog)}
                  >
                    <Pencil />
                  </button>
                  <button
                    className="row-action danger"
                    type="button"
                    aria-label={`Excluir ${dog.name}`}
                    title="Excluir cão"
                    onClick={async () => {
                      if (
                        await dialog.confirm({
                          title: "Excluir cão?",
                          message: `Tem certeza que deseja excluir ${dog.name}? A exclusão será sincronizada em todos os dispositivos.`,
                          confirmLabel: "Excluir cão",
                          tone: "danger",
                        })
                      ) {
                        await window.fallz.dogs.remove(dog.id);
                        await onChanged();
                      }
                    }}
                  >
                    <Trash2 />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <DogIcon />
            </div>
            <h3>Nenhum cão nesta categoria</h3>
            <p>Cadastre um cão ou selecione outro filtro.</p>
            <button className="secondary-button" onClick={onAdd}>
              <Plus /> Cadastrar cão
            </button>
          </div>
        )}
      </section>
      {selectedDog && (
        <DogProfileDialog
          dog={selectedDog}
          onClose={() => setSelectedDog(null)}
        />
      )}
      {editingDog !== undefined && (
        <DogDialog
          dog={editingDog}
          onClose={() => setEditingDog(undefined)}
          onCreated={async () => {
            setEditingDog(undefined);
            await onChanged();
          }}
        />
      )}
    </>
  );
}

function FeedingPage({ dogs }: { dogs: Dog[] }): React.JSX.Element {
  const dialog = useUiDialog();
  const [dogId, setDogId] = useState<string | null>(null),
    [plans, setPlans] = useState<FeedingPlanRecord[]>([]),
    [showForm, setShowForm] = useState(false),
    [weight, setWeight] = useState(0),
    [food, setFood] = useState(""),
    [kcal, setKcal] = useState(3800),
    [meals, setMeals] = useState(2),
    [times, setTimes] = useState("08:00, 18:00"),
    [stage, setStage] = useState<LifeStage>("adult-intact"),
    [goal, setGoal] = useState<WeightGoal>("maintain"),
    [message, setMessage] = useState("");
  async function refreshPlans(): Promise<void> {
    setPlans(await window.fallz.feeding.list());
  }
  useEffect(() => { void refreshPlans(); }, []);
  useEffect(() => {
    if (!dogId) {
      setWeight(0);
      return;
    }
    void Promise.all([
      window.fallz.measurements.list(dogId),
      window.fallz.feeding.list(),
    ]).then(([measurements, plans]) => {
      setWeight((measurements.at(-1)?.weightGrams ?? 0) / 1000);
      const saved = plans.find((p) => p.dogId === dogId);
      if (saved) {
        setFood(saved.foodName);
        setKcal(saved.kcalPerKg);
        setMeals(saved.mealsPerDay);
        setTimes(saved.times.join(", "));
        setStage(saved.lifeStage);
        setGoal(saved.goal);
      }
    });
  }, [dogId]);
  let plan: ReturnType<typeof calculateFeedingPlan> | null = null;
  try {
    if (weight > 0 && kcal > 0)
      plan = calculateFeedingPlan({
        weightKg: weight,
        foodKcalPerKg: kcal,
        lifeStage: stage,
        goal,
        mealsPerDay: meals,
        adjustmentPercent: 0,
      });
  } catch {
    plan = null;
  }
  async function save(): Promise<void> {
    if (!dogId || !plan || !food.trim()) {
      setMessage("Selecione um cão com pesagem e informe a ração.");
      return;
    }
    const parsed = times
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    if (parsed.length !== meals) {
      setMessage(`Informe exatamente ${meals} horários.`);
      return;
    }
    await window.fallz.feeding.save({
      dogId,
      foodName: food,
      kcalPerKg: kcal,
      dailyGrams: plan.dailyGrams,
      gramsPerMeal: plan.gramsPerMeal,
      mealsPerDay: meals,
      times: parsed,
      lifeStage: stage,
      goal,
      adjustmentPercent: 0,
    });
    await refreshPlans();
    setMessage("Plano salvo e pronto para sincronizar com o mobile.");
    setShowForm(false);
  }
  function editFeeding(saved: FeedingPlanRecord): void {
    setDogId(saved.dogId); setFood(saved.foodName); setKcal(saved.kcalPerKg);
    setMeals(saved.mealsPerDay); setTimes(saved.times.join(", "));
    setStage(saved.lifeStage); setGoal(saved.goal); setShowForm(true); setMessage("");
  }
  async function removeFeeding(saved: FeedingPlanRecord): Promise<void> {
    const linkedDog = dogs.find((dog) => dog.id === saved.dogId);
    if (!(await dialog.confirm({ title: "Excluir plano alimentar?", message: `O plano de ${linkedDog?.name ?? "este cão"} será removido e a exclusão será sincronizada.`, confirmLabel: "Excluir plano", tone: "danger" }))) return;
    await window.fallz.feeding.remove(saved.id);
    await refreshPlans();
  }
  return (
    <>
      <section className="welcome module-welcome">
        <div>
          <p className="eyebrow">NUTRIÇÃO</p>
          <h1>Alimentação</h1>
          <p>Calcule porções pelo peso, energia da ração e fase de vida.</p>
        </div>
        <button className="primary-button" onClick={() => { setDogId(null); setFood(""); setShowForm(true); }}><Plus /> Criar plano</button>
      </section>
      {!showForm && (
        <section className="panel settings-panel">
          <div className="settings-title"><div className="module-card-icon"><Utensils /></div><div><h2>Planos alimentares</h2><p>{plans.length} plano(s) cadastrado(s)</p></div></div>
          {plans.length === 0 ? <div className="empty-state"><strong>Nenhum plano cadastrado</strong><span>Use “Criar plano” para vincular um plano a um cão.</span></div> : <div className="profile-records">{plans.map((saved) => { const linkedDog = dogs.find((dog) => dog.id === saved.dogId); return <div key={saved.id}><div className={`profile-avatar ${linkedDog?.sex ?? "male"}`}>{linkedDog?.name[0]?.toUpperCase() ?? "?"}</div><div><strong>{linkedDog?.name ?? "Cão não encontrado"} · {saved.foodName}</strong><span>{saved.gramsPerMeal} g/refeição · {saved.mealsPerDay}× ao dia · {saved.dailyGrams} g/dia · {saved.times.join(" · ")}</span></div><div className="record-actions"><button className="icon-button" onClick={() => editFeeding(saved)} aria-label="Editar plano"><Pencil /></button><button className="icon-button danger" onClick={() => void removeFeeding(saved)} aria-label="Excluir plano"><Trash2 /></button></div></div>})}</div>}
        </section>
      )}
      {showForm && (
      <section className="panel settings-panel">
        <div className="settings-title">
          <div className="module-card-icon">
            <Utensils />
          </div>
          <div>
            <h2>Plano alimentar</h2>
            <p>
              Use a kcal/kg informada na embalagem. Reavalie junto ao peso e
              BCS.
            </p>
          </div>
        </div>
        <div className="form-grid">
          <label className="full">
            <span>Cão *</span>
            <DogPicker dogs={dogs} value={dogId} onChange={setDogId} />
          </label>
          <label>
            <span>Peso atual</span>
            <input
              readOnly
              value={
                weight
                  ? `${weight.toLocaleString("pt-BR")} kg`
                  : "Cadastre uma pesagem"
              }
            />
          </label>
          <label>
            <span>Ração *</span>
            <input
              value={food}
              onChange={(e) => setFood(e.target.value)}
              placeholder="Marca e linha"
            />
          </label>
          <label>
            <span>Energia (kcal/kg) *</span>
            <input
              type="number"
              value={kcal}
              onChange={(e) => setKcal(Number(e.target.value))}
            />
          </label>
          <label>
            <span>Fase</span>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as LifeStage)}
            >
              <option value="puppy-under-4m">Filhote até 4 meses</option>
              <option value="puppy-over-4m">Filhote após 4 meses</option>
              <option value="adult-intact">Adulto inteiro</option>
              <option value="adult-neutered">Adulto castrado</option>
              <option value="senior">Idoso</option>
            </select>
          </label>
          <label>
            <span>Objetivo</span>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value as WeightGoal)}
            >
              <option value="lose">Perder peso</option>
              <option value="maintain">Manter peso</option>
              <option value="gain">Ganhar peso</option>
            </select>
          </label>
          <label>
            <span>Refeições por dia</span>
            <input
              type="number"
              min="1"
              max="8"
              value={meals}
              onChange={(e) => setMeals(Number(e.target.value))}
            />
          </label>
          <label>
            <span>Horários separados por vírgula</span>
            <input value={times} onChange={(e) => setTimes(e.target.value)} />
          </label>
        </div>
        {plan && (
          <div className="smart-guidance">
            <Utensils />
            <div>
              <strong>
                {plan.gramsPerMeal} g por refeição • {plan.dailyGrams} g/dia
              </strong>
              <p>
                {plan.mealsPerDay} refeições • {plan.dailyKcal} kcal/dia • RER{" "}
                {plan.rerKcal} kcal
              </p>
              <small>
                Estimativa inicial. Ajuste pela evolução real do peso e
                orientação veterinária.
              </small>
            </div>
          </div>
        )}
        <div className="modal-actions">
          <button className="secondary-button" onClick={() => setShowForm(false)}>Cancelar</button>
          {message && <span className="success-message">{message}</span>}
          <button className="primary-button" onClick={() => void save()}>
            <Save /> Salvar plano
          </button>
        </div>
      </section>
      )}
    </>
  );
}

function DogPicker({
  dogs,
  value,
  optional = false,
  onChange,
}: {
  dogs: Dog[];
  value: string | null;
  optional?: boolean;
  onChange(id: string | null): void;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = dogs.find((dog) => dog.id === value);
  const visible = dogs.filter((dog) =>
    `${dog.name} ${dog.registeredName} ${dog.breed}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <button
        type="button"
        className={`dog-picker-trigger ${selected ? "has-value" : ""}`}
        onClick={() => setOpen(true)}
      >
        {selected ? (
          <>
            <div className={`dog-avatar ${selected.sex}`}>
              {selected.name[0]}
            </div>
            <div>
              <strong>{selected.name}</strong>
              <span>{selected.breed}</span>
            </div>
            <ChevronRight />
          </>
        ) : (
          <>
            <Search />
            <span>
              {optional
                ? "Nenhum cão vinculado — clique para escolher"
                : "Clique para selecionar um animal"}
            </span>
            <ChevronRight />
          </>
        )}
      </button>
      {open && (
        <div
          className="picker-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="picker-modal">
            <div className="modal-header">
              <div>
                <p className="eyebrow">ANIMAIS CADASTRADOS</p>
                <h2>Selecionar cão</h2>
                <p>Busque pelo nome, registro ou raça.</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setOpen(false)}
              >
                <X />
              </button>
            </div>
            <div className="picker-search">
              <Search />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nome..."
              />
            </div>
            <div className="picker-list">
              {optional && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                >
                  <div className="dog-avatar none">—</div>
                  <div>
                    <strong>Sem vínculo</strong>
                    <span>Não relacionar a um cão</span>
                  </div>
                </button>
              )}
              {visible.map((dog) => (
                <button
                  type="button"
                  className={dog.id === value ? "selected" : ""}
                  onClick={() => {
                    onChange(dog.id);
                    setOpen(false);
                  }}
                  key={dog.id}
                >
                  <div className={`dog-avatar ${dog.sex}`}>{dog.name[0]}</div>
                  <div>
                    <strong>{dog.name}</strong>
                    <span>
                      {dog.registeredName || dog.breed} •{" "}
                      {dog.sex === "female" ? "Fêmea" : "Macho"}
                    </span>
                  </div>
                  <ChevronRight />
                </button>
              ))}
              {!visible.length && (
                <div className="picker-empty">
                  Nenhum animal encontrado para “{query}”.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ModulePage({
  page,
  dogs,
  quickCreate,
}: {
  page: OperationalModule;
  dogs: Dog[];
  quickCreate: number;
}): React.JSX.Element {
  const dialog = useUiDialog();
  const info = pageInfo[page];
  const [records, setRecords] = useState<ModuleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ModuleRecord | null | undefined>(
    undefined,
  );
  const [filter, setFilter] = useState<string>("");
  async function refresh(): Promise<void> {
    setRecords(await window.fallz.records.list(page));
    setLoading(false);
  }
  useEffect(() => {
    void window.fallz.records.list(page).then((items) => {
      setRecords(items);
      setLoading(false);
    });
  }, [page]);
  useEffect(() => {
    if (quickCreate > 0) setEditing(null);
  }, [quickCreate]);
  const matchesFilter = (record: ModuleRecord, selected: string): boolean =>
    page !== "finance"
      ? record.category === selected
      : selected === "Receitas"
        ? record.transactionType === "income"
        : selected === "Despesas"
          ? record.transactionType === "expense"
          : selected === "Custos por cão"
            ? Boolean(record.dogId)
            : true;
  const visible = filter
    ? records.filter((record) => matchesFilter(record, filter))
    : records;
  const icons =
    page === "health"
      ? [Syringe, Activity, Pill, HeartPulse]
      : page === "breeding"
        ? [Sparkles, Activity, Baby, DogIcon]
        : page === "clients"
          ? [Users, UserRoundPlus, ReceiptText, CalendarDays]
          : page === "finance"
            ? [CircleDollarSign, ReceiptText, Activity, DogIcon]
            : [CalendarDays, CalendarDays, HeartPulse, Sparkles];
  return (
    <>
      <section className="welcome module-welcome">
        <div>
          <p className="eyebrow">{info.eyebrow}</p>
          <h1>{info.title}</h1>
          <p>{info.description}</p>
        </div>
        <button className="primary-button" onClick={() => setEditing(null)}>
          <Plus /> {info.action}
        </button>
      </section>
      <section className="module-cards">
        {info.cards.map((card, index) => {
          const Icon = icons[index];
          const matching = records.filter((record) =>
            matchesFilter(record, card.title),
          );
          const count = matching.length;
          const income = records
            .filter((record) => record.transactionType === "income")
            .reduce((sum, record) => sum + (record.amount ?? 0), 0);
          const expense = records
            .filter((record) => record.transactionType === "expense")
            .reduce((sum, record) => sum + (record.amount ?? 0), 0);
          const financeValue =
            card.title === "Receitas"
              ? income
              : card.title === "Despesas"
                ? expense
                : card.title === "Saldo"
                  ? income - expense
                  : matching.reduce(
                      (sum, record) => sum + (record.amount ?? 0),
                      0,
                    );
          const summary =
            page === "finance"
              ? financeValue.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })
              : `${count} ${count === 1 ? "registro" : "registros"}`;
          return (
            <button
              className={`module-card ${filter === card.title ? "selected" : ""}`}
              onClick={() => setFilter(filter === card.title ? "" : card.title)}
              key={card.title}
            >
              <div className="module-card-icon">
                <Icon />
              </div>
              <div>
                <strong>{card.title}</strong>
                <span>
                  {summary} • {card.text}
                </span>
              </div>
              <ChevronRight />
            </button>
          );
        })}
      </section>
      <section className="panel module-panel">
        <div className="panel-header">
          <div>
            <h2>{filter || "Todos os registros"}</h2>
            <p>
              {visible.length}{" "}
              {visible.length === 1 ? "item cadastrado" : "itens cadastrados"}
            </p>
          </div>
          {filter && (
            <button className="text-button" onClick={() => setFilter("")}>
              Limpar filtro <X />
            </button>
          )}
        </div>
        {loading ? (
          <div className="empty-state">
            <span className="loader" />
            Carregando...
          </div>
        ) : visible.length ? (
          <div className="record-list">
            {visible.map((record) => {
              const dogName = dogs.find((dog) => dog.id === record.dogId)?.name;
              const contacts = [
                record.phone,
                record.whatsapp && `WhatsApp ${record.whatsapp}`,
                record.email,
                record.city && `${record.city}/${record.state}`,
              ]
                .filter(Boolean)
                .join(" • ");
              const purchase = [
                record.quantity && `${record.quantity} ${record.unit}`,
                record.supplier,
              ]
                .filter(Boolean)
                .join(" • ");
              return (
                <div className="record-row" key={record.id}>
                  <div className="record-date">
                    <strong>{record.date.slice(8, 10)}</strong>
                    <span>
                      {record.date.slice(5, 7)}/{record.date.slice(0, 4)}
                    </span>
                  </div>
                  <div className="record-body">
                    <strong>
                      {record.title}
                      {dogName ? ` • ${dogName}` : ""}
                    </strong>
                    <span>
                      {record.category}
                      {contacts ? ` • ${contacts}` : ""}
                      {purchase ? ` • ${purchase}` : ""}
                      {record.description ? ` • ${record.description}` : ""}
                    </span>
                  </div>
                  {record.amount !== null && (
                    <b
                      className={
                        record.transactionType === "expense" ? "expense" : ""
                      }
                    >
                      {record.transactionType === "expense" ? "− " : "+ "}
                      {record.amount.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </b>
                  )}
                  <button
                    className="row-action"
                    title="Editar"
                    onClick={() => setEditing(record)}
                  >
                    <Pencil />
                  </button>
                  <button
                    className="row-action danger"
                    title="Excluir"
                    onClick={async () => {
                      if (
                        await dialog.confirm({
                          title: "Excluir registro?",
                          message: `Tem certeza que deseja excluir “${record.title}”? A exclusão será sincronizada.`,
                          confirmLabel: "Excluir registro",
                          tone: "danger",
                        })
                      ) {
                        await window.fallz.records.remove(record.id);
                        await refresh();
                      }
                    }}
                  >
                    <Trash2 />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              {page === "clients" ? (
                <Users />
              ) : page === "health" ? (
                <HeartPulse />
              ) : page === "finance" ? (
                <CircleDollarSign />
              ) : (
                <Activity />
              )}
            </div>
            <h3>Nenhum registro por enquanto</h3>
            <p>
              Use o botão “{info.action}” para adicionar o primeiro registro
              deste módulo.
            </p>
            <button
              className="secondary-button"
              onClick={() => setEditing(null)}
            >
              <Plus /> {info.action}
            </button>
          </div>
        )}
      </section>
      {editing !== undefined && (
        <RecordDialog
          page={page}
          dogs={dogs}
          record={editing}
          categories={info.cards.map((card) => card.title)}
          onClose={() => setEditing(undefined)}
          onSaved={async () => {
            setEditing(undefined);
            await refresh();
          }}
        />
      )}
    </>
  );
}

function RecordDialog({
  page,
  dogs,
  record,
  categories,
  onClose,
  onSaved,
}: {
  page: OperationalModule;
  dogs: Dog[];
  record: ModuleRecord | null;
  categories: string[];
  onClose(): void;
  onSaved(): Promise<void>;
}): React.JSX.Element {
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ModuleRecordFormInput, unknown, ModuleRecordInput>({
    resolver: zodResolver(moduleRecordInputSchema),
    defaultValues: record ?? {
      module: page,
      title: "",
      category: categories[0],
      date: new Date().toISOString().slice(0, 10),
      description: "",
      amount: null,
      dogId: null,
      nextDate: "",
      phone: "",
      whatsapp: "",
      instagram: "",
      email: "",
      city: "",
      state: "",
      cpf: "",
      transactionType: page === "finance" ? "expense" : null,
      quantity: null,
      unit: "",
      supplier: "",
      manufacturer: "",
      batch: "",
      dose: "",
      veterinarian: "",
      clinic: "",
    },
  });
  const labels: Record<
    OperationalModule,
    { title: string; titleField: string }
  > = {
    health: { title: "Registro de saúde", titleField: "Descrição principal" },
    breeding: {
      title: "Acompanhamento reprodutivo",
      titleField: "Identificação",
    },
    clients: { title: "Cliente", titleField: "Nome do cliente" },
    finance: {
      title: "Lançamento financeiro",
      titleField: "Descrição do lançamento",
    },
    agenda: { title: "Evento da agenda", titleField: "Título do evento" },
  };
  const categoryOptions =
    page === "finance"
      ? [
          "Ração",
          "Veterinário",
          "Vacinas",
          "Medicamentos",
          "Coleiras e acessórios",
          "Pedigree",
          "Estrutura",
          "Reprodução",
          "Exames",
          "Vendas",
          "Reservas",
          "Outros",
        ]
      : categories;
  async function submit(input: ModuleRecordInput): Promise<void> {
    try {
      if (record) await window.fallz.records.update(record.id, input);
      else await window.fallz.records.create(input);
      await onSaved();
    } catch {
      setServerError(
        "Não foi possível salvar. Confira os dados e tente novamente.",
      );
    }
  }
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal record-modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <div>
            <p className="eyebrow">{record ? "EDITAR" : "NOVO REGISTRO"}</p>
            <h2>{labels[page].title}</h2>
            <p>Os dados serão salvos no SQLite deste computador.</p>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>
        <form onSubmit={handleSubmit(submit)}>
          <input type="hidden" {...register("module")} />
          <div className="form-grid">
            {page === "health" && (
              <label className="full">
                <span>Cão *</span>
                <DogPicker
                  dogs={dogs}
                  value={watch("dogId") ?? null}
                  onChange={(id) =>
                    setValue("dogId", id, { shouldValidate: true })
                  }
                />
                {errors.dogId && <small>{errors.dogId.message}</small>}
                {!dogs.length && (
                  <small>Cadastre um cão antes de registrar a saúde.</small>
                )}
              </label>
            )}
            {page === "finance" && (
              <>
                <label>
                  <span>Tipo *</span>
                  <select
                    {...register("transactionType", {
                      setValueAs: (value) => value || null,
                    })}
                  >
                    <option value="expense">Despesa</option>
                    <option value="income">Receita</option>
                  </select>
                </label>
                <label>
                  <span>Vincular a um cão (opcional)</span>
                  <DogPicker
                    dogs={dogs}
                    value={watch("dogId") ?? null}
                    optional
                    onChange={(id) => setValue("dogId", id)}
                  />
                </label>
              </>
            )}
            <label className="full">
              <span>{labels[page].titleField} *</span>
              <input
                autoFocus
                {...register("title")}
                placeholder={
                  page === "clients"
                    ? "Nome completo"
                    : page === "health"
                      ? "Ex.: Vacina V10"
                      : "Informe um título"
                }
              />
              {errors.title && <small>{errors.title.message}</small>}
            </label>
            <label>
              <span>Categoria *</span>
              <select {...register("category")}>
                {categoryOptions.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Data *</span>
              <input type="date" {...register("date")} />
              {errors.date && <small>Informe uma data válida</small>}
            </label>
            {page === "health" && (
              <>
                <label>
                  <span>{watch("category") === "Doenças" ? "Data de retorno" : "Próxima aplicação/retorno"}</span>
                  <input type="date" {...register("nextDate")} />
                </label>
                <label>
                  <span>{watch("category") === "Doenças" ? "Medicamentos administrados" : "Fabricante"}</span>
                  <input {...register("manufacturer")} />
                </label>
                <label>
                  <span>{watch("category") === "Doenças" ? "Tratamento realizado" : "Lote"}</span>
                  <input {...register("batch")} />
                </label>
                <label>
                  <span>{watch("category") === "Doenças" ? "Doses e frequência" : "Dose"}</span>
                  <input {...register("dose")} />
                </label>
                <label>
                  <span>Veterinário</span>
                  <input {...register("veterinarian")} />
                </label>
                <label>
                  <span>Clínica</span>
                  <input {...register("clinic")} />
                </label>
              </>
            )}
            {page === "clients" && (
              <>
                <label>
                  <span>Telefone</span>
                  <input {...register("phone")} />
                </label>
                <label>
                  <span>WhatsApp</span>
                  <input {...register("whatsapp")} />
                </label>
                <label>
                  <span>E-mail</span>
                  <input type="email" {...register("email")} />
                  {errors.email && <small>{errors.email.message}</small>}
                </label>
                <label>
                  <span>Instagram</span>
                  <input {...register("instagram")} placeholder="@usuario" />
                </label>
                <label>
                  <span>Cidade</span>
                  <input {...register("city")} />
                </label>
                <label>
                  <span>Estado</span>
                  <input maxLength={2} {...register("state")} />
                </label>
                <label>
                  <span>CPF (opcional)</span>
                  <input {...register("cpf")} />
                </label>
              </>
            )}
            {page === "finance" && (
              <>
                <label>
                  <span>Valor total (R$) *</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    {...register("amount", {
                      setValueAs: (value) =>
                        value === "" ? null : Number(value),
                    })}
                  />
                </label>
                <label>
                  <span>Quantidade</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    {...register("quantity", {
                      setValueAs: (value) =>
                        value === "" ? null : Number(value),
                    })}
                  />
                </label>
                <label>
                  <span>Unidade</span>
                  <select {...register("unit")}>
                    <option value="">Selecione</option>
                    <option>kg</option>
                    <option>saco</option>
                    <option>unidade</option>
                    <option>caixa</option>
                    <option>dose</option>
                    <option>frasco</option>
                  </select>
                </label>
                <label>
                  <span>Fornecedor / loja</span>
                  <input {...register("supplier")} />
                </label>
              </>
            )}
            <label className="full">
              <span>{page === "health" && watch("category") === "Doenças" ? "Sintomas, o que aconteceu e evolução" : "Observações"}</span>
              <textarea
                {...register("description")}
                placeholder="Informações complementares"
              />
            </label>
          </div>
          {serverError && <p className="form-error">{serverError}</p>}
          <div className="modal-actions">
            <button type="button" className="ghost-button" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="primary-button"
              disabled={isSubmitting || (page === "health" && !dogs.length)}
            >
              <Save /> {isSubmitting ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReportsPage({ dogs }: { dogs: Dog[] }): React.JSX.Element {
  const [selectedDogId, setSelectedDogId] = useState(dogs[0]?.id ?? "");
  const [report, setReport] = useState<{
    dog: Dog;
    records: ModuleRecord[];
    measurements: Measurement[];
  } | null>(null);
  const [message, setMessage] = useState("");
  async function viewDogReport(): Promise<void> {
    if (!selectedDogId) {
      setMessage("Cadastre e selecione um cão para visualizar a ficha.");
      return;
    }
    setReport(await window.fallz.reports.dog(selectedDogId));
    setMessage("");
  }
  async function exportReport(): Promise<void> {
    const path = await window.fallz.reports.exportPdf(
      `Ficha completa - ${report?.dog.name ?? "Fallz Kennel"}`,
    );
    setMessage(path ? `PDF salvo em ${path}` : "Download cancelado.");
  }
  const first = (category: string): ModuleRecord | undefined =>
    report?.records
      .filter((item) => item.category === category)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
  const firstVaccine = first("Vacinas");
  const firstDeworming = first("Vermífugos");
  const latestMeasurement = report?.measurements.at(-1);
  return (
    <>
      <section className="welcome module-welcome">
        <div>
          <p className="eyebrow">DOCUMENTOS</p>
          <h1>Relatórios</h1>
          <p>
            Visualize a ficha dentro do aplicativo e baixe em PDF somente se
            desejar.
          </p>
        </div>
      </section>
      <section className="report-toolbar">
        <label>
          <span>Cão</span>
          <DogPicker
            dogs={dogs}
            value={selectedDogId || null}
            onChange={(id) => {
              setSelectedDogId(id ?? "");
              setReport(null);
            }}
          />
        </label>
        <button className="primary-button" onClick={() => void viewDogReport()}>
          <FileBarChart /> Visualizar ficha completa
        </button>
      </section>
      {!report ? (
        <section className="report-grid">
          {[
            "Ficha completa do cão",
            "Crescimento",
            "Histórico de saúde",
            "Vacinas e vermífugos",
            "Financeiro do cão",
          ].map((item) => (
            <button
              className="report-card"
              key={item}
              onClick={() => void viewDogReport()}
            >
              <div className="module-card-icon">
                <FileBarChart />
              </div>
              <div>
                <strong>{item}</strong>
                <span>Visualizar no aplicativo</span>
              </div>
              <ChevronRight />
            </button>
          ))}
        </section>
      ) : (
        <section className="report-preview">
          <div className="report-heading">
            <img src={logoUrl} alt="Fallz Kennel" />
            <div>
              <span>FALLZ KENNEL</span>
              <h2>Ficha completa do cão</h2>
            </div>
            <button
              className="ghost-button no-print"
              onClick={() => void exportReport()}
            >
              <Download /> Baixar PDF
            </button>
          </div>
          <div className="report-dog">
            <div className={`profile-avatar ${report.dog.sex}`}>
              {report.dog.name[0]}
            </div>
            <div>
              <h3>{report.dog.name}</h3>
              <p>
                {report.dog.registeredName || "Nome de registro não informado"}
              </p>
            </div>
          </div>
          <div className="report-facts">
            <div>
              <span>Nascimento</span>
              <strong>
                {report.dog.birthDate.split("-").reverse().join("/")}
              </strong>
            </div>
            <div>
              <span>Sexo</span>
              <strong>{report.dog.sex === "female" ? "Fêmea" : "Macho"}</strong>
            </div>
            <div>
              <span>Raça</span>
              <strong>{report.dog.breed}</strong>
            </div>
            <div>
              <span>Cor</span>
              <strong>{report.dog.color || "Não informada"}</strong>
            </div>
            <div>
              <span>Peso atual</span>
              <strong>
                {latestMeasurement
                  ? `${formatWeight(latestMeasurement.weightGrams)} — ${latestMeasurement.date.split("-").reverse().join("/")}`
                  : "Não registrado"}
              </strong>
            </div>
            <div>
              <span>Primeira vacina</span>
              <strong>
                {firstVaccine
                  ? `${firstVaccine.title} — ${firstVaccine.date.split("-").reverse().join("/")}`
                  : "Não registrada"}
              </strong>
            </div>
            <div>
              <span>Primeiro vermífugo</span>
              <strong>
                {firstDeworming
                  ? `${firstDeworming.title} — ${firstDeworming.date.split("-").reverse().join("/")}`
                  : "Não registrado"}
              </strong>
            </div>
          </div>
          <h3 className="report-section-title">Histórico de peso</h3>
          {report.measurements.length ? (
            <div className="report-history">
              {report.measurements.map((item) => (
                <div key={item.id}>
                  <strong>
                    {item.date.split("-").reverse().join("/")} • {item.ageDays}{" "}
                    dias
                  </strong>
                  <span>
                    {formatWeight(item.weightGrams)}
                    {item.bodyConditionScore
                      ? ` • Condição corporal ${item.bodyConditionScore}/9`
                      : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="report-empty">Nenhuma pesagem registrada.</p>
          )}
          <h3 className="report-section-title">Histórico vinculado</h3>
          {report.records.length ? (
            <div className="report-history">
              {report.records.map((item) => (
                <div key={item.id}>
                  <strong>
                    {item.date.split("-").reverse().join("/")} • {item.category}
                  </strong>
                  <span>
                    {item.title}
                    {item.dose ? ` • Dose: ${item.dose}` : ""}
                    {item.manufacturer ? ` • ${item.manufacturer}` : ""}
                    {item.amount !== null
                      ? ` • ${item.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
                      : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="report-empty">
              Ainda não há registros de saúde ou financeiro vinculados a este
              cão.
            </p>
          )}
        </section>
      )}
      {message && <div className="toast-inline">{message}</div>}
    </>
  );
}

function SyncPage({
  onSynchronized,
}: {
  onSynchronized(): void;
}): React.JSX.Element {
  const [user, setUser] = useState<{
    uid: string;
    email: string | null;
  } | null>(null);
  const [summary, setSummary] = useState<SyncSummary | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refreshSummary(): Promise<void> {
    setSummary(await window.fallz.sync.summary());
  }
  async function runSync(): Promise<void> {
    setBusy(true);
    setError("");
    setMessage("Sincronizando alterações com o Firebase...");
    try {
      const result = await synchronizeFirebase();
      await refreshSummary();
      onSynchronized();
      setMessage(
        `Sincronização concluída: ${result.uploaded} enviadas e ${result.downloaded} recebidas.`,
      );
    } catch (caught) {
      setMessage("");
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível sincronizar.",
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void window.fallz.sync.summary().then(setSummary);
    return observeFirebaseUser((firebaseUser) =>
      setUser(
        firebaseUser
          ? { uid: firebaseUser.uid, email: firebaseUser.email }
          : null,
      ),
    );
  }, []);
  useEffect(() => {
    const online = (): void => {
      if (user) void runSync();
    };
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  });
  async function login(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await loginFirebase(email, password);
      setUser({ uid: result.uid, email: result.email });
      setPassword("");
      setMessage("Conta conectada. Iniciando sincronização...");
      await runSync();
    } catch {
      setError(
        "Não foi possível entrar. Confira e-mail, senha, Authentication e as regras do Firestore.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="welcome module-welcome">
        <div>
          <p className="eyebrow">FIREBASE</p>
          <h1>Sincronização</h1>
          <p>
            SQLite local com cópia sincronizada e protegida no Cloud Firestore.
          </p>
        </div>
        {user && (
          <button
            className="primary-button"
            disabled={busy}
            onClick={() => void runSync()}
          >
            <RefreshCw className={busy ? "spinning" : ""} />{" "}
            {busy ? "Sincronizando..." : "Sincronizar agora"}
          </button>
        )}
      </section>
      <section className="sync-grid">
        <div className="panel sync-account">
          <div className="panel-header">
            <div>
              <h2>Conta Firebase</h2>
              <p>Acesso exclusivo aos dados do canil</p>
            </div>
            {user ? <CheckCircle2 className="connected" /> : <Cloud />}
          </div>
          {user ? (
            <div className="connected-account">
              <div className="avatar">
                {user.email?.[0]?.toUpperCase() ?? "F"}
              </div>
              <div>
                <strong>{user.email}</strong>
                <span>Conectado e autenticado</span>
                <small>UID: {user.uid}</small>
              </div>
              <button
                className="ghost-button"
                onClick={() => void logoutFirebase()}
              >
                <LogOut /> Desconectar
              </button>
            </div>
          ) : (
            <form className="login-form" onSubmit={login}>
              <label>
                <span>E-mail</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label>
                <span>Senha</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              <button className="primary-button" disabled={busy}>
                <LogIn /> Entrar e sincronizar
              </button>
              <small>
                A senha é entregue diretamente ao Firebase Authentication e não
                é salva no banco local.
              </small>
            </form>
          )}
        </div>
        <div className="panel sync-status">
          <div className="panel-header">
            <div>
              <h2>Estado local</h2>
              <p>Fila segura deste dispositivo</p>
            </div>
            <Database />
          </div>
          <div className="sync-facts">
            <div>
              <span>Alterações pendentes</span>
              <strong>{summary?.pending ?? "—"}</strong>
            </div>
            <div>
              <span>Última sincronização</span>
              <strong>
                {summary?.lastSync
                  ? new Date(summary.lastSync).toLocaleString("pt-BR")
                  : "Nunca"}
              </strong>
            </div>
            <div>
              <span>Dispositivo</span>
              <strong>{summary?.deviceId ?? "Carregando..."}</strong>
            </div>
            <div>
              <span>Conexão</span>
              <strong>{navigator.onLine ? "Online" : "Offline"}</strong>
            </div>
          </div>
        </div>
      </section>
      {message && (
        <div className="toast-inline">
          <CheckCircle2 /> {message}
        </div>
      )}
      {error && (
        <div className="sync-error">
          <AlertTriangle /> <span>{error}</span>
        </div>
      )}
    </>
  );
}

function SettingsPage(): React.JSX.Element {
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [updateState, setUpdateState] = useState<UpdateStatus>({ status: "idle", message: "" });
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<KennelSettings>({
    resolver: zodResolver(kennelSettingsSchema),
    defaultValues: {
      kennelName: "Fallz Kennel",
      owner: "",
      phone: "",
      email: "",
      city: "",
      state: "",
      mainBreed: "American Bully",
    },
  });
  useEffect(() => {
    void window.fallz.settings.get().then((value) => {
      reset(value);
      setLoaded(true);
    });
  }, [reset]);
  useEffect(() => window.fallz.updater.onStatus(setUpdateState), []);
  async function submit(input: KennelSettings): Promise<void> {
    await window.fallz.settings.save(input);
    setMessage("Configurações salvas no banco local.");
  }
  async function checkUpdate(): Promise<void> {
    setUpdateState({ status: "checking", message: "Verificando atualização..." });
    const result = await window.fallz.updater.check();
    setUpdateState(result);
  }
  const updateBusy = updateState.status === "checking" || updateState.status === "downloading" || updateState.status === "installing";
  return (
    <>
      <section className="welcome module-welcome">
        <div>
          <p className="eyebrow">PREFERÊNCIAS</p>
          <h1>Configurações do canil</h1>
          <p>Identidade, informações e atualizações do Fallz Kennel.</p>
        </div>
      </section>
      <section className="panel settings-panel">
        <div className="settings-title">
          <div className="module-card-icon">
            <RefreshCw />
          </div>
          <div>
            <h2>Atualização do aplicativo</h2>
            <p>Baixe a versão mais recente sem desinstalar o programa.</p>
          </div>
        </div>
        <div className="modal-actions">
          {updateState.message && (
            <span className={`update-message ${updateState.status === "error" ? "error" : ""}`}>{updateState.message}</span>
          )}
          {updateState.status === "downloaded" ? (
            <button
              className="primary-button"
              onClick={() => {
                setUpdateState((value) => ({ ...value, status: "installing", message: "Instalando atualização e reiniciando..." }));
                void window.fallz.updater.install();
              }}
            >
              <Download /> Instalar e reiniciar
            </button>
          ) : (
            <button
              className={`primary-button ${updateBusy ? "update-working" : ""}`}
              disabled={updateBusy}
              onClick={() => void checkUpdate()}
            >
              {updateState.status === "downloading" ? <Download /> : <RefreshCw />}
              {updateState.status === "checking" && "Verificando..."}
              {updateState.status === "downloading" && `Baixando... ${updateState.percent ?? 0}%`}
              {updateState.status === "installing" && "Instalando..."}
              {!updateBusy && "Verificar atualização"}
            </button>
          )}
        </div>
      </section>
      <section className="panel settings-panel">
        {!loaded ? (
          <div className="empty-state">
            <span className="loader" />
            Carregando...
          </div>
        ) : (
          <form onSubmit={handleSubmit(submit)}>
            <div className="settings-title">
              <div className="module-card-icon">
                <Settings />
              </div>
              <div>
                <h2>Dados do canil</h2>
                <p>Essas informações serão usadas em fichas e relatórios.</p>
              </div>
            </div>
            <div className="form-grid">
              <label>
                <span>Nome do canil *</span>
                <input {...register("kennelName")} />
                {errors.kennelName && <small>Informe o nome</small>}
              </label>
              <label>
                <span>Raça principal *</span>
                <input {...register("mainBreed")} />
              </label>
              <label>
                <span>Proprietário</span>
                <input {...register("owner")} />
              </label>
              <label>
                <span>Telefone / WhatsApp</span>
                <input {...register("phone")} />
              </label>
              <label>
                <span>E-mail</span>
                <input {...register("email")} />
                {errors.email && <small>Informe um e-mail válido</small>}
              </label>
              <label>
                <span>Cidade</span>
                <input {...register("city")} />
              </label>
              <label>
                <span>Estado</span>
                <input maxLength={2} {...register("state")} />
              </label>
            </div>
            <div className="modal-actions">
              {message && <span className="success-message">{message}</span>}
              <button className="primary-button" disabled={isSubmitting}>
                <Save /> Salvar alterações
              </button>
            </div>
          </form>
        )}
      </section>
    </>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
  tone: string;
}): React.JSX.Element {
  return (
    <article className={`stat-card ${tone}`}>
      <div className="stat-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}

function DogRow({
  dog,
  onClick,
}: {
  dog: Dog;
  onClick?: () => void;
}): React.JSX.Element {
  const age = formatDistanceToNow(parseISO(dog.birthDate), { locale: ptBR });
  return (
    <button className="dog-row" onClick={onClick}>
      <div className={`dog-avatar ${dog.sex}`}>
        {dog.name.slice(0, 1).toUpperCase()}
      </div>
      <div className="dog-info">
        <strong>{dog.name}</strong>
        <span>
          {dog.breed} • {dog.color || "Cor não informada"}
        </span>
      </div>
      <div className="dog-meta">
        <span>{statusLabel[dog.status]}</span>
        <small>{age}</small>
      </div>
      <ChevronRight />
    </button>
  );
}

function DogProfileDialog({
  dog,
  onClose,
}: {
  dog: Dog;
  onClose(): void;
}): React.JSX.Element {
  const dialog = useUiDialog();
  const tabs = [
    "Resumo",
    "Acompanhamento",
    "Alimentação",
    "Saúde",
    "Doenças",
    "Vacinas",
    "Vermífugos",
    "Medicamentos",
    "Pedigree",
    "Reprodução",
    "Fotos",
    "Documentos",
    "Financeiro",
    "Histórico",
  ] as const;
  const [tab, setTab] = useState<(typeof tabs)[number]>("Resumo");
  const [records, setRecords] = useState<ModuleRecord[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [feedingPlan, setFeedingPlan] = useState<FeedingPlanRecord | null>(null);
  const [editingMeasurement, setEditingMeasurement] = useState<
    Measurement | null | undefined
  >(undefined);
  async function refreshMeasurements(): Promise<void> {
    setMeasurements(await window.fallz.measurements.list(dog.id));
  }
  useEffect(() => {
    void Promise.all([
      window.fallz.records.listByDog(dog.id).then(setRecords),
      window.fallz.measurements.list(dog.id).then(setMeasurements),
      window.fallz.feeding.list().then((plans) => setFeedingPlan(plans.find((plan) => plan.dogId === dog.id) ?? null)),
    ]);
  }, [dog.id]);
  const tabRecords = records.filter((record) =>
    tab === "Saúde"
      ? record.module === "health"
      : tab === "Doenças"
        ? record.category === "Doença" || record.category === "Doenças"
      : tab === "Vacinas"
        ? record.category === "Vacina" || record.category === "Vacinas"
        : tab === "Vermífugos"
          ? record.category === "Vermífugo" || record.category === "Vermífugos"
          : tab === "Medicamentos"
            ? record.category === "Medicamento" || record.category === "Medicamentos"
            : tab === "Reprodução"
              ? record.module === "breeding"
              : tab === "Financeiro"
                ? record.module === "finance"
                : tab === "Histórico",
  );
  const dataTabs = [
    "Saúde",
    "Doenças",
    "Vacinas",
    "Vermífugos",
    "Medicamentos",
    "Reprodução",
    "Financeiro",
    "Histórico",
  ];
  return (
    <div className="modal-backdrop">
      <div className="modal profile-modal" role="dialog" aria-modal="true">
        <div className="profile-header">
          <div className={`profile-avatar ${dog.sex}`}>
            {dog.name[0].toUpperCase()}
          </div>
          <div>
            <p className="eyebrow">PERFIL DO CÃO</p>
            <h2>{dog.name}</h2>
            <span>
              {dog.breed} • {dog.sex === "female" ? "Fêmea" : "Macho"} •{" "}
              {statusLabel[dog.status]}
            </span>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="profile-tabs">
          {tabs.map((item) => (
            <button
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="profile-content">
          {tab === "Resumo" ? (
            <div className="profile-summary">
              <div>
                <span>Nome de registro</span>
                <strong>{dog.registeredName || "Não informado"}</strong>
              </div>
              <div>
                <span>Nascimento</span>
                <strong>{dog.birthDate.split("-").reverse().join("/")}</strong>
              </div>
              <div>
                <span>Cor</span>
                <strong>{dog.color || "Não informada"}</strong>
              </div>
              <div>
                <span>Raça</span>
                <strong>{dog.breed}</strong>
              </div>
              <div className="full">
                <span>Observações</span>
                <strong>{dog.notes || "Nenhuma observação cadastrada."}</strong>
              </div>
            </div>
          ) : tab === "Alimentação" ? (
            feedingPlan ? <div className="profile-summary"><div><span>Ração</span><strong>{feedingPlan.foodName}</strong></div><div><span>Energia</span><strong>{feedingPlan.kcalPerKg} kcal/kg</strong></div><div><span>Porção</span><strong>{feedingPlan.gramsPerMeal} g por refeição</strong></div><div><span>Total diário</span><strong>{feedingPlan.dailyGrams} g/dia</strong></div><div><span>Refeições</span><strong>{feedingPlan.mealsPerDay}× ao dia</strong></div><div><span>Horários</span><strong>{feedingPlan.times.join(" · ")}</strong></div></div> : <div className="empty-state"><strong>Nenhum plano alimentar</strong><span>Crie um plano na tela Alimentação para vinculá-lo a este cão.</span></div>
          ) : tab === "Acompanhamento" ? (
            <GrowthPanel
              dog={dog}
              measurements={measurements}
              onAdd={() => setEditingMeasurement(null)}
              onEdit={setEditingMeasurement}
              onRemove={async (id) => {
                if (
                  await dialog.confirm({
                    title: "Excluir pesagem?",
                    message:
                      "Tem certeza que deseja excluir esta pesagem do acompanhamento?",
                    confirmLabel: "Excluir pesagem",
                    tone: "danger",
                  })
                ) {
                  await window.fallz.measurements.remove(id);
                  await refreshMeasurements();
                }
              }}
            />
          ) : dataTabs.includes(tab) ? (
            tabRecords.length ? (
              <div className="profile-records">
                {tabRecords.map((record) => (
                  <div key={record.id}>
                    <div className="record-date">
                      <strong>{record.date.slice(8, 10)}</strong>
                      <span>
                        {record.date.slice(5, 7)}/{record.date.slice(0, 4)}
                      </span>
                    </div>
                    <div>
                      <strong>{record.title}</strong>
                      <span>
                        {record.category}
                        {record.dose ? ` • Dose ${record.dose}` : ""}
                        {record.nextDate
                          ? ` • Próxima ${record.nextDate.split("-").reverse().join("/")}`
                          : ""}
                        {record.manufacturer ? ` • Medicamento/fabricante: ${record.manufacturer}` : ""}
                        {record.batch ? ` • Tratamento/lote: ${record.batch}` : ""}
                        {record.veterinarian ? ` • Veterinário: ${record.veterinarian}` : ""}
                        {record.clinic ? ` • Clínica: ${record.clinic}` : ""}
                        {record.description ? ` • ${record.description}` : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="tab-state">
                <div className="empty-icon">
                  <Activity />
                </div>
                <h3>Nenhum registro em {tab}</h3>
                <p>
                  Cadastre pelo módulo correspondente e selecione {dog.name}{" "}
                  como animal.
                </p>
              </div>
            )
          ) : (
            <div className="tab-state">
              <div className="empty-icon">
                <Activity />
              </div>
              <h3>
                {tab} de {dog.name}
              </h3>
              <p>Não há itens cadastrados nesta seção.</p>
            </div>
          )}
        </div>
      </div>
      {editingMeasurement !== undefined && (
        <MeasurementDialog
          dog={dog}
          measurement={editingMeasurement}
          onClose={() => setEditingMeasurement(undefined)}
          onSaved={async () => {
            setEditingMeasurement(undefined);
            await refreshMeasurements();
          }}
        />
      )}
    </div>
  );
}

function formatWeight(grams: number): string {
  return `${(grams / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 3 })} kg`;
}
function formatDelta(grams: number): string {
  return `${grams >= 0 ? "+" : "−"}${formatWeight(Math.abs(grams))}`;
}

function GrowthPanel({
  dog,
  measurements,
  onAdd,
  onEdit,
  onRemove,
}: {
  dog: Dog;
  measurements: Measurement[];
  onAdd(): void;
  onEdit(value: Measurement): void;
  onRemove(id: string): Promise<void>;
}): React.JSX.Element {
  const latest = measurements.at(-1);
  const previous = measurements.at(-2);
  const first = measurements[0];
  const lastDelta =
    latest && previous ? latest.weightGrams - previous.weightGrams : 0;
  const totalDelta =
    latest && first ? latest.weightGrams - first.weightGrams : 0;
  const intervalDays =
    latest && previous ? Math.max(1, latest.ageDays - previous.ageDays) : 0;
  const weeklyRate = intervalDays
    ? Math.round((lastDelta / intervalDays) * 7)
    : 0;
  const maximum = Math.max(...measurements.map((item) => item.weightGrams), 1);
  const bcs = latest?.bodyConditionScore;
  const condition =
    bcs === null || bcs === undefined
      ? "Registre o escore corporal (1–9) para uma análise mais útil."
      : bcs < 4
        ? "Abaixo da faixa corporal ideal (4–5/9). Converse com o veterinário antes de alterar a alimentação."
        : bcs <= 5
          ? "Condição corporal dentro da faixa ideal de 4–5/9 usada pela WSAVA."
          : "Acima da faixa corporal ideal (4–5/9). Procure avaliação veterinária e nutricional.";
  return (
    <div className="growth">
      <div className="growth-heading">
        <div>
          <h3>Acompanhamento de {dog.name}</h3>
          <p>Pesagens, medidas e evolução ao longo do tempo.</p>
        </div>
        <button className="primary-button" onClick={onAdd}>
          <Plus /> Nova pesagem
        </button>
      </div>
      {latest ? (
        <>
          <div className="growth-stats">
            <div>
              <span>Peso atual</span>
              <strong>{formatWeight(latest.weightGrams)}</strong>
              <small>{latest.date.split("-").reverse().join("/")}</small>
            </div>
            <div>
              <span>Desde a anterior</span>
              <strong className={lastDelta < 0 ? "negative" : "positive"}>
                {previous ? formatDelta(lastDelta) : "—"}
              </strong>
              <small>
                {intervalDays ? `em ${intervalDays} dias` : "primeira pesagem"}
              </small>
            </div>
            <div>
              <span>Desde o início</span>
              <strong className={totalDelta < 0 ? "negative" : "positive"}>
                {formatDelta(totalDelta)}
              </strong>
              <small>{measurements.length} pesagens</small>
            </div>
            <div>
              <span>Ritmo recente</span>
              <strong>
                {previous ? `${formatDelta(weeklyRate)}/sem` : "—"}
              </strong>
              <small>{latest.ageDays} dias de idade</small>
            </div>
          </div>
          <div className="growth-chart">
            <div className="chart-title">
              <strong>Evolução de peso</strong>
              <span>kg por data</span>
            </div>
            <div className="bars">
              {measurements.map((item) => (
                <div className="bar-column" key={item.id}>
                  <span>
                    {(item.weightGrams / 1000).toLocaleString("pt-BR", {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <div
                    style={{
                      height: `${Math.max(8, (item.weightGrams / maximum) * 120)}px`,
                    }}
                  />
                  <small>
                    {item.date.slice(8, 10)}/{item.date.slice(5, 7)}
                  </small>
                </div>
              ))}
            </div>
          </div>
          <div className="smart-guidance">
            <Sparkles />
            <div>
              <strong>Análise de acompanhamento</strong>
              <p>{condition}</p>
              <small>
                O padrão ABKC não define peso fixo para American Bully; peso e
                altura devem ser proporcionais à estrutura. Use a tendência, o
                escore corporal e a avaliação veterinária.
              </small>
            </div>
          </div>
          <div className="measurement-table">
            {[...measurements].reverse().map((item, reverseIndex) => {
              const originalIndex = measurements.length - 1 - reverseIndex;
              const prior = measurements[originalIndex - 1];
              const delta = prior ? item.weightGrams - prior.weightGrams : null;
              return (
                <div key={item.id}>
                  <div>
                    <strong>{item.date.split("-").reverse().join("/")}</strong>
                    <span>{item.ageDays} dias de idade</span>
                  </div>
                  <b>{formatWeight(item.weightGrams)}</b>
                  <span
                    className={
                      delta !== null && delta < 0 ? "negative" : "positive"
                    }
                  >
                    {delta === null ? "Inicial" : formatDelta(delta)}
                  </span>
                  <span>BCS {item.bodyConditionScore ?? "—"}/9</span>
                  <button className="row-action" onClick={() => onEdit(item)}>
                    <Pencil />
                  </button>
                  <button
                    className="row-action danger"
                    onClick={() => void onRemove(item.id)}
                  >
                    <Trash2 />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="tab-state">
          <div className="empty-icon">
            <Activity />
          </div>
          <h3>Nenhuma pesagem cadastrada</h3>
          <p>Registre peso em kg e gramas para acompanhar ganho ou perda.</p>
          <button className="secondary-button" onClick={onAdd}>
            <Plus /> Registrar primeira pesagem
          </button>
        </div>
      )}
    </div>
  );
}

function MeasurementDialog({
  dog,
  measurement,
  onClose,
  onSaved,
}: {
  dog: Dog;
  measurement: Measurement | null;
  onClose(): void;
  onSaved(): Promise<void>;
}): React.JSX.Element {
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MeasurementFormInput, unknown, MeasurementInput>({
    resolver: zodResolver(measurementInputSchema),
    defaultValues: measurement ?? {
      dogId: dog.id,
      date: new Date().toISOString().slice(0, 10),
      kilograms: 0,
      grams: 0,
      height: null,
      chestCircumference: null,
      headCircumference: null,
      bodyConditionScore: null,
      notes: "",
    },
  });
  async function submit(input: MeasurementInput): Promise<void> {
    try {
      if (measurement)
        await window.fallz.measurements.update(measurement.id, input);
      else await window.fallz.measurements.create(input);
      await onSaved();
    } catch {
      setServerError("Não foi possível salvar esta medição.");
    }
  }
  const optionalNumber = {
    setValueAs: (value: string) => (value === "" ? null : Number(value)),
  };
  return (
    <div className="picker-backdrop">
      <div className="modal measurement-modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">ACOMPANHAMENTO</p>
            <h2>
              {measurement ? "Editar medição" : `Nova pesagem de ${dog.name}`}
            </h2>
            <p>Informe kg e gramas separadamente para maior precisão.</p>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>
        <form onSubmit={handleSubmit(submit)}>
          <input type="hidden" {...register("dogId")} />
          <div className="form-grid">
            <label>
              <span>Data *</span>
              <input type="date" {...register("date")} />
            </label>
            <div className="weight-fields">
              <label>
                <span>Quilos *</span>
                <input
                  type="number"
                  min="0"
                  max="150"
                  {...register("kilograms", { valueAsNumber: true })}
                />
              </label>
              <label>
                <span>Gramas *</span>
                <input
                  type="number"
                  min="0"
                  max="999"
                  step="1"
                  {...register("grams", { valueAsNumber: true })}
                />
              </label>
              {errors.kilograms && <small>{errors.kilograms.message}</small>}
            </div>
            <label>
              <span>Altura (cm)</span>
              <input
                type="number"
                min="0"
                step="0.1"
                {...register("height", optionalNumber)}
              />
            </label>
            <label>
              <span>Peitoral (cm)</span>
              <input
                type="number"
                min="0"
                step="0.1"
                {...register("chestCircumference", optionalNumber)}
              />
            </label>
            <label>
              <span>Circunferência da cabeça (cm)</span>
              <input
                type="number"
                min="0"
                step="0.1"
                {...register("headCircumference", optionalNumber)}
              />
            </label>
            <label>
              <span>Condição corporal (1–9)</span>
              <input
                type="number"
                min="1"
                max="9"
                {...register("bodyConditionScore", optionalNumber)}
              />
            </label>
            <label className="full">
              <span>Observações</span>
              <textarea
                {...register("notes")}
                placeholder="Alimentação, apetite, atividade ou observações da pesagem"
              />
            </label>
          </div>
          {serverError && <p className="form-error">{serverError}</p>}
          <div className="modal-actions">
            <button type="button" className="ghost-button" onClick={onClose}>
              Cancelar
            </button>
            <button className="primary-button" disabled={isSubmitting}>
              <Save /> Salvar medição
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DogDialog({
  dog = null,
  onClose,
  onCreated,
}: {
  dog?: Dog | null;
  onClose(): void;
  onCreated(): Promise<void>;
}): React.JSX.Element {
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateDogFormInput, unknown, CreateDogInput>({
    resolver: zodResolver(createDogSchema),
    defaultValues: dog ?? {
      name: "",
      registeredName: "",
      sex: "female",
      birthDate: "",
      breed: "American Bully Standard",
      color: "",
      status: "puppy",
      notes: "",
    },
  });
  async function submit(input: CreateDogInput): Promise<void> {
    try {
      if (dog) await window.fallz.dogs.update(dog.id, input);
      else await window.fallz.dogs.create(input);
      await onCreated();
    } catch {
      setServerError(
        "Não foi possível salvar o cão. Confira os dados e tente novamente.",
      );
    }
  }
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">{dog ? "EDITAR PERFIL" : "NOVO PERFIL"}</p>
            <h2 id="dialog-title">
              {dog ? `Editar ${dog.name}` : "Adicionar cão"}
            </h2>
            <p>
              {dog
                ? "Atualize os dados e salve as alterações."
                : "Comece com as informações essenciais."}
            </p>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>
        <form onSubmit={handleSubmit(submit)}>
          <div className="form-grid">
            <label>
              <span>Nome *</span>
              <input autoFocus {...register("name")} placeholder="Ex.: Zara" />
              {errors.name && <small>{errors.name.message}</small>}
            </label>
            <label>
              <span>Nome de registro</span>
              <input
                {...register("registeredName")}
                placeholder="Nome no pedigree"
              />
            </label>
            <label>
              <span>Sexo *</span>
              <select {...register("sex")}>
                <option value="female">Fêmea</option>
                <option value="male">Macho</option>
              </select>
            </label>
            <label>
              <span>Nascimento *</span>
              <input type="date" {...register("birthDate")} />
              {errors.birthDate && <small>Informe uma data válida</small>}
            </label>
            <label>
              <span>Raça *</span>
              <input {...register("breed")} />
              {errors.breed && <small>{errors.breed.message}</small>}
            </label>
            <label>
              <span>Cor</span>
              <input {...register("color")} placeholder="Ex.: Blue tri" />
            </label>
            <label>
              <span>Status</span>
              <select {...register("status")}>
                <option value="puppy">Filhote</option>
                <option value="young">Jovem</option>
                <option value="adult">Adulto</option>
                <option value="breeder">Reprodutor</option>
                <option value="retired">Aposentado</option>
              </select>
            </label>
            <label className="full">
              <span>Observações</span>
              <textarea
                {...register("notes")}
                placeholder="Informações importantes sobre o cão"
              />
            </label>
          </div>
          {serverError && <p className="form-error">{serverError}</p>}
          <div className="modal-actions">
            <button type="button" className="ghost-button" onClick={onClose}>
              Cancelar
            </button>
            <button className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar cão"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
