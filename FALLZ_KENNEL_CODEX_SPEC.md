# FALLZ KENNEL — INSTRUÇÕES COMPLETAS PARA O CODEX

> Este arquivo é uma **especificação funcional e técnica**.
>
> **Não crie o projeto ainda.**
>
> O objetivo deste documento é dizer ao Codex **exatamente o que o aplicativo precisa ter, como deve funcionar e quais regras técnicas deve seguir** quando o desenvolvimento começar.

---

# 1. OBJETIVO DO PROJETO

Criar um sistema completo de gestão de canil chamado provisoriamente de:

**Fallz Kennel**

O sistema terá:

- versão Desktop para Windows usando Electron;
- versão Mobile para Android e iOS;
- banco local SQLite;
- funcionamento offline;
- sincronização entre dispositivos usando Dropbox;
- gerenciamento completo de cães, saúde, crescimento, pedigree, reprodução, ninhadas, clientes, financeiro, agenda, documentos, fotos, backups e relatórios.

O aplicativo deve ser pensado inicialmente para **American Bully**, mas deve permitir outras raças futuramente.

---

# 2. REGRA PRINCIPAL DA ARQUITETURA

O aplicativo deve ser **offline-first**.

Isso significa:

- todos os dados são salvos primeiro no SQLite local;
- o aplicativo deve funcionar normalmente sem internet;
- o Dropbox serve apenas para sincronização e backup;
- o Dropbox não é o banco principal;
- nenhum recurso essencial pode depender de conexão com internet.

Regra mais importante:

> **SQLite é o banco local. Dropbox é somente sincronização e backup.**

---

# 3. STACK DESEJADA

## Desktop

- Electron
- React
- Vite
- TypeScript
- SQLite
- better-sqlite3
- Tailwind CSS
- shadcn/ui
- Zustand
- TanStack Query
- Zod
- React Hook Form
- date-fns
- Recharts
- Lucide Icons

## Mobile

Preferencialmente:

- React Native
- Expo
- Expo Router
- TypeScript
- expo-sqlite
- NativeWind
- Zustand
- TanStack Query
- Zod
- React Hook Form
- date-fns

## Projeto compartilhado

Criar estrutura em monorepo.

Preferência:

- pnpm workspaces

Separar:

- apps/desktop
- apps/mobile
- packages/core
- packages/types
- packages/database
- packages/sync
- packages/validation
- packages/utils
- packages/ui

O máximo possível de regras de negócio deve ser compartilhado entre Desktop e Mobile.

---

# 4. PADRÕES OBRIGATÓRIOS DE CÓDIGO

O projeto deve usar:

- TypeScript strict;
- ESLint;
- Prettier;
- tipagem forte;
- sem uso desnecessário de `any`;
- Repository Pattern;
- Service Layer;
- migrations versionadas;
- validação com Zod;
- tratamento de erros consistente;
- logs locais;
- arquitetura modular;
- código fácil de manter.

Nunca acessar SQLite diretamente dentro dos componentes React.

Fluxo obrigatório:

```text
UI
↓
Service
↓
Repository
↓
SQLite
```

---

# 5. BANCO DE DADOS

Usar SQLite.

Cada tabela principal deve possuir:

- id UUID;
- created_at;
- updated_at;
- deleted_at;
- version;
- device_id.

Usar soft delete.

Exemplo:

```text
id TEXT PRIMARY KEY
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
deleted_at TEXT NULL
version INTEGER NOT NULL DEFAULT 1
device_id TEXT
```

Ativar:

```sql
PRAGMA foreign_keys = ON;
```

No Desktop:

```sql
PRAGMA journal_mode = WAL;
```

Usar migrations.

Criar tabela:

```text
schema_migrations
```

Nunca alterar banco existente sem migration.

---

# 6. IDS

Todos os registros devem usar UUID.

Preferência:

- UUID v7;
- UUID v4 se necessário.

Nunca depender de ID incremental para sincronização entre dispositivos.

---

# 7. SINCRONIZAÇÃO COM DROPBOX

A sincronização precisa ser segura.

## NÃO FAZER

Nunca sincronizar diretamente o arquivo SQLite aberto.

Não fazer:

```text
database.sqlite
PC → Dropbox
Celular → sobrescreve database.sqlite
```

Isso pode corromper banco ou perder dados.

---

# 8. ESTRATÉGIA DE SINCRONIZAÇÃO

Cada dispositivo possui seu próprio SQLite.

Toda alteração local deve gerar um evento de sincronização.

Criar tabela:

```text
sync_queue
```

Campos:

- id;
- entity_type;
- entity_id;
- operation;
- payload;
- created_at;
- attempts;
- synced_at;
- error.

Operações:

- create;
- update;
- delete.

Exemplo de evento:

```json
{
  "id": "uuid",
  "entity": "dogs",
  "entityId": "uuid-do-cao",
  "operation": "update",
  "deviceId": "pc-principal",
  "version": 5,
  "updatedAt": "2026-09-06T18:30:00Z",
  "payload": {
    "weight": 4.6
  }
}
```

---

# 9. ESTRUTURA NO DROPBOX

Usar pasta do aplicativo.

Exemplo:

```text
/Apps/FallzKennel/
├── metadata/
│   ├── manifest.json
│   └── devices.json
│
├── changes/
│   ├── DEVICE-PC/
│   ├── DEVICE-MOBILE/
│   └── DEVICE-NOTEBOOK/
│
├── snapshots/
│
├── media/
│
└── backups/
```

Cada dispositivo deve enviar somente as próprias alterações.

---

# 10. FLUXO DE SYNC

Fluxo esperado:

1. usuário altera dado;
2. alteração salva no SQLite;
3. evento entra em sync_queue;
4. aplicativo detecta internet;
5. autentica no Dropbox;
6. envia mudanças pendentes;
7. baixa mudanças externas;
8. aplica alterações no SQLite local;
9. atualiza cursor de sincronização;
10. marca eventos como sincronizados.

A UI deve mostrar:

- Offline;
- Sincronizando;
- Sincronizado;
- X alterações pendentes;
- Erro de sincronização;
- Conflito.

---

# 11. CONFLITOS DE SINCRONIZAÇÃO

Estratégia padrão inicial:

- version;
- updated_at;
- device_id;
- Last Write Wins somente quando apropriado.

Porém não sobrescrever dados históricos independentes.

Exemplo:

Histórico de peso:

- novo peso deve gerar nova linha;
- não sobrescrever pesagens diferentes.

Vacinas:

- cada aplicação é um registro independente.

Financeiro:

- cada lançamento é independente.

Anotações:

- preservar histórico ou criar conflito controlado.

---

# 12. DISPOSITIVOS

Criar tabela:

```text
devices
```

Campos:

- device_id;
- name;
- platform;
- app_version;
- first_seen;
- last_seen;
- last_sync.

Exibir tela:

```text
Dispositivos conectados
- PC Principal
- Celular
- Notebook
```

---

# 13. DROPBOX AUTH

Usar API oficial do Dropbox.

Usar:

- OAuth 2;
- PKCE;
- App Folder permission se possível.

Nunca armazenar token em texto puro.

Desktop:

- Electron safeStorage.

Mobile:

- SecureStore.

---

# 14. BACKUP

Além do sync, criar backup completo.

Backup manual:

```text
Criar Backup Agora
```

Backup automático:

- diário;
- semanal;
- manual.

Manter opção para conservar últimos X backups.

Backup deve conter:

- SQLite;
- metadados;
- índice de mídia;
- versão do schema.

Antes do backup:

- fazer checkpoint WAL;
- criar cópia segura;
- validar integridade.

---

# 15. RESTAURAÇÃO DE BACKUP

Fluxo:

1. selecionar backup;
2. validar arquivo;
3. validar versão do schema;
4. criar backup do banco atual;
5. restaurar;
6. rodar integrity_check;
7. reabrir banco.

Nunca sobrescrever banco silenciosamente.

---

# 16. INTEGRIDADE

Executar:

```sql
PRAGMA integrity_check;
```

Se falhar:

- impedir sincronização;
- avisar usuário;
- permitir restaurar backup.

---

# 17. MÓDULO DE CÃES

Criar cadastro completo.

Campos:

- nome;
- nome de registro;
- sexo;
- nascimento;
- raça;
- classe;
- cor;
- peso atual;
- altura atual;
- status;
- microchip;
- pedigree;
- entidade de registro;
- número de registro;
- pai;
- mãe;
- criador;
- proprietário;
- origem;
- data de aquisição;
- valor de aquisição;
- finalidade;
- observações;
- foto principal;
- castrado;
- status reprodutivo;
- ativo;
- falecido;
- data de falecimento;
- causa.

Status:

- filhote;
- jovem;
- adulto;
- reprodutor;
- aposentado;
- vendido;
- falecido.

---

# 18. PERFIL DO CÃO

Tela com abas:

```text
Resumo
Crescimento
Saúde
Vacinas
Vermífugos
Medicamentos
Pedigree
Reprodução
Fotos
Documentos
Financeiro
Histórico
```

Header:

- foto;
- nome;
- sexo;
- idade;
- raça;
- cor;
- peso;
- status;
- pedigree.

---

# 19. CRESCIMENTO

Criar tabela:

```text
dog_measurements
```

Campos:

- dog_id;
- date;
- age_days;
- weight;
- height;
- chest_circumference;
- head_circumference;
- notes.

Criar gráficos:

- peso por idade;
- altura por idade;
- evolução mensal;
- comparação entre cães.

---

# 20. SAÚDE

Tabela:

```text
health_records
```

Tipos:

- consulta;
- exame;
- cirurgia;
- lesão;
- alergia;
- emergência;
- acompanhamento.

Campos:

- cão;
- data;
- tipo;
- descrição;
- veterinário;
- clínica;
- diagnóstico;
- tratamento;
- retorno previsto;
- anexos;
- observações.

---

# 21. VACINAS

Tabela:

```text
vaccinations
```

Campos:

- dog_id;
- vaccine_name;
- manufacturer;
- batch;
- application_date;
- next_date;
- veterinarian;
- clinic;
- attachment;
- notes.

Gerar alertas.

---

# 22. VERMÍFUGOS

Tabela:

```text
dewormings
```

Campos:

- dog_id;
- product;
- active_ingredient;
- dose;
- application_date;
- next_date;
- notes.

---

# 23. ANTIPULGAS E CARRAPATOS

Tabela:

```text
parasite_preventions
```

Campos:

- dog_id;
- product;
- dose;
- application_date;
- expiration_date;
- next_date.

---

# 24. MEDICAMENTOS

Tabela:

```text
medications
```

Campos:

- dog_id;
- medication;
- dose;
- frequency;
- start_date;
- end_date;
- reason;
- prescribed_by;
- notes.

Permitir marcar doses administradas.

---

# 25. PEDIGREE

Criar árvore visual.

Relações:

```text
father_id
mother_id
```

Permitir:

- 3 gerações;
- 4 gerações;
- 5 gerações.

Cadastrar ancestrais mesmo que não pertençam ao canil.

Campos por ancestral:

- nome;
- foto;
- sexo;
- cor;
- pedigree;
- títulos;
- linhagem;
- observações.

---

# 26. PLANEJAMENTO DE CRUZAMENTO

Tela:

```text
Planejamento de Cruzamento
```

Selecionar:

- macho;
- fêmea.

Mostrar:

- ancestrais em comum;
- parentesco;
- repetição de nomes no pedigree;
- possíveis riscos de proximidade genética.

Não apresentar isso como laudo veterinário.

---

# 27. CIO

Tabela:

```text
heat_cycles
```

Campos:

- female_id;
- start_date;
- end_date;
- bleeding;
- behavior;
- progesterone;
- notes.

Criar previsão aproximada do próximo cio.

---

# 28. CRUZAMENTOS

Tabela:

```text
breedings
```

Campos:

- male_id;
- female_id;
- date;
- type;
- progesterone;
- responsible;
- cost;
- confirmed;
- result;
- notes.

Tipos:

- monta natural;
- inseminação.

---

# 29. GESTAÇÃO

Tabela:

```text
pregnancies
```

Campos:

- female_id;
- breeding_id;
- conception_estimate;
- expected_birth_date;
- ultrasound_date;
- estimated_puppies;
- xray_date;
- notes.

Dashboard:

```text
Gestação
Dia atual
Previsão de parto
Próximo exame
```

---

# 30. PARTO

Tabela:

```text
births
```

Campos:

- mother_id;
- father_id;
- start_time;
- end_time;
- birth_type;
- veterinarian;
- clinic;
- c_section;
- cost;
- notes.

---

# 31. NINHADAS

Tabela:

```text
litters
```

Campos:

- code;
- father_id;
- mother_id;
- birth_date;
- total;
- males;
- females;
- stillborn;
- theme;
- notes.

---

# 32. FILHOTES

Tabela:

```text
puppies
```

Campos:

- litter_id;
- temporary_name;
- final_name;
- sex;
- color;
- markings;
- birth_weight;
- birth_time;
- birth_order;
- status;
- microchip;
- pedigree;
- sale_price;
- buyer_id;
- reservation_date;
- deposit;
- balance;
- delivery_date;
- notes.

Status:

- disponível;
- reservado;
- vendido;
- ficará no canil;
- em avaliação;
- falecido.

---

# 33. PESO DOS FILHOTES

Permitir registro:

- no nascimento;
- diariamente;
- semanalmente;
- mensalmente.

Criar gráfico individual.

Criar comparação entre irmãos.

---

# 34. CLIENTES

Tabela:

```text
contacts
```

Campos:

- nome;
- telefone;
- WhatsApp;
- Instagram;
- email;
- cidade;
- estado;
- CPF opcional;
- observações.

---

# 35. RESERVAS

Tabela:

```text
reservations
```

Campos:

- puppy_id;
- contact_id;
- reservation_date;
- deposit_amount;
- total_price;
- balance;
- status;
- receipt;
- notes.

Status:

- aguardando pagamento;
- reservado;
- quitado;
- cancelado;
- entregue.

---

# 36. FINANCEIRO

Criar:

```text
financial_transactions
financial_categories
```

Tipos:

- receita;
- despesa.

Categorias padrão:

- ração;
- veterinário;
- vacinas;
- medicamentos;
- pedigree;
- acessórios;
- estrutura;
- reprodução;
- exames;
- vendas;
- reservas;
- outros.

Dashboard:

- receitas do mês;
- despesas do mês;
- saldo;
- custo por cão;
- custo por ninhada;
- custo por filhote;
- receita por ninhada.

---

# 37. AGENDA

Criar agenda interna.

Eventos:

- vacina;
- vermífugo;
- antipulgas;
- veterinário;
- medicação;
- cio;
- cruzamento;
- ultrassom;
- parto;
- entrega;
- pagamento;
- outro.

Visualizações:

- dia;
- semana;
- mês.

---

# 38. NOTIFICAÇÕES

Desktop:

- notificações nativas do Windows.

Mobile:

- notificações locais.

Exemplos:

```text
Vacina da Zara amanhã
Vermífugo do Sansão em 3 dias
Consulta veterinária hoje às 14:00
```

---

# 39. DOCUMENTOS

Permitir anexar:

- PDF;
- JPG;
- PNG;
- WEBP.

Categorias:

- pedigree;
- vacinação;
- exames;
- contrato;
- recibo;
- comprovante;
- registro;
- outros.

Não guardar arquivos grandes como BLOB no SQLite.

Guardar apenas:

- relative_path;
- hash;
- mime;
- size;
- metadata.

---

# 40. FOTOS E VÍDEOS

Criar galeria por cão.

Categorias:

- crescimento;
- filhote;
- saúde;
- exposição;
- reprodução;
- pedigree;
- geral.

Arquivos ficam fora do SQLite.

Gerar thumbnails.

---

# 41. MÍDIA E SYNC

Criar tabela:

```text
media_files
```

Campos:

- id;
- owner_type;
- owner_id;
- local_path;
- remote_path;
- sha256;
- mime;
- size;
- sync_status;
- created_at.

Usar SHA-256 para evitar upload duplicado.

---

# 42. DASHBOARD

Mostrar cards:

- cães ativos;
- filhotes;
- ninhadas;
- próximas vacinas;
- próximos vermífugos;
- cios;
- gestações;
- receitas;
- despesas;
- última sincronização.

Também mostrar:

- próximos eventos;
- alertas;
- aniversários;
- evolução dos filhotes;
- últimas atividades.

---

# 43. PESQUISA GLOBAL

Criar pesquisa global.

Pesquisar:

- cães;
- clientes;
- filhotes;
- ninhadas;
- pedigree;
- documentos;
- despesas;
- eventos.

Desktop:

```text
Ctrl + K
```

---

# 44. RELATÓRIOS

Gerar PDF.

Relatórios:

- ficha completa do cão;
- ficha de crescimento;
- histórico de saúde;
- vacinas;
- pedigree;
- ninhada;
- filhote;
- financeiro mensal;
- financeiro anual;
- clientes;
- reservas.

---

# 45. FICHA VISUAL DO CÃO

Criar função:

```text
Gerar Ficha do Cão
```

Deve permitir exportar uma arte bonita com:

- foto;
- nome;
- raça;
- sexo;
- nascimento;
- idade;
- peso;
- cor;
- pedigree;
- criador;
- proprietário;
- características;
- evolução.

Exportar:

- PNG;
- PDF.

Formatos:

- A4;
- 1080x1350;
- 1080x1920.

---

# 46. QR CODE

Gerar QR Code por cão.

Pode conter:

- ID interno;
- ficha;
- link futuro.

---

# 47. CONFIGURAÇÕES DO CANIL

Campos:

- nome do canil;
- logo;
- proprietário;
- telefone;
- WhatsApp;
- Instagram;
- email;
- cidade;
- estado;
- entidade de registro;
- prefixo de ninhadas;
- raça principal.

Default inicial:

```text
Fallz Kennel
American Bully
```

---

# 48. CONFIGURAÇÕES GERAIS

Seções:

```text
Geral
Canil
Aparência
Dropbox
Backup
Notificações
Banco de Dados
Privacidade
Sobre
```

---

# 49. TEMA VISUAL

Tema principal:

- preto;
- grafite;
- branco;
- azul elétrico.

Tema opcional:

- preto;
- rosa.

Estilo:

- moderno;
- premium;
- kennel;
- bully;
- dark mode padrão;
- cards;
- bordas arredondadas;
- animações suaves.

Priorizar:

- legibilidade;
- organização;
- velocidade.

---

# 50. SIDEBAR DESKTOP

```text
Dashboard

Cães
├── Todos
├── Machos
├── Fêmeas
└── Filhotes

Reprodução
├── Cios
├── Cruzamentos
├── Gestações
└── Ninhadas

Saúde
├── Vacinas
├── Vermífugos
├── Medicamentos
└── Veterinário

Clientes
Financeiro
Agenda
Relatórios
Sincronização
Configurações
```

---

# 51. NAVEGAÇÃO MOBILE

Bottom navigation:

```text
Início
Cães
Agenda
Financeiro
Mais
```

Botão:

```text
+
```

Ações rápidas:

- peso;
- vacina;
- medicamento;
- despesa;
- foto;
- evento.

---

# 52. AUDITORIA

Criar tabela:

```text
audit_log
```

Campos:

- entity;
- entity_id;
- action;
- previous_value;
- new_value;
- device_id;
- timestamp.

---

# 53. LOGS

Criar logs:

- info;
- warn;
- error.

Nunca colocar em log:

- token;
- senha;
- dados sensíveis completos.

Criar função:

```text
Exportar Logs
```

---

# 54. IMPORTAÇÃO E EXPORTAÇÃO

Exportar:

- JSON;
- CSV;
- PDF.

Importar:

- JSON;
- CSV.

Antes da importação:

- mostrar preview;
- validar;
- permitir cancelar.

---

# 55. SEGURANÇA DO ELECTRON

Obrigatório:

- contextIsolation: true;
- nodeIntegration: false;
- preload seguro;
- IPC tipado;
- validar parâmetros IPC com Zod.

Arquitetura:

```text
Renderer
↓
Preload
↓
IPC
↓
Main
↓
SQLite / Files / Dropbox
```

---

# 56. SEGURANÇA GERAL

Nunca salvar:

- senha;
- token;
- secret;

em código fonte.

Usar:

```text
.env
.env.example
```

Nunca subir `.env` real.

---

# 57. LOGIN LOCAL

Na primeira versão não precisa servidor próprio de contas.

Pode ter:

- PIN opcional;
- biometria no mobile;
- bloqueio local.

Não criar backend obrigatório.

---

# 58. MULTIUSUÁRIO FUTURO

Deixar arquitetura preparada para futuramente suportar:

- funcionário;
- sócio;
- veterinário;
- família.

Mas não implementar servidor multiusuário na primeira versão.

---

# 59. PERFORMANCE

Deve suportar:

- milhares de cães;
- dezenas de milhares de registros;
- anos de histórico;
- milhares de fotos.

Usar:

- paginação;
- índices;
- thumbnails;
- lazy loading;
- queries otimizadas.

---

# 60. ÍNDICES SQLITE

Criar índices para campos frequentemente usados:

- dog_id;
- litter_id;
- contact_id;
- date;
- updated_at;
- deleted_at;
- sync_status.

---

# 61. TRANSAÇÕES

Operações em múltiplas tabelas devem usar transação.

```sql
BEGIN;
...
COMMIT;
```

Em erro:

```sql
ROLLBACK;
```

---

# 62. ERROS

Não mostrar erro técnico bruto ao usuário.

Errado:

```text
SQLITE_CONSTRAINT_FOREIGNKEY
```

Correto:

```text
Não foi possível excluir este item porque existem registros relacionados.
```

Pode existir botão:

```text
Ver detalhes técnicos
```

---

# 63. EMPTY STATES

Exemplo:

```text
Nenhuma vacina cadastrada.

Cadastre a primeira vacina para acompanhar a saúde deste cão.

[Adicionar vacina]
```

---

# 64. CONFIRMAÇÕES

Pedir confirmação ao:

- excluir cão;
- excluir ninhada;
- cancelar reserva;
- restaurar backup;
- desconectar Dropbox;
- apagar mídia.

---

# 65. SOFT DELETE

Registros sincronizados não devem ser apagados imediatamente.

Usar:

```text
deleted_at
```

A exclusão também deve entrar no sync_queue.

---

# 66. DATAS

Guardar internamente em ISO 8601 UTC.

Exemplo:

```text
2026-09-06T18:32:00.000Z
```

Mostrar em formato brasileiro:

```text
06/09/2026
```

---

# 67. UNIDADES

Default:

```text
peso: kg
altura: cm
moeda: BRL
```

Arquitetura preparada para outras unidades.

---

# 68. ACESSIBILIDADE

- bom contraste;
- textos legíveis;
- labels;
- botões grandes no mobile;
- navegação por teclado no desktop.

---

# 69. TESTES

Usar:

- Vitest;
- React Testing Library.

Testar:

- migrations;
- repositories;
- services;
- validações;
- idade;
- crescimento;
- sync;
- conflitos;
- backup;
- restore;
- integridade.

---

# 70. TESTES OBRIGATÓRIOS DE SYNC

Cenário 1:

- PC cria cão;
- Mobile sincroniza;
- cão aparece.

Cenário 2:

- Mobile altera peso;
- PC sincroniza;
- peso aparece.

Cenário 3:

- ambos alteram dados offline;
- sistema resolve sem perder dados.

Cenário 4:

- internet cai durante upload;
- dados não podem ser perdidos.

Cenário 5:

- app fecha durante sync;
- retoma sem corrupção.

Cenário 6:

- mídia incompleta no Dropbox;
- ignorar arquivo inválido.

---

# 71. SERVIÇOS PRINCIPAIS

Criar abstrações:

```text
DogService
HealthService
VaccinationService
DewormingService
MedicationService
PedigreeService
BreedingService
PregnancyService
LitterService
PuppyService
ClientService
FinanceService
AgendaService
MediaService
DropboxService
SyncService
BackupService
NotificationService
ReportService
AuditService
```

---

# 72. REPOSITÓRIOS

Criar repositories correspondentes.

Exemplo:

```ts
interface DogRepository {
  findAll(): Promise<Dog[]>
  findById(id: string): Promise<Dog | null>
  create(input: CreateDogInput): Promise<Dog>
  update(id: string, input: UpdateDogInput): Promise<Dog>
  softDelete(id: string): Promise<void>
}
```

---

# 73. TIPOS COMPARTILHADOS

Tudo que puder deve ficar compartilhado entre Desktop e Mobile.

Exemplo:

```ts
export interface Dog {
  id: string
  name: string
  birthDate: string
  sex: "male" | "female"
  breed: string
  color?: string
  weight?: number
  pedigreeNumber?: string
  createdAt: string
  updatedAt: string
}
```

---

# 74. VALIDAÇÃO

Todos os formulários com Zod.

Exemplo:

```ts
const dogSchema = z.object({
  name: z.string().min(1),
  birthDate: z.string(),
  sex: z.enum(["male", "female"]),
  weight: z.number().positive().optional()
})
```

---

# 75. PRIMEIRA EXECUÇÃO

Wizard:

```text
1. Bem-vindo ao Fallz Kennel
2. Nome do canil
3. Configurar Dropbox?
4. Adicionar primeiro cão
5. Finalizar
```

---

# 76. ATUALIZAÇÕES DO APP

Preparar estrutura futura para auto-update no Desktop.

Criar módulo isolado:

```text
UpdateService
```

Não precisa ativar servidor de update na primeira versão.

---

# 77. ROADMAP DE IMPLEMENTAÇÃO

## Fase 1

- monorepo;
- Desktop;
- Mobile;
- SQLite;
- migrations;
- arquitetura base;
- design system.

## Fase 2

- cães;
- perfil;
- fotos;
- peso;
- crescimento.

## Fase 3

- saúde;
- vacinas;
- vermífugos;
- medicamentos;
- agenda.

## Fase 4

- Dropbox;
- sync;
- backup;
- restore.

## Fase 5

- pedigree;
- reprodução;
- cio;
- cruzamentos;
- gestação;
- parto;
- ninhadas;
- filhotes.

## Fase 6

- clientes;
- reservas;
- financeiro;
- relatórios.

## Fase 7

- ficha visual;
- QR Code;
- melhorias;
- otimizações.

---

# 78. CRITÉRIOS DE QUALIDADE

O projeto só deve ser considerado estável quando:

- funciona offline;
- Desktop e Mobile funcionam;
- SQLite é persistente;
- migrations funcionam;
- sync não perde dados;
- conflitos são controlados;
- backup funciona;
- restore funciona;
- Dropbox não corrompe banco;
- não existem tokens em logs;
- integrity_check passa;
- lint passa;
- typecheck passa;
- testes passam.

---

# 79. REGRAS IMPORTANTES PARA O CODEX

Quando o desenvolvimento começar:

1. Ler este arquivo inteiro antes de alterar código.
2. Não trocar SQLite por Firebase ou Supabase.
3. Não criar backend obrigatório.
4. Não sincronizar o arquivo SQLite ativo.
5. Não remover recursos sem autorização.
6. Não simplificar funcionalidades sem informar.
7. Não usar `any` para esconder erro.
8. Não pular migrations.
9. Não apagar dados automaticamente.
10. Não quebrar compatibilidade com banco existente.
11. Trabalhar por fases.
12. Fazer mudanças pequenas e verificáveis.
13. Rodar lint, typecheck e testes.
14. Documentar decisões importantes.
15. Não deixar mocks em funcionalidades marcadas como concluídas.
16. Não fingir que uma função está pronta se não estiver.
17. Sempre preservar dados do usuário.
18. Priorizar estabilidade antes de aparência.
19. Manter Desktop e Mobile consistentes.
20. Garantir que o app continue utilizável mesmo sem Dropbox conectado.

---

# 80. ESTADO INICIAL DO CANIL

O sistema deve permitir cadastrar qualquer cão.

Como referência inicial, o canil possui:

## Zara

- sexo: fêmea;
- raça: American Bully Standard;
- nascimento: 04/07/2026;
- peso registrado em 06/09/2026: 3,5 kg.

## Sansão

- sexo: macho;
- raça: American Bully Standard;
- nascimento: 04/07/2026;
- peso registrado em 06/09/2026: 4,6 kg.

Esses dados são somente referência.

Não hardcodar os cães no código.

---

# 81. RESULTADO ESPERADO

O aplicativo final precisa centralizar:

```text
Cães
↓
Crescimento
↓
Saúde
↓
Vacinas
↓
Pedigree
↓
Reprodução
↓
Ninhadas
↓
Filhotes
↓
Clientes
↓
Financeiro
↓
Agenda
↓
Documentos
↓
Fotos
↓
Backup
↓
Dropbox
```

Tudo com funcionamento offline e sincronização segura entre PC e celular.

---

# 82. INSTRUÇÃO FINAL PARA O CODEX

Quando este arquivo for entregue ao Codex, a orientação deve ser:

```text
Leia completamente o arquivo FALLZ_KENNEL_CODEX_SPEC.md.

Este arquivo define os requisitos do projeto.

Não altere arquitetura, stack ou regras principais sem explicar antes.

Quando eu pedir para iniciar o desenvolvimento, implemente por fases.

Não tente criar tudo em uma única etapa.

Antes de considerar qualquer fase concluída:
- rode lint;
- rode typecheck;
- rode testes;
- corrija os erros;
- informe claramente o que foi implementado;
- informe o que ainda não foi implementado.

O requisito mais importante é:
SQLite local + offline-first + sincronização segura via Dropbox sem sincronizar diretamente o arquivo SQLite aberto.
```
