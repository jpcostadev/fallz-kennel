import * as Crypto from "expo-crypto";
import * as SQLite from "expo-sqlite";
import type { LifeStage, WeightGoal } from "@fallz/core";

export interface MobileDog {
  id: string;
  name: string;
  birthDate: string;
  weightKg: number;
  breed: string;
  sex: "male" | "female";
  registeredName: string;
  color: string;
  status: string;
  notes: string;
  updatedAt: string;
  version: number;
  deviceId: string;
}
export interface FeedingPlan {
  id: string;
  dogId: string;
  foodName: string;
  kcalPerKg: number;
  dailyGrams: number;
  gramsPerMeal: number;
  mealsPerDay: number;
  times: string[];
  lifeStage: LifeStage;
  goal: WeightGoal;
  adjustmentPercent: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  version: number;
  deviceId: string;
}
export interface Reminder {
  id: string;
  dogId: string | null;
  title: string;
  dateTime: string;
  type: "feeding" | "appointment" | "medication";
  notificationId: string | null;
}
export interface WeightRecord {
  id: string;
  dogId: string;
  date: string;
  weightGrams: number;
  bodyConditionScore: number | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  deviceId: string;
}
export type MobileModule = 'health'|'breeding'|'clients'|'finance'
export interface MobileModuleRecord { id:string;module:MobileModule;title:string;category:string;date:string;description:string;amount:number|null;dogId:string|null;phone:string;whatsapp:string;email:string;transactionType:'income'|'expense'|null;quantity:number|null;unit:string;createdAt:string;updatedAt:string;deletedAt:string|null;version:number;deviceId:string }
export type CloudEntity =
  "dogs" | "dog_measurements" | "agenda" | "feeding_plans" | "module_records";
export interface CloudEvent {
  id: string;
  entityType: CloudEntity;
  entityId: string;
  operation: "create" | "update" | "delete";
  payload: Record<string, unknown>;
  createdAt: string;
  deviceId: string;
}

let database: Promise<SQLite.SQLiteDatabase> | null = null;
const uuid = () => Crypto.randomUUID();
export async function getDatabase() {
  if (!database) database = SQLite.openDatabaseAsync("fallz-kennel.db");
  const db = await database;
  await db.execAsync(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS app_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS dogs(id TEXT PRIMARY KEY,name TEXT NOT NULL,birth_date TEXT NOT NULL,weight_kg REAL NOT NULL DEFAULT 0,breed TEXT NOT NULL,sex TEXT NOT NULL,registered_name TEXT NOT NULL DEFAULT '',color TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'puppy',notes TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT '',updated_at TEXT NOT NULL,deleted_at TEXT,version INTEGER NOT NULL DEFAULT 1,device_id TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS feeding_plans(id TEXT PRIMARY KEY,dog_id TEXT NOT NULL REFERENCES dogs(id),food_name TEXT NOT NULL,kcal_per_kg REAL NOT NULL,daily_grams REAL NOT NULL,grams_per_meal REAL NOT NULL,meals_per_day INTEGER NOT NULL,times_json TEXT NOT NULL,life_stage TEXT NOT NULL DEFAULT 'adult-intact',goal TEXT NOT NULL DEFAULT 'maintain',adjustment_percent REAL NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT '',updated_at TEXT NOT NULL,deleted_at TEXT,version INTEGER NOT NULL DEFAULT 1,device_id TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS reminders(id TEXT PRIMARY KEY,dog_id TEXT REFERENCES dogs(id),title TEXT NOT NULL,date_time TEXT NOT NULL,type TEXT NOT NULL,notification_id TEXT,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS weight_records(id TEXT PRIMARY KEY,dog_id TEXT NOT NULL REFERENCES dogs(id),date TEXT NOT NULL,weight_grams INTEGER NOT NULL,age_days INTEGER NOT NULL DEFAULT 0,height REAL,chest_circumference REAL,head_circumference REAL,body_condition_score INTEGER,notes TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT,version INTEGER NOT NULL DEFAULT 1,device_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS module_records(id TEXT PRIMARY KEY,module TEXT NOT NULL,title TEXT NOT NULL,category TEXT NOT NULL,date TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',amount REAL,dog_id TEXT,phone TEXT NOT NULL DEFAULT '',whatsapp TEXT NOT NULL DEFAULT '',email TEXT NOT NULL DEFAULT '',transaction_type TEXT,quantity REAL,unit TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT,version INTEGER NOT NULL DEFAULT 1,device_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sync_queue(id TEXT PRIMARY KEY,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,operation TEXT NOT NULL,payload TEXT NOT NULL,created_at TEXT NOT NULL,synced_at TEXT,error TEXT);
CREATE TABLE IF NOT EXISTS sync_applied_events(event_id TEXT PRIMARY KEY,applied_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_mobile_weight_dog_date ON weight_records(dog_id,date); CREATE INDEX IF NOT EXISTS idx_mobile_reminders_date ON reminders(date_time); CREATE INDEX IF NOT EXISTS idx_mobile_sync_pending ON sync_queue(synced_at,created_at);`);
  return db;
}
async function getDeviceId() {
  const db = await getDatabase(),
    row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM app_settings WHERE key='device_id'",
    );
  if (row) return row.value;
  const value = uuid();
  await db.runAsync(
    "INSERT INTO app_settings(key,value) VALUES('device_id',?)",
    value,
  );
  return value;
}
async function queue(
  db: SQLite.SQLiteDatabase,
  entityType: CloudEntity,
  entityId: string,
  operation: CloudEvent["operation"],
  payload: Record<string, unknown>,
) {
  await db.runAsync(
    "INSERT INTO sync_queue(id,entity_type,entity_id,operation,payload,created_at) VALUES(?,?,?,?,?,?)",
    uuid(),
    entityType,
    entityId,
    operation,
    JSON.stringify(payload),
    new Date().toISOString(),
  );
}
const days = (birth: string, date: string) => {
  const start=Date.parse(`${birth}T12:00:00Z`), end=Date.parse(`${date}T12:00:00Z`)
  if(Number.isNaN(start)||Number.isNaN(end)) throw new Error('Selecione uma data válida.')
  return Math.max(0,Math.floor((end-start)/86400000))
};

export const dogService = {
  async update(
    id: string,
    input: {
      name: string;
      birthDate: string;
      breed: string;
      sex: "male" | "female";
      registeredName?: string;
      color?: string;
      status?: string;
      notes?: string;
    },
  ) {
    const db = await getDatabase(),
      now = new Date().toISOString(),
      deviceId = await getDeviceId(),
      row = await db.getFirstAsync<{
        created_at: string;
        version: number;
        weight_kg: number;
      }>(
        "SELECT created_at,version,weight_kg FROM dogs WHERE id=? AND deleted_at IS NULL",
        id,
      );
    if (!row) throw new Error("Cão não encontrado.");
    const dog = {
      ...input,
      id,
      weightKg: row.weight_kg,
      registeredName: input.registeredName ?? "",
      color: input.color ?? "",
      status: input.status ?? "puppy",
      notes: input.notes ?? "",
      createdAt: row.created_at,
      updatedAt: now,
      deletedAt: null,
      version: row.version + 1,
      deviceId,
    };
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        "UPDATE dogs SET name=?,birth_date=?,breed=?,sex=?,registered_name=?,color=?,status=?,notes=?,updated_at=?,version=? WHERE id=?",
        input.name.trim(),
        input.birthDate,
        input.breed.trim(),
        input.sex,
        dog.registeredName,
        dog.color,
        dog.status,
        dog.notes,
        now,
        dog.version,
        id,
      );
      await queue(db, "dogs", id, "update", dog);
    });
    return dog;
  },
  async remove(id: string) {
    const db = await getDatabase(),
      now = new Date().toISOString(),
      deviceId = await getDeviceId(),
      row = await db.getFirstAsync<{
        name: string;
        birth_date: string;
        breed: string;
        sex: "male" | "female";
        weight_kg: number;
        created_at: string;
        version: number;
      }>("SELECT * FROM dogs WHERE id=? AND deleted_at IS NULL", id);
    if (!row) throw new Error("Cão não encontrado.");
    const dog = {
      id,
      name: row.name,
      birthDate: row.birth_date,
      breed: row.breed,
      sex: row.sex,
      weightKg: row.weight_kg,
      registeredName: "",
      color: "",
      status: "puppy",
      notes: "",
      createdAt: row.created_at,
      updatedAt: now,
      deletedAt: now,
      version: row.version + 1,
      deviceId,
    };
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        "UPDATE dogs SET deleted_at=?,updated_at=?,version=? WHERE id=?",
        now,
        now,
        dog.version,
        id,
      );
      await queue(db, "dogs", id, "delete", dog);
    });
  },
  async updateWeight(id: string, weightKg: number, bcs: number | null) {
    const db = await getDatabase(),
      now = new Date().toISOString(),
      row = await db.getFirstAsync<{
        dog_id: string;
        date: string;
        age_days: number;
        created_at: string;
        version: number;
        device_id: string;
      }>("SELECT * FROM weight_records WHERE id=? AND deleted_at IS NULL", id);
    if (!row) throw new Error("Pesagem não encontrada.");
    const record = {
      id,
      dogId: row.dog_id,
      date: row.date,
      ageDays: row.age_days,
      weightGrams: Math.round(weightKg * 1000),
      kilograms: Math.floor(weightKg),
      grams: Math.round((weightKg % 1) * 1000),
      height: null,
      chestCircumference: null,
      headCircumference: null,
      bodyConditionScore: bcs,
      notes: "",
      createdAt: row.created_at,
      updatedAt: now,
      deletedAt: null,
      version: row.version + 1,
      deviceId: row.device_id,
    };
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        "UPDATE weight_records SET weight_grams=?,body_condition_score=?,updated_at=?,version=? WHERE id=?",
        record.weightGrams,
        bcs,
        now,
        record.version,
        id,
      );
      await db.runAsync(
        "UPDATE dogs SET weight_kg=?,updated_at=? WHERE id=?",
        weightKg,
        now,
        row.dog_id,
      );
      await queue(db, "dog_measurements", id, "update", record);
    });
  },
  async removeWeight(id: string) {
    const db = await getDatabase(),
      now = new Date().toISOString(),
      row = await db.getFirstAsync<{
        dog_id: string;
        date: string;
        age_days: number;
        weight_grams: number;
        body_condition_score: number | null;
        created_at: string;
        version: number;
        device_id: string;
      }>("SELECT * FROM weight_records WHERE id=? AND deleted_at IS NULL", id);
    if (!row) throw new Error("Pesagem não encontrada.");
    const record = {
      id,
      dogId: row.dog_id,
      date: row.date,
      ageDays: row.age_days,
      weightGrams: row.weight_grams,
      kilograms: Math.floor(row.weight_grams / 1000),
      grams: row.weight_grams % 1000,
      height: null,
      chestCircumference: null,
      headCircumference: null,
      bodyConditionScore: row.body_condition_score,
      notes: "",
      createdAt: row.created_at,
      updatedAt: now,
      deletedAt: now,
      version: row.version + 1,
      deviceId: row.device_id,
    };
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        "UPDATE weight_records SET deleted_at=?,updated_at=?,version=? WHERE id=?",
        now,
        now,
        record.version,
        id,
      );
      await queue(db, "dog_measurements", id, "delete", record);
    });
  },
  async list(): Promise<MobileDog[]> {
    const rows = await (
      await getDatabase()
    ).getAllAsync<{
      id: string;
      name: string;
      birth_date: string;
      weight_kg: number;
      breed: string;
      sex: "male" | "female";
      updated_at: string;
      version: number;
      device_id: string;
      registered_name: string;
      color: string;
      status: string;
      notes: string;
    }>("SELECT * FROM dogs WHERE deleted_at IS NULL ORDER BY name");
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      birthDate: r.birth_date,
      weightKg: r.weight_kg,
      breed: r.breed,
      sex: r.sex,
      updatedAt: r.updated_at,
      version: r.version,
      deviceId: r.device_id,
      registeredName: r.registered_name,
      color: r.color,
      status: r.status,
      notes: r.notes,
    }));
  },
  async create(
    input: Omit<MobileDog, "id" | "updatedAt" | "version" | "deviceId">,
  ) {
    const db = await getDatabase(),
      now = new Date().toISOString(),
      deviceId = await getDeviceId(),
      dog = {
        ...input,
        id: uuid(),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        version: 1,
        deviceId,
        registeredName: input.registeredName ?? "",
        color: input.color ?? "",
        status: input.status ?? "puppy",
        notes: input.notes ?? "",
      },
      measurement = {
        id: uuid(),
        dogId: "",
        date: now.slice(0, 10),
        ageDays: 0,
        weightGrams: Math.round(input.weightKg * 1000),
        kilograms: Math.floor(input.weightKg),
        grams: Math.round((input.weightKg % 1) * 1000),
        height: null,
        chestCircumference: null,
        headCircumference: null,
        bodyConditionScore: null,
        notes: "Peso inicial",
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        version: 1,
        deviceId,
      };
    measurement.dogId = dog.id;
    measurement.ageDays = days(dog.birthDate, measurement.date);
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        "INSERT INTO dogs(id,name,birth_date,weight_kg,breed,sex,registered_name,color,status,notes,created_at,updated_at,version,device_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        dog.id,
        dog.name.trim(),
        dog.birthDate,
        dog.weightKg,
        dog.breed.trim(),
        dog.sex,
        dog.registeredName,
        dog.color,
        dog.status,
        dog.notes,
        now,
        now,
        1,
        deviceId,
      );
      await db.runAsync(
        "INSERT INTO weight_records(id,dog_id,date,weight_grams,age_days,notes,created_at,updated_at,version,device_id) VALUES(?,?,?,?,?,?,?,?,?,?)",
        measurement.id,
        dog.id,
        measurement.date,
        measurement.weightGrams,
        measurement.ageDays,
        "Peso inicial",
        now,
        now,
        1,
        deviceId,
      );
      await queue(db, "dogs", dog.id, "create", dog);
      await queue(
        db,
        "dog_measurements",
        measurement.id,
        "create",
        measurement,
      );
    });
    return dog;
  },
  async addWeight(dogId: string, weightKg: number, bcs: number | null = null) {
    const db = await getDatabase(),
      now = new Date().toISOString(),
      deviceId = await getDeviceId(),
      dog = await db.getFirstAsync<{ birth_date: string }>(
        "SELECT birth_date FROM dogs WHERE id=?",
        dogId,
      );
    if (!dog) throw new Error("Cão não encontrado.");
    const record = {
      id: uuid(),
      dogId,
      date: now.slice(0, 10),
      ageDays: days(dog.birth_date, now.slice(0, 10)),
      weightGrams: Math.round(weightKg * 1000),
      kilograms: Math.floor(weightKg),
      grams: Math.round((weightKg % 1) * 1000),
      height: null,
      chestCircumference: null,
      headCircumference: null,
      bodyConditionScore: bcs,
      notes: "",
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      version: 1,
      deviceId,
    };
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        "INSERT INTO weight_records(id,dog_id,date,weight_grams,age_days,body_condition_score,notes,created_at,updated_at,version,device_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        record.id,
        dogId,
        record.date,
        record.weightGrams,
        record.ageDays,
        bcs,
        "",
        now,
        now,
        1,
        deviceId,
      );
      await db.runAsync(
        "UPDATE dogs SET weight_kg=?,updated_at=?,version=version+1 WHERE id=?",
        weightKg,
        now,
        dogId,
      );
      await queue(db, "dog_measurements", record.id, "create", record);
    });
  },
  async weights(dogId: string): Promise<WeightRecord[]> {
    const r = await (
      await getDatabase()
    ).getAllAsync<{
      id: string;
      dog_id: string;
      date: string;
      weight_grams: number;
      body_condition_score: number | null;
      created_at: string;
      updated_at: string;
      version: number;
      device_id: string;
    }>(
      "SELECT * FROM weight_records WHERE dog_id=? AND deleted_at IS NULL ORDER BY date,created_at",
      dogId,
    );
    return r.map((x) => ({
      id: x.id,
      dogId: x.dog_id,
      date: x.date,
      weightGrams: x.weight_grams,
      bodyConditionScore: x.body_condition_score,
      createdAt: x.created_at,
      updatedAt: x.updated_at,
      version: x.version,
      deviceId: x.device_id,
    }));
  },
};

export const feedingService = {
  async save(
    input: Omit<
      FeedingPlan,
      "id" | "createdAt" | "updatedAt" | "deletedAt" | "version" | "deviceId"
    >,
  ): Promise<FeedingPlan> {
    const db = await getDatabase(),
      now = new Date().toISOString(),
      deviceId = await getDeviceId(),
      old = await db.getFirstAsync<{
        id: string;
        created_at: string;
        version: number;
      }>(
        "SELECT id,created_at,version FROM feeding_plans WHERE dog_id=? AND deleted_at IS NULL",
        input.dogId,
      ),
      record: FeedingPlan = {
        ...input,
        id: old?.id ?? uuid(),
        createdAt: old?.created_at || now,
        updatedAt: now,
        deletedAt: null,
        version: (old?.version ?? 0) + 1,
        deviceId,
      };
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        "INSERT INTO feeding_plans(id,dog_id,food_name,kcal_per_kg,daily_grams,grams_per_meal,meals_per_day,times_json,life_stage,goal,adjustment_percent,created_at,updated_at,version,device_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET food_name=excluded.food_name,kcal_per_kg=excluded.kcal_per_kg,daily_grams=excluded.daily_grams,grams_per_meal=excluded.grams_per_meal,meals_per_day=excluded.meals_per_day,times_json=excluded.times_json,life_stage=excluded.life_stage,goal=excluded.goal,adjustment_percent=excluded.adjustment_percent,updated_at=excluded.updated_at,version=excluded.version",
        record.id,
        input.dogId,
        input.foodName,
        input.kcalPerKg,
        input.dailyGrams,
        input.gramsPerMeal,
        input.mealsPerDay,
        JSON.stringify(input.times),
        input.lifeStage,
        input.goal,
        input.adjustmentPercent,
        record.createdAt,
        now,
        record.version,
        deviceId,
      );
      await queue(
        db,
        "feeding_plans",
        record.id,
        old ? "update" : "create",
        { ...record },
      );
    });
    return record;
  },
  async find(dogId: string): Promise<FeedingPlan | null> {
    const r = await (
      await getDatabase()
    ).getFirstAsync<{
      id: string;
      dog_id: string;
      food_name: string;
      kcal_per_kg: number;
      daily_grams: number;
      grams_per_meal: number;
      meals_per_day: number;
      times_json: string;
      life_stage: LifeStage;
      goal: WeightGoal;
      adjustment_percent: number;
      created_at: string;
      updated_at: string;
      deleted_at: string | null;
      version: number;
      device_id: string;
    }>(
      "SELECT * FROM feeding_plans WHERE dog_id=? AND deleted_at IS NULL",
      dogId,
    );
    return r
      ? {
          id: r.id,
          dogId: r.dog_id,
          foodName: r.food_name,
          kcalPerKg: r.kcal_per_kg,
          dailyGrams: r.daily_grams,
          gramsPerMeal: r.grams_per_meal,
          mealsPerDay: r.meals_per_day,
          times: JSON.parse(r.times_json) as string[],
          lifeStage: r.life_stage,
          goal: r.goal,
          adjustmentPercent: r.adjustment_percent,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          deletedAt: r.deleted_at,
          version: r.version,
          deviceId: r.device_id,
        }
      : null;
  },
};

export const reminderService = {
  async update(id:string,input:Omit<Reminder,"id">){const db=await getDatabase(),now=new Date().toISOString(),deviceId=await getDeviceId(),old=await db.getFirstAsync<{created_at:string}>("SELECT created_at FROM reminders WHERE id=?",id);if(!old)throw new Error("Lembrete não encontrado.");const record={...input,id},cloud={id,module:"agenda",title:input.title,category:input.type==="appointment"?"Consulta":"Lembrete",date:input.dateTime.slice(0,10),description:`Horário: ${new Date(input.dateTime).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}`,amount:null,dogId:input.dogId,nextDate:"",phone:"",whatsapp:"",instagram:"",email:"",city:"",state:"",cpf:"",transactionType:null,quantity:null,unit:"",supplier:"",manufacturer:"",batch:"",dose:"",veterinarian:"",clinic:"",createdAt:old.created_at,updatedAt:now,deletedAt:null,version:2,deviceId};await db.withTransactionAsync(async()=>{await db.runAsync("UPDATE reminders SET dog_id=?,title=?,date_time=?,type=?,notification_id=? WHERE id=?",input.dogId,input.title,input.dateTime,input.type,input.notificationId,id);await queue(db,"agenda",id,"update",cloud)});return record},
  async remove(id:string){const db=await getDatabase(),now=new Date().toISOString(),deviceId=await getDeviceId(),old=await db.getFirstAsync<{dog_id:string|null;title:string;date_time:string;type:string;created_at:string}>("SELECT * FROM reminders WHERE id=?",id);if(!old)throw new Error("Lembrete não encontrado.");const cloud={id,module:"agenda",title:old.title,category:"Lembrete",date:old.date_time.slice(0,10),description:"",amount:null,dogId:old.dog_id,nextDate:"",phone:"",whatsapp:"",instagram:"",email:"",city:"",state:"",cpf:"",transactionType:null,quantity:null,unit:"",supplier:"",manufacturer:"",batch:"",dose:"",veterinarian:"",clinic:"",createdAt:old.created_at,updatedAt:now,deletedAt:now,version:2,deviceId};await db.withTransactionAsync(async()=>{await db.runAsync("DELETE FROM reminders WHERE id=?",id);await queue(db,"agenda",id,"delete",cloud)})},
  async create(input: Omit<Reminder, "id">) {
    const db = await getDatabase(),
      now = new Date().toISOString(),
      deviceId = await getDeviceId(),
      record = { ...input, id: uuid() },
      cloud = {
        id: "",
        module: "agenda",
        title: input.title,
        category: input.type === "appointment" ? "Consulta" : "Lembrete",
        date: input.dateTime.slice(0, 10),
        description: `Horário: ${new Date(input.dateTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
        amount: null,
        dogId: input.dogId,
        nextDate: "",
        phone: "",
        whatsapp: "",
        instagram: "",
        email: "",
        city: "",
        state: "",
        cpf: "",
        transactionType: null,
        quantity: null,
        unit: "",
        supplier: "",
        manufacturer: "",
        batch: "",
        dose: "",
        veterinarian: "",
        clinic: "",
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        version: 1,
        deviceId,
      };
    cloud.id = record.id;
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        "INSERT INTO reminders(id,dog_id,title,date_time,type,notification_id,created_at) VALUES(?,?,?,?,?,?,?)",
        record.id,
        record.dogId,
        record.title,
        record.dateTime,
        record.type,
        record.notificationId,
        now,
      );
      await queue(db, "agenda", record.id, "create", cloud);
    });
    return record;
  },
  async list(): Promise<Reminder[]> {
    const r = await (
      await getDatabase()
    ).getAllAsync<{
      id: string;
      dog_id: string | null;
      title: string;
      date_time: string;
      type: Reminder["type"];
      notification_id: string | null;
    }>("SELECT * FROM reminders ORDER BY date_time");
    return r.map((x) => ({
      id: x.id,
      dogId: x.dog_id,
      title: x.title,
      dateTime: x.date_time,
      type: x.type,
      notificationId: x.notification_id,
    }));
  },
};

export const moduleService = {
  async list(module:MobileModule):Promise<MobileModuleRecord[]>{const rows=await (await getDatabase()).getAllAsync<any>('SELECT * FROM module_records WHERE module=? AND deleted_at IS NULL ORDER BY date DESC,updated_at DESC',module);return rows.map((r:any)=>({id:r.id,module:r.module,title:r.title,category:r.category,date:r.date,description:r.description,amount:r.amount,dogId:r.dog_id,phone:r.phone,whatsapp:r.whatsapp,email:r.email,transactionType:r.transaction_type,quantity:r.quantity,unit:r.unit,createdAt:r.created_at,updatedAt:r.updated_at,deletedAt:r.deleted_at,version:r.version,deviceId:r.device_id}))},
  async save(input:Omit<MobileModuleRecord,'id'|'createdAt'|'updatedAt'|'deletedAt'|'version'|'deviceId'>,id?:string){const db=await getDatabase(),now=new Date().toISOString(),deviceId=await getDeviceId();const previous=id?await db.getFirstAsync<{created_at:string;version:number}>('SELECT created_at,version FROM module_records WHERE id=?',id):null;const record:MobileModuleRecord={...input,id:id??uuid(),createdAt:previous?.created_at??now,updatedAt:now,deletedAt:null,version:(previous?.version??0)+1,deviceId};await db.withTransactionAsync(async()=>{await db.runAsync(`INSERT INTO module_records(id,module,title,category,date,description,amount,dog_id,phone,whatsapp,email,transaction_type,quantity,unit,created_at,updated_at,deleted_at,version,device_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET module=excluded.module,title=excluded.title,category=excluded.category,date=excluded.date,description=excluded.description,amount=excluded.amount,dog_id=excluded.dog_id,phone=excluded.phone,whatsapp=excluded.whatsapp,email=excluded.email,transaction_type=excluded.transaction_type,quantity=excluded.quantity,unit=excluded.unit,updated_at=excluded.updated_at,deleted_at=NULL,version=excluded.version,device_id=excluded.device_id`,record.id,record.module,record.title,record.category,record.date,record.description,record.amount,record.dogId,record.phone,record.whatsapp,record.email,record.transactionType,record.quantity,record.unit,record.createdAt,record.updatedAt,null,record.version,record.deviceId);await queue(db,'module_records',record.id,previous?'update':'create',{...record})});return record},
  async remove(id:string){const db=await getDatabase(),row=await db.getFirstAsync<any>('SELECT * FROM module_records WHERE id=? AND deleted_at IS NULL',id);if(!row)return;const now=new Date().toISOString(),record={id:row.id,module:row.module,title:row.title,category:row.category,date:row.date,description:row.description,amount:row.amount,dogId:row.dog_id,phone:row.phone,whatsapp:row.whatsapp,email:row.email,transactionType:row.transaction_type,quantity:row.quantity,unit:row.unit,createdAt:row.created_at,updatedAt:now,deletedAt:now,version:row.version+1,deviceId:row.device_id};await db.withTransactionAsync(async()=>{await db.runAsync('UPDATE module_records SET deleted_at=?,updated_at=?,version=? WHERE id=?',now,now,record.version,id);await queue(db,'module_records',id,'delete',record)})}
}

export const syncService = {
  async summary() {
    const db = await getDatabase();
    return {
      pending:
        (
          await db.getFirstAsync<{ count: number }>(
            "SELECT COUNT(*) count FROM sync_queue WHERE synced_at IS NULL",
          )
        )?.count ?? 0,
      lastSync:
        (
          await db.getFirstAsync<{ value: string }>(
            "SELECT value FROM app_settings WHERE key='last_sync'",
          )
        )?.value ?? null,
      deviceId: await getDeviceId(),
    };
  },
  async pending(): Promise<CloudEvent[]> {
    const r = await (
      await getDatabase()
    ).getAllAsync<{
      id: string;
      entity_type: CloudEntity;
      entity_id: string;
      operation: CloudEvent["operation"];
      payload: string;
      created_at: string;
    }>("SELECT * FROM sync_queue WHERE synced_at IS NULL ORDER BY created_at");
    return r.map((x) => {
      const payload = JSON.parse(x.payload) as Record<string, unknown>;
      return {
        id: x.id,
        entityType: x.entity_type,
        entityId: x.entity_id,
        operation: x.operation,
        payload,
        createdAt: x.created_at,
        deviceId: String(payload.deviceId),
      };
    });
  },
  async markUploaded(ids: string[]) {
    const db = await getDatabase(),
      now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      for (const id of ids)
        await db.runAsync(
          "UPDATE sync_queue SET synced_at=? WHERE id=?",
          now,
          id,
        );
      await db.runAsync(
        "INSERT INTO app_settings(key,value) VALUES('last_sync',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        now,
      );
    });
  },
  async apply(events: CloudEvent[]) {
    const db = await getDatabase();
    let count = 0;
    await db.withTransactionAsync(async () => {
      for (const event of events) {
        if (
          await db.getFirstAsync(
            "SELECT 1 FROM sync_applied_events WHERE event_id=?",
            event.id,
          )
        )
          continue;
        const p = event.payload;
        if (event.entityType === "dogs") {
          await db.runAsync(
            `INSERT INTO dogs(id,name,birth_date,weight_kg,breed,sex,registered_name,color,status,notes,created_at,updated_at,deleted_at,version,device_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,birth_date=excluded.birth_date,breed=excluded.breed,sex=excluded.sex,registered_name=excluded.registered_name,color=excluded.color,status=excluded.status,notes=excluded.notes,updated_at=excluded.updated_at,deleted_at=excluded.deleted_at,version=excluded.version,device_id=excluded.device_id WHERE excluded.version>dogs.version OR (excluded.version=dogs.version AND excluded.updated_at>dogs.updated_at)`,
            String(p.id),
            String(p.name),
            String(p.birthDate),
            0,
            String(p.breed),
            String(p.sex),
            String(p.registeredName ?? ""),
            String(p.color ?? ""),
            String(p.status ?? "puppy"),
            String(p.notes ?? ""),
            String(p.createdAt),
            String(p.updatedAt),
            p.deletedAt ? String(p.deletedAt) : null,
            Number(p.version),
            String(p.deviceId),
          );
        } else if (event.entityType === "dog_measurements") {
          await db.runAsync(
            `INSERT INTO weight_records(id,dog_id,date,weight_grams,age_days,height,chest_circumference,head_circumference,body_condition_score,notes,created_at,updated_at,deleted_at,version,device_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET dog_id=excluded.dog_id,date=excluded.date,weight_grams=excluded.weight_grams,age_days=excluded.age_days,height=excluded.height,chest_circumference=excluded.chest_circumference,head_circumference=excluded.head_circumference,body_condition_score=excluded.body_condition_score,notes=excluded.notes,updated_at=excluded.updated_at,deleted_at=excluded.deleted_at,version=excluded.version,device_id=excluded.device_id WHERE excluded.version>weight_records.version OR (excluded.version=weight_records.version AND excluded.updated_at>weight_records.updated_at)`,
            String(p.id),
            String(p.dogId),
            String(p.date),
            Number(p.weightGrams),
            Number(p.ageDays),
            p.height == null ? null : Number(p.height),
            p.chestCircumference == null ? null : Number(p.chestCircumference),
            p.headCircumference == null ? null : Number(p.headCircumference),
            p.bodyConditionScore == null ? null : Number(p.bodyConditionScore),
            String(p.notes ?? ""),
            String(p.createdAt),
            String(p.updatedAt),
            p.deletedAt == null ? null : String(p.deletedAt),
            Number(p.version),
            String(p.deviceId),
          );
          const latestWeight = await db.getFirstAsync<{ weight_grams: number }>(
            "SELECT weight_grams FROM weight_records WHERE dog_id=? AND deleted_at IS NULL ORDER BY date DESC,updated_at DESC LIMIT 1",
            String(p.dogId),
          );
          if (latestWeight) await db.runAsync(
            "UPDATE dogs SET weight_kg=? WHERE id=?",
            latestWeight.weight_grams / 1000,
            String(p.dogId),
          );
        } else if (event.entityType === "feeding_plans") {
          await db.runAsync(
            `INSERT INTO feeding_plans(id,dog_id,food_name,kcal_per_kg,daily_grams,grams_per_meal,meals_per_day,times_json,life_stage,goal,adjustment_percent,created_at,updated_at,deleted_at,version,device_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET dog_id=excluded.dog_id,food_name=excluded.food_name,kcal_per_kg=excluded.kcal_per_kg,daily_grams=excluded.daily_grams,grams_per_meal=excluded.grams_per_meal,meals_per_day=excluded.meals_per_day,times_json=excluded.times_json,life_stage=excluded.life_stage,goal=excluded.goal,adjustment_percent=excluded.adjustment_percent,updated_at=excluded.updated_at,deleted_at=excluded.deleted_at,version=excluded.version,device_id=excluded.device_id WHERE excluded.version>feeding_plans.version OR (excluded.version=feeding_plans.version AND excluded.updated_at>feeding_plans.updated_at)`,
            String(p.id),
            String(p.dogId),
            String(p.foodName),
            Number(p.kcalPerKg),
            Number(p.dailyGrams),
            Number(p.gramsPerMeal),
            Number(p.mealsPerDay),
            JSON.stringify(p.times),
            String(p.lifeStage),
            String(p.goal),
            Number(p.adjustmentPercent ?? 0),
            String(p.createdAt),
            String(p.updatedAt),
            p.deletedAt == null ? null : String(p.deletedAt),
            Number(p.version),
            String(p.deviceId),
          );
        } else if (event.entityType === "module_records") {
          await db.runAsync(
            `INSERT INTO module_records(id,module,title,category,date,description,amount,dog_id,phone,whatsapp,email,transaction_type,quantity,unit,created_at,updated_at,deleted_at,version,device_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET module=excluded.module,title=excluded.title,category=excluded.category,date=excluded.date,description=excluded.description,amount=excluded.amount,dog_id=excluded.dog_id,phone=excluded.phone,whatsapp=excluded.whatsapp,email=excluded.email,transaction_type=excluded.transaction_type,quantity=excluded.quantity,unit=excluded.unit,updated_at=excluded.updated_at,deleted_at=excluded.deleted_at,version=excluded.version,device_id=excluded.device_id WHERE excluded.version>module_records.version OR (excluded.version=module_records.version AND excluded.updated_at>module_records.updated_at)`,
            String(p.id),String(p.module),String(p.title),String(p.category),String(p.date),String(p.description??''),p.amount==null?null:Number(p.amount),p.dogId==null?null:String(p.dogId),String(p.phone??''),String(p.whatsapp??''),String(p.email??''),p.transactionType==null?null:String(p.transactionType),p.quantity==null?null:Number(p.quantity),String(p.unit??''),String(p.createdAt),String(p.updatedAt),p.deletedAt==null?null:String(p.deletedAt),Number(p.version),String(p.deviceId)
          );
        }
        await db.runAsync(
          "INSERT INTO sync_applied_events(event_id,applied_at) VALUES(?,?)",
          event.id,
          new Date().toISOString(),
        );
        count++;
      }
      await db.runAsync(
        "INSERT INTO app_settings(key,value) VALUES('last_sync',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        new Date().toISOString(),
      );
    });
    return count;
  },
};
