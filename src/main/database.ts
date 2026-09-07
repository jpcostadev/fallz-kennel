import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import { dogRecordSchema, type CreateDogInput, type DashboardSummary, type Dog } from '../shared/dog'
import { moduleRecordSchema, type KennelSettings, type ModuleRecord, type ModuleRecordInput, type OperationalModule } from '../shared/module'
import { measurementRecordSchema, type Measurement, type MeasurementInput } from '../shared/measurement'
import type { SyncEvent, SyncSummary } from '../shared/sync'
import { feedingPlanRecordSchema, type FeedingPlanInput, type FeedingPlanRecord } from '../shared/feeding'

type DogRow = {
  id: string
  name: string
  registered_name: string
  sex: 'male' | 'female'
  birth_date: string
  breed: string
  color: string
  status: Dog['status']
  notes: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  version: number
  device_id: string
}

let database: Database.Database | undefined

function mapDog(row: DogRow): Dog {
  return {
    id: row.id,
    name: row.name,
    registeredName: row.registered_name,
    sex: row.sex,
    birthDate: row.birth_date,
    breed: row.breed,
    color: row.color,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    version: row.version,
    deviceId: row.device_id
  }
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `)

  const applied = db.prepare('SELECT version FROM schema_migrations').all() as Array<{ version: number }>
  const versions = new Set(applied.map((item) => item.version))

  if (!versions.has(1)) {
    db.transaction(() => {
      db.exec(`
        CREATE TABLE dogs (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          registered_name TEXT NOT NULL DEFAULT '',
          sex TEXT NOT NULL CHECK (sex IN ('male', 'female')),
          birth_date TEXT NOT NULL,
          breed TEXT NOT NULL,
          color TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'puppy',
          notes TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT,
          version INTEGER NOT NULL DEFAULT 1,
          device_id TEXT NOT NULL
        );
        CREATE INDEX idx_dogs_deleted_at ON dogs(deleted_at);
        CREATE INDEX idx_dogs_updated_at ON dogs(updated_at);

        CREATE TABLE sync_queue (
          id TEXT PRIMARY KEY,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
          payload TEXT NOT NULL,
          created_at TEXT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          synced_at TEXT,
          error TEXT
        );

        CREATE TABLE audit_log (
          id TEXT PRIMARY KEY,
          entity TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          action TEXT NOT NULL,
          previous_value TEXT,
          new_value TEXT,
          device_id TEXT NOT NULL,
          timestamp TEXT NOT NULL
        );
      `)
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(1, new Date().toISOString())
    })()
  }

  if (!versions.has(2)) {
    db.transaction(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE module_records (
          id TEXT PRIMARY KEY,
          module TEXT NOT NULL CHECK (module IN ('health', 'breeding', 'clients', 'finance', 'agenda')),
          title TEXT NOT NULL,
          category TEXT NOT NULL,
          date TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          amount REAL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT,
          version INTEGER NOT NULL DEFAULT 1,
          device_id TEXT NOT NULL
        );
        CREATE INDEX idx_module_records_module ON module_records(module, deleted_at);
        CREATE INDEX idx_module_records_date ON module_records(date);
        CREATE INDEX idx_module_records_updated_at ON module_records(updated_at);
      `)
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(2, new Date().toISOString())
    })()
  }

  if (!versions.has(3)) {
    db.transaction(() => {
      db.exec(`
        ALTER TABLE module_records ADD COLUMN dog_id TEXT REFERENCES dogs(id);
        ALTER TABLE module_records ADD COLUMN next_date TEXT NOT NULL DEFAULT '';
        ALTER TABLE module_records ADD COLUMN phone TEXT NOT NULL DEFAULT '';
        ALTER TABLE module_records ADD COLUMN whatsapp TEXT NOT NULL DEFAULT '';
        ALTER TABLE module_records ADD COLUMN instagram TEXT NOT NULL DEFAULT '';
        ALTER TABLE module_records ADD COLUMN email TEXT NOT NULL DEFAULT '';
        ALTER TABLE module_records ADD COLUMN city TEXT NOT NULL DEFAULT '';
        ALTER TABLE module_records ADD COLUMN state TEXT NOT NULL DEFAULT '';
        ALTER TABLE module_records ADD COLUMN cpf TEXT NOT NULL DEFAULT '';
        ALTER TABLE module_records ADD COLUMN transaction_type TEXT;
        ALTER TABLE module_records ADD COLUMN quantity REAL;
        ALTER TABLE module_records ADD COLUMN unit TEXT NOT NULL DEFAULT '';
        ALTER TABLE module_records ADD COLUMN supplier TEXT NOT NULL DEFAULT '';
        ALTER TABLE module_records ADD COLUMN manufacturer TEXT NOT NULL DEFAULT '';
        ALTER TABLE module_records ADD COLUMN batch TEXT NOT NULL DEFAULT '';
        ALTER TABLE module_records ADD COLUMN dose TEXT NOT NULL DEFAULT '';
        ALTER TABLE module_records ADD COLUMN veterinarian TEXT NOT NULL DEFAULT '';
        ALTER TABLE module_records ADD COLUMN clinic TEXT NOT NULL DEFAULT '';
        CREATE INDEX idx_module_records_dog_id ON module_records(dog_id, deleted_at);
      `)
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(3, new Date().toISOString())
    })()
  }

  if (!versions.has(4)) {
    db.transaction(() => {
      db.exec(`
        CREATE TABLE dog_measurements (
          id TEXT PRIMARY KEY,
          dog_id TEXT NOT NULL REFERENCES dogs(id),
          date TEXT NOT NULL,
          age_days INTEGER NOT NULL,
          weight_grams INTEGER NOT NULL CHECK(weight_grams > 0),
          height REAL,
          chest_circumference REAL,
          head_circumference REAL,
          body_condition_score INTEGER CHECK(body_condition_score BETWEEN 1 AND 9),
          notes TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT,
          version INTEGER NOT NULL DEFAULT 1,
          device_id TEXT NOT NULL
        );
        CREATE INDEX idx_measurements_dog_date ON dog_measurements(dog_id, date);
        CREATE INDEX idx_measurements_updated_at ON dog_measurements(updated_at);
      `)
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(4, new Date().toISOString())
    })()
  }

  if (!versions.has(5)) {
    db.transaction(() => {
      db.exec(`CREATE TABLE sync_applied_events (event_id TEXT PRIMARY KEY, applied_at TEXT NOT NULL);`)
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(5, new Date().toISOString())
    })()
  }

  if (!versions.has(6)) {
    db.transaction(() => {
      db.exec(`CREATE TABLE feeding_plans (
        id TEXT PRIMARY KEY, dog_id TEXT NOT NULL REFERENCES dogs(id), food_name TEXT NOT NULL,
        kcal_per_kg REAL NOT NULL, daily_grams REAL NOT NULL, grams_per_meal REAL NOT NULL,
        meals_per_day INTEGER NOT NULL, times_json TEXT NOT NULL, life_stage TEXT NOT NULL,
        goal TEXT NOT NULL, adjustment_percent REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL, deleted_at TEXT, version INTEGER NOT NULL DEFAULT 1, device_id TEXT NOT NULL
      ); CREATE INDEX idx_feeding_plans_dog ON feeding_plans(dog_id, deleted_at);`)
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(6, new Date().toISOString())
    })()
  }
}

export function openDatabase(): Database.Database {
  if (database) return database
  const dataDirectory = join(app.getPath('userData'), 'data')
  mkdirSync(dataDirectory, { recursive: true })
  database = new Database(join(dataDirectory, 'fallz-kennel.sqlite'))
  database.pragma('foreign_keys = ON')
  database.pragma('journal_mode = WAL')
  migrate(database)
  return database
}

function deviceId(): string {
  const db = openDatabase()
  db.exec('CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)')
  const current = db.prepare("SELECT value FROM app_settings WHERE key = 'device_id'").get() as { value: string } | undefined
  if (current) return current.value
  const id = randomUUID()
  db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?)').run('device_id', id)
  return id
}

export const dogRepository = {
  findAll(): Dog[] {
    const rows = openDatabase().prepare('SELECT * FROM dogs WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE').all() as DogRow[]
    return rows.map(mapDog)
  },
  findById(id: string): Dog | null {
    const row = openDatabase().prepare('SELECT * FROM dogs WHERE id = ? AND deleted_at IS NULL').get(id) as DogRow | undefined
    return row ? mapDog(row) : null
  },

  create(input: CreateDogInput): Dog {
    const db = openDatabase()
    const now = new Date().toISOString()
    const dog: Dog = { ...input, id: randomUUID(), createdAt: now, updatedAt: now, deletedAt: null, version: 1, deviceId: deviceId() }

    db.transaction(() => {
      db.prepare(`INSERT INTO dogs
        (id, name, registered_name, sex, birth_date, breed, color, status, notes, created_at, updated_at, deleted_at, version, device_id)
        VALUES (@id, @name, @registeredName, @sex, @birthDate, @breed, @color, @status, @notes, @createdAt, @updatedAt, @deletedAt, @version, @deviceId)`
      ).run(dog)
      db.prepare(`INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, created_at)
        VALUES (?, 'dogs', ?, 'create', ?, ?)`
      ).run(randomUUID(), dog.id, JSON.stringify(dog), now)
      db.prepare(`INSERT INTO audit_log (id, entity, entity_id, action, new_value, device_id, timestamp)
        VALUES (?, 'dogs', ?, 'create', ?, ?, ?)`
      ).run(randomUUID(), dog.id, JSON.stringify(dog), dog.deviceId, now)
    })()
    return dog
  },
  update(id:string,input:CreateDogInput):Dog { const db=openDatabase();const row=db.prepare('SELECT * FROM dogs WHERE id=? AND deleted_at IS NULL').get(id) as DogRow|undefined;if(!row)throw new Error('Cão não encontrado.');const previous=mapDog(row),dog:Dog={...previous,...input,updatedAt:new Date().toISOString(),version:previous.version+1};db.transaction(()=>{db.prepare(`UPDATE dogs SET name=@name,registered_name=@registeredName,sex=@sex,birth_date=@birthDate,breed=@breed,color=@color,status=@status,notes=@notes,updated_at=@updatedAt,version=@version WHERE id=@id`).run(dog);db.prepare(`INSERT INTO sync_queue(id,entity_type,entity_id,operation,payload,created_at) VALUES(?,'dogs',?,'update',?,?)`).run(randomUUID(),id,JSON.stringify(dog),dog.updatedAt)})();return dog },
  softDelete(id:string):void { const db=openDatabase();const row=db.prepare('SELECT * FROM dogs WHERE id=? AND deleted_at IS NULL').get(id) as DogRow|undefined;if(!row)throw new Error('Cão não encontrado.');const dog:Dog={...mapDog(row),deletedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),version:row.version+1};db.transaction(()=>{db.prepare('UPDATE dogs SET deleted_at=@deletedAt,updated_at=@updatedAt,version=@version WHERE id=@id').run(dog);db.prepare(`INSERT INTO sync_queue(id,entity_type,entity_id,operation,payload,created_at) VALUES(?,'dogs',?,'delete',?,?)`).run(randomUUID(),id,JSON.stringify(dog),dog.updatedAt)})()
  }
}

export function dashboardSummary(): DashboardSummary {
  const row = openDatabase().prepare(`
    SELECT COUNT(*) AS activeDogs,
      SUM(CASE WHEN sex = 'male' THEN 1 ELSE 0 END) AS males,
      SUM(CASE WHEN sex = 'female' THEN 1 ELSE 0 END) AS females,
      SUM(CASE WHEN status = 'puppy' THEN 1 ELSE 0 END) AS puppies
    FROM dogs WHERE deleted_at IS NULL AND status != 'deceased'
  `).get() as DashboardSummary
  return { activeDogs: row.activeDogs, males: row.males ?? 0, females: row.females ?? 0, puppies: row.puppies ?? 0 }
}

type FeedingRow={id:string;dog_id:string;food_name:string;kcal_per_kg:number;daily_grams:number;grams_per_meal:number;meals_per_day:number;times_json:string;life_stage:FeedingPlanRecord['lifeStage'];goal:FeedingPlanRecord['goal'];adjustment_percent:number;created_at:string;updated_at:string;deleted_at:string|null;version:number;device_id:string}
const mapFeeding=(r:FeedingRow):FeedingPlanRecord=>feedingPlanRecordSchema.parse({id:r.id,dogId:r.dog_id,foodName:r.food_name,kcalPerKg:r.kcal_per_kg,dailyGrams:r.daily_grams,gramsPerMeal:r.grams_per_meal,mealsPerDay:r.meals_per_day,times:JSON.parse(r.times_json),lifeStage:r.life_stage,goal:r.goal,adjustmentPercent:r.adjustment_percent,createdAt:r.created_at,updatedAt:r.updated_at,deletedAt:r.deleted_at,version:r.version,deviceId:r.device_id})
export const feedingRepository={
  findAll():FeedingPlanRecord[]{return (openDatabase().prepare('SELECT * FROM feeding_plans WHERE deleted_at IS NULL ORDER BY updated_at DESC').all() as FeedingRow[]).map(mapFeeding)},
  save(input:FeedingPlanInput):FeedingPlanRecord{const db=openDatabase(),existing=db.prepare('SELECT * FROM feeding_plans WHERE dog_id=? AND deleted_at IS NULL').get(input.dogId) as FeedingRow|undefined,now=new Date().toISOString();const plan:FeedingPlanRecord={...input,id:existing?.id??randomUUID(),createdAt:existing?.created_at??now,updatedAt:now,deletedAt:null,version:(existing?.version??0)+1,deviceId:existing?.device_id??deviceId()};db.transaction(()=>{db.prepare(`INSERT INTO feeding_plans(id,dog_id,food_name,kcal_per_kg,daily_grams,grams_per_meal,meals_per_day,times_json,life_stage,goal,adjustment_percent,created_at,updated_at,deleted_at,version,device_id) VALUES(@id,@dogId,@foodName,@kcalPerKg,@dailyGrams,@gramsPerMeal,@mealsPerDay,@timesJson,@lifeStage,@goal,@adjustmentPercent,@createdAt,@updatedAt,@deletedAt,@version,@deviceId) ON CONFLICT(id) DO UPDATE SET food_name=excluded.food_name,kcal_per_kg=excluded.kcal_per_kg,daily_grams=excluded.daily_grams,grams_per_meal=excluded.grams_per_meal,meals_per_day=excluded.meals_per_day,times_json=excluded.times_json,life_stage=excluded.life_stage,goal=excluded.goal,adjustment_percent=excluded.adjustment_percent,updated_at=excluded.updated_at,version=excluded.version`).run({...plan,timesJson:JSON.stringify(plan.times)});db.prepare(`INSERT INTO sync_queue(id,entity_type,entity_id,operation,payload,created_at) VALUES(?,'feeding_plans',?,?,?,?)`).run(randomUUID(),plan.id,existing?'update':'create',JSON.stringify(plan),now)})();return plan},
  softDelete(id:string):void{const db=openDatabase(),row=db.prepare('SELECT * FROM feeding_plans WHERE id=? AND deleted_at IS NULL').get(id) as FeedingRow|undefined;if(!row)throw new Error('Plano não encontrado.');const plan={...mapFeeding(row),deletedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),version:row.version+1};db.transaction(()=>{db.prepare('UPDATE feeding_plans SET deleted_at=@deletedAt,updated_at=@updatedAt,version=@version WHERE id=@id').run(plan);db.prepare(`INSERT INTO sync_queue(id,entity_type,entity_id,operation,payload,created_at) VALUES(?,'feeding_plans',?,'delete',?,?)`).run(randomUUID(),id,JSON.stringify(plan),plan.updatedAt)})()}
}

type ModuleRecordRow = {
  id: string; module: OperationalModule; title: string; category: string; date: string
  description: string; amount: number | null; created_at: string; updated_at: string
  deleted_at: string | null; version: number; device_id: string
  dog_id: string | null; next_date: string; phone: string; whatsapp: string; instagram: string
  email: string; city: string; state: string; cpf: string; transaction_type: 'income' | 'expense' | null
  quantity: number | null; unit: string; supplier: string; manufacturer: string; batch: string
  dose: string; veterinarian: string; clinic: string
}

function mapModuleRecord(row: ModuleRecordRow): ModuleRecord {
  return { id: row.id, module: row.module, title: row.title, category: row.category, date: row.date, description: row.description, amount: row.amount, dogId: row.dog_id, nextDate: row.next_date, phone: row.phone, whatsapp: row.whatsapp, instagram: row.instagram, email: row.email, city: row.city, state: row.state, cpf: row.cpf, transactionType: row.transaction_type, quantity: row.quantity, unit: row.unit, supplier: row.supplier, manufacturer: row.manufacturer, batch: row.batch, dose: row.dose, veterinarian: row.veterinarian, clinic: row.clinic, createdAt: row.created_at, updatedAt: row.updated_at, deletedAt: row.deleted_at, version: row.version, deviceId: row.device_id }
}

function recordChange(db: Database.Database, record: ModuleRecord, operation: 'create' | 'update' | 'delete', previous?: ModuleRecord): void {
  const now = new Date().toISOString()
  db.prepare(`INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(randomUUID(), record.module, record.id, operation, JSON.stringify(record), now)
  db.prepare(`INSERT INTO audit_log (id, entity, entity_id, action, previous_value, new_value, device_id, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(randomUUID(), record.module, record.id, operation, previous ? JSON.stringify(previous) : null, JSON.stringify(record), record.deviceId, now)
}

export const moduleRecordRepository = {
  findAll(module: OperationalModule): ModuleRecord[] {
    const rows = openDatabase().prepare('SELECT * FROM module_records WHERE module = ? AND deleted_at IS NULL ORDER BY date DESC, created_at DESC').all(module) as ModuleRecordRow[]
    return rows.map(mapModuleRecord)
  },
  findByDog(dogId: string): ModuleRecord[] {
    const rows = openDatabase().prepare('SELECT * FROM module_records WHERE dog_id = ? AND deleted_at IS NULL ORDER BY date DESC, created_at DESC').all(dogId) as ModuleRecordRow[]
    return rows.map(mapModuleRecord)
  },
  create(input: ModuleRecordInput): ModuleRecord {
    const db = openDatabase(); const now = new Date().toISOString()
    const record: ModuleRecord = { ...input, id: randomUUID(), createdAt: now, updatedAt: now, deletedAt: null, version: 1, deviceId: deviceId() }
    db.transaction(() => {
      db.prepare(`INSERT INTO module_records (id,module,title,category,date,description,amount,dog_id,next_date,phone,whatsapp,instagram,email,city,state,cpf,transaction_type,quantity,unit,supplier,manufacturer,batch,dose,veterinarian,clinic,created_at,updated_at,deleted_at,version,device_id) VALUES (@id,@module,@title,@category,@date,@description,@amount,@dogId,@nextDate,@phone,@whatsapp,@instagram,@email,@city,@state,@cpf,@transactionType,@quantity,@unit,@supplier,@manufacturer,@batch,@dose,@veterinarian,@clinic,@createdAt,@updatedAt,@deletedAt,@version,@deviceId)`).run(record)
      recordChange(db, record, 'create')
    })()
    return record
  },
  update(id: string, input: ModuleRecordInput): ModuleRecord {
    const db = openDatabase()
    const previousRow = db.prepare('SELECT * FROM module_records WHERE id = ? AND deleted_at IS NULL').get(id) as ModuleRecordRow | undefined
    if (!previousRow) throw new Error('Registro não encontrado.')
    const previous = mapModuleRecord(previousRow)
    const record: ModuleRecord = { ...previous, ...input, updatedAt: new Date().toISOString(), version: previous.version + 1 }
    db.transaction(() => {
      db.prepare(`UPDATE module_records SET module=@module,title=@title,category=@category,date=@date,description=@description,amount=@amount,dog_id=@dogId,next_date=@nextDate,phone=@phone,whatsapp=@whatsapp,instagram=@instagram,email=@email,city=@city,state=@state,cpf=@cpf,transaction_type=@transactionType,quantity=@quantity,unit=@unit,supplier=@supplier,manufacturer=@manufacturer,batch=@batch,dose=@dose,veterinarian=@veterinarian,clinic=@clinic,updated_at=@updatedAt,version=@version WHERE id=@id AND deleted_at IS NULL`).run(record)
      recordChange(db, record, 'update', previous)
    })()
    return record
  },
  softDelete(id: string): void {
    const db = openDatabase()
    const previousRow = db.prepare('SELECT * FROM module_records WHERE id = ? AND deleted_at IS NULL').get(id) as ModuleRecordRow | undefined
    if (!previousRow) throw new Error('Registro não encontrado.')
    const previous = mapModuleRecord(previousRow)
    const record = { ...previous, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: previous.version + 1 }
    db.transaction(() => {
      db.prepare('UPDATE module_records SET deleted_at=@deletedAt,updated_at=@updatedAt,version=@version WHERE id=@id').run(record)
      recordChange(db, record, 'delete', previous)
    })()
  }
}

const defaultSettings: KennelSettings = { kennelName: 'Fallz Kennel', owner: '', phone: '', email: '', city: '', state: '', mainBreed: 'American Bully' }

export const settingsRepository = {
  get(): KennelSettings {
    const row = openDatabase().prepare("SELECT value FROM app_settings WHERE key = 'kennel_settings'").get() as { value: string } | undefined
    return row ? { ...defaultSettings, ...(JSON.parse(row.value) as Partial<KennelSettings>) } : defaultSettings
  },
  save(settings: KennelSettings): KennelSettings {
    openDatabase().prepare("INSERT INTO app_settings (key,value) VALUES ('kennel_settings',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify(settings))
    return settings
  }
}

type MeasurementRow = {
  id: string; dog_id: string; date: string; age_days: number; weight_grams: number; height: number | null
  chest_circumference: number | null; head_circumference: number | null; body_condition_score: number | null
  notes: string; created_at: string; updated_at: string; deleted_at: string | null; version: number; device_id: string
}

function mapMeasurement(row: MeasurementRow): Measurement {
  return { id: row.id, dogId: row.dog_id, date: row.date, ageDays: row.age_days, weightGrams: row.weight_grams, kilograms: Math.floor(row.weight_grams / 1000), grams: row.weight_grams % 1000, height: row.height, chestCircumference: row.chest_circumference, headCircumference: row.head_circumference, bodyConditionScore: row.body_condition_score, notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at, deletedAt: row.deleted_at, version: row.version, deviceId: row.device_id }
}

function measurementData(input: MeasurementInput): { weightGrams: number; ageDays: number } {
  const dog = dogRepository.findById(input.dogId)
  if (!dog) throw new Error('Cão não encontrado.')
  const ageDays = Math.max(0, Math.floor((Date.parse(`${input.date}T12:00:00Z`) - Date.parse(`${dog.birthDate}T12:00:00Z`)) / 86_400_000))
  return { weightGrams: input.kilograms * 1000 + input.grams, ageDays }
}

function measurementChange(db: Database.Database, measurement: Measurement, operation: 'create' | 'update' | 'delete'): void {
  const now = new Date().toISOString()
  db.prepare('INSERT INTO sync_queue (id,entity_type,entity_id,operation,payload,created_at) VALUES (?,\'dog_measurements\',?,?,?,?)').run(randomUUID(), measurement.id, operation, JSON.stringify(measurement), now)
  db.prepare('INSERT INTO audit_log (id,entity,entity_id,action,new_value,device_id,timestamp) VALUES (?,\'dog_measurements\',?,?,?,?,?)').run(randomUUID(), measurement.id, operation, JSON.stringify(measurement), measurement.deviceId, now)
}

export const measurementRepository = {
  findByDog(dogId: string): Measurement[] {
    return (openDatabase().prepare('SELECT * FROM dog_measurements WHERE dog_id=? AND deleted_at IS NULL ORDER BY date ASC, created_at ASC').all(dogId) as MeasurementRow[]).map(mapMeasurement)
  },
  create(input: MeasurementInput): Measurement {
    const db = openDatabase(); const now = new Date().toISOString(); const calculated = measurementData(input)
    const measurement: Measurement = { ...input, ...calculated, id: randomUUID(), createdAt: now, updatedAt: now, deletedAt: null, version: 1, deviceId: deviceId() }
    db.transaction(() => { db.prepare(`INSERT INTO dog_measurements (id,dog_id,date,age_days,weight_grams,height,chest_circumference,head_circumference,body_condition_score,notes,created_at,updated_at,deleted_at,version,device_id) VALUES (@id,@dogId,@date,@ageDays,@weightGrams,@height,@chestCircumference,@headCircumference,@bodyConditionScore,@notes,@createdAt,@updatedAt,@deletedAt,@version,@deviceId)`).run(measurement); measurementChange(db, measurement, 'create') })()
    return measurement
  },
  update(id: string, input: MeasurementInput): Measurement {
    const db = openDatabase(); const row = db.prepare('SELECT * FROM dog_measurements WHERE id=? AND deleted_at IS NULL').get(id) as MeasurementRow | undefined
    if (!row) throw new Error('Pesagem não encontrada.')
    const previous = mapMeasurement(row); const calculated = measurementData(input)
    const measurement: Measurement = { ...previous, ...input, ...calculated, updatedAt: new Date().toISOString(), version: previous.version + 1 }
    db.transaction(() => { db.prepare(`UPDATE dog_measurements SET dog_id=@dogId,date=@date,age_days=@ageDays,weight_grams=@weightGrams,height=@height,chest_circumference=@chestCircumference,head_circumference=@headCircumference,body_condition_score=@bodyConditionScore,notes=@notes,updated_at=@updatedAt,version=@version WHERE id=@id`).run(measurement); measurementChange(db, measurement, 'update') })()
    return measurement
  },
  softDelete(id: string): void {
    const db = openDatabase(); const row = db.prepare('SELECT * FROM dog_measurements WHERE id=? AND deleted_at IS NULL').get(id) as MeasurementRow | undefined
    if (!row) throw new Error('Pesagem não encontrada.')
    const previous = mapMeasurement(row)
    const measurement: Measurement = { ...previous, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: previous.version + 1 }
    db.transaction(() => { db.prepare('UPDATE dog_measurements SET deleted_at=@deletedAt,updated_at=@updatedAt,version=@version WHERE id=@id').run(measurement); measurementChange(db, measurement, 'delete') })()
  }
}

type SyncQueueRow = { id: string; entity_type: SyncEvent['entityType']; entity_id: string; operation: SyncEvent['operation']; payload: string; created_at: string }

export const syncRepository = {
  summary(): SyncSummary {
    const db = openDatabase()
    const pending = (db.prepare('SELECT COUNT(*) AS count FROM sync_queue WHERE synced_at IS NULL').get() as { count: number }).count
    const lastSync = (db.prepare("SELECT value FROM app_settings WHERE key='last_sync'").get() as { value: string } | undefined)?.value ?? null
    return { pending, lastSync, deviceId: deviceId() }
  },
  pending(): SyncEvent[] {
    const rows = openDatabase().prepare('SELECT id,entity_type,entity_id,operation,payload,created_at FROM sync_queue WHERE synced_at IS NULL ORDER BY created_at ASC').all() as SyncQueueRow[]
    return rows.map((row) => { const payload = JSON.parse(row.payload) as Record<string, unknown>; return { id: row.id, entityType: row.entity_type, entityId: row.entity_id, operation: row.operation, payload, createdAt: row.created_at, deviceId: String(payload.deviceId) } })
  },
  markUploaded(ids: string[]): void {
    const db = openDatabase(); const statement = db.prepare('UPDATE sync_queue SET synced_at=?,error=NULL WHERE id=?')
    db.transaction(() => { const now = new Date().toISOString(); ids.forEach((id) => statement.run(now, id)); db.prepare("INSERT INTO app_settings(key,value) VALUES('last_sync',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(now) })()
  },
  apply(events: SyncEvent[]): number {
    const db = openDatabase(); let applied = 0
    const already = db.prepare('SELECT 1 FROM sync_applied_events WHERE event_id=?')
    const mark = db.prepare('INSERT OR IGNORE INTO sync_applied_events(event_id,applied_at) VALUES(?,?)')
    db.transaction(() => {
      for (const event of events) {
        if (already.get(event.id)) continue
        if (event.entityType === 'dogs') {
          const dog = dogRecordSchema.parse(event.payload)
          db.prepare(`INSERT INTO dogs (id,name,registered_name,sex,birth_date,breed,color,status,notes,created_at,updated_at,deleted_at,version,device_id) VALUES (@id,@name,@registeredName,@sex,@birthDate,@breed,@color,@status,@notes,@createdAt,@updatedAt,@deletedAt,@version,@deviceId) ON CONFLICT(id) DO UPDATE SET name=excluded.name,registered_name=excluded.registered_name,sex=excluded.sex,birth_date=excluded.birth_date,breed=excluded.breed,color=excluded.color,status=excluded.status,notes=excluded.notes,updated_at=excluded.updated_at,deleted_at=excluded.deleted_at,version=excluded.version,device_id=excluded.device_id WHERE excluded.version>dogs.version OR (excluded.version=dogs.version AND excluded.updated_at>dogs.updated_at)`).run(dog)
        } else if (event.entityType === 'dog_measurements') {
          const measurement = measurementRecordSchema.parse(event.payload)
          db.prepare(`INSERT INTO dog_measurements (id,dog_id,date,age_days,weight_grams,height,chest_circumference,head_circumference,body_condition_score,notes,created_at,updated_at,deleted_at,version,device_id) VALUES (@id,@dogId,@date,@ageDays,@weightGrams,@height,@chestCircumference,@headCircumference,@bodyConditionScore,@notes,@createdAt,@updatedAt,@deletedAt,@version,@deviceId) ON CONFLICT(id) DO UPDATE SET dog_id=excluded.dog_id,date=excluded.date,age_days=excluded.age_days,weight_grams=excluded.weight_grams,height=excluded.height,chest_circumference=excluded.chest_circumference,head_circumference=excluded.head_circumference,body_condition_score=excluded.body_condition_score,notes=excluded.notes,updated_at=excluded.updated_at,deleted_at=excluded.deleted_at,version=excluded.version,device_id=excluded.device_id WHERE excluded.version>dog_measurements.version OR (excluded.version=dog_measurements.version AND excluded.updated_at>dog_measurements.updated_at)`).run(measurement)
        } else if (event.entityType === 'feeding_plans') {
          const plan = feedingPlanRecordSchema.parse(event.payload)
          db.prepare(`INSERT INTO feeding_plans (id,dog_id,food_name,kcal_per_kg,daily_grams,grams_per_meal,meals_per_day,times_json,life_stage,goal,adjustment_percent,created_at,updated_at,deleted_at,version,device_id) VALUES (@id,@dogId,@foodName,@kcalPerKg,@dailyGrams,@gramsPerMeal,@mealsPerDay,@timesJson,@lifeStage,@goal,@adjustmentPercent,@createdAt,@updatedAt,@deletedAt,@version,@deviceId) ON CONFLICT(id) DO UPDATE SET dog_id=excluded.dog_id,food_name=excluded.food_name,kcal_per_kg=excluded.kcal_per_kg,daily_grams=excluded.daily_grams,grams_per_meal=excluded.grams_per_meal,meals_per_day=excluded.meals_per_day,times_json=excluded.times_json,life_stage=excluded.life_stage,goal=excluded.goal,adjustment_percent=excluded.adjustment_percent,updated_at=excluded.updated_at,deleted_at=excluded.deleted_at,version=excluded.version,device_id=excluded.device_id WHERE excluded.version>feeding_plans.version OR (excluded.version=feeding_plans.version AND excluded.updated_at>feeding_plans.updated_at)`).run({ ...plan, timesJson: JSON.stringify(plan.times) })
        } else {
          const record = moduleRecordSchema.parse(event.payload)
          db.prepare(`INSERT INTO module_records (id,module,title,category,date,description,amount,dog_id,next_date,phone,whatsapp,instagram,email,city,state,cpf,transaction_type,quantity,unit,supplier,manufacturer,batch,dose,veterinarian,clinic,created_at,updated_at,deleted_at,version,device_id) VALUES (@id,@module,@title,@category,@date,@description,@amount,@dogId,@nextDate,@phone,@whatsapp,@instagram,@email,@city,@state,@cpf,@transactionType,@quantity,@unit,@supplier,@manufacturer,@batch,@dose,@veterinarian,@clinic,@createdAt,@updatedAt,@deletedAt,@version,@deviceId) ON CONFLICT(id) DO UPDATE SET title=excluded.title,category=excluded.category,date=excluded.date,description=excluded.description,amount=excluded.amount,dog_id=excluded.dog_id,next_date=excluded.next_date,phone=excluded.phone,whatsapp=excluded.whatsapp,instagram=excluded.instagram,email=excluded.email,city=excluded.city,state=excluded.state,cpf=excluded.cpf,transaction_type=excluded.transaction_type,quantity=excluded.quantity,unit=excluded.unit,supplier=excluded.supplier,manufacturer=excluded.manufacturer,batch=excluded.batch,dose=excluded.dose,veterinarian=excluded.veterinarian,clinic=excluded.clinic,updated_at=excluded.updated_at,deleted_at=excluded.deleted_at,version=excluded.version,device_id=excluded.device_id WHERE excluded.version>module_records.version OR (excluded.version=module_records.version AND excluded.updated_at>module_records.updated_at)`).run(record)
        }
        mark.run(event.id, new Date().toISOString()); applied += 1
      }
      db.prepare("INSERT INTO app_settings(key,value) VALUES('last_sync',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(new Date().toISOString())
    })()
    return applied
  }
}

export function closeDatabase(): void {
  database?.close()
  database = undefined
}
