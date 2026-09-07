import { getDatabase, type CloudEvent } from "./database";

export async function importAgendaEvents(
  events: CloudEvent[],
): Promise<number> {
  const db = await getDatabase();
  let count = 0;
  for (const event of events) {
    const done = await db.getFirstAsync(
      "SELECT 1 FROM sync_applied_events WHERE event_id=?",
      event.id,
    );
    if (done) continue;
    const p = event.payload,
      time = String(p.description ?? "").match(/(\d{2}):(\d{2})/),
      dateTime = `${String(p.date)}T${time ? `${time[1]}:${time[2]}` : "09:00"}:00`;
    const dogId = p.dogId ? String(p.dogId) : null;
    if (dogId && !(await db.getFirstAsync("SELECT 1 FROM dogs WHERE id=?", dogId))) continue;
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        "INSERT OR IGNORE INTO reminders(id,dog_id,title,date_time,type,notification_id,created_at) VALUES(?,?,?,?,?,?,?)",
        String(p.id),
        dogId,
        String(p.title),
        dateTime,
        "appointment",
        null,
        String(p.createdAt),
      );
      await transaction.runAsync(
        "INSERT INTO sync_applied_events(event_id,applied_at) VALUES(?,?)",
        event.id,
        new Date().toISOString(),
      );
    });
    count++;
  }
  return count;
}
