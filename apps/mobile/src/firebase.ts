import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  setDoc,
} from "firebase/firestore";
import { syncService, type CloudEntity, type CloudEvent } from "./database";
import { importAgendaEvents } from "./agenda-sync";

const app = initializeApp({
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
});
const auth = getAuth(app),
  firestore = getFirestore(app);
const entities = new Set<CloudEntity>([
  "dogs",
  "dog_measurements",
  "agenda",
  "feeding_plans",
  "module_records",
]);
export const observeUser = (callback: (user: User | null) => void) =>
  onAuthStateChanged(auth, callback);
export const login = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email.trim(), password);
export const logout = () => signOut(auth);
export async function synchronize() {
  const user = auth.currentUser;
  if (!user) throw new Error("Entre na conta Firebase.");
  const pending = await syncService.pending();
  for (const event of pending)
    await setDoc(doc(firestore, "users", user.uid, "changes", event.id), event);
  await syncService.markUploaded(pending.map((x) => x.id));
  const snapshot = await getDocs(
    collection(firestore, "users", user.uid, "changes"),
  );
  const remote: CloudEvent[] = [];
  snapshot.forEach((item) => {
    const value = item.data() as Partial<CloudEvent>;
    if (
      typeof value.id === "string" &&
      typeof value.entityType === "string" &&
      entities.has(value.entityType as CloudEntity) &&
      typeof value.entityId === "string" &&
      typeof value.createdAt === "string" &&
      typeof value.deviceId === "string" &&
      value.payload &&
      typeof value.payload === "object"
    )
      remote.push(value as CloudEvent);
  });
  remote.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const agenda = remote.filter((x) => x.entityType === "agenda"),
    records = remote.filter((x) => x.entityType !== "agenda");
  const downloaded =
    (await importAgendaEvents(agenda)) + (await syncService.apply(records));
  return {
    uploaded: pending.length,
    downloaded,
    summary: await syncService.summary(),
  };
}
