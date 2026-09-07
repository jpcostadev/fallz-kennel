import { initializeApp } from 'firebase/app'
import { browserLocalPersistence, getAuth, onAuthStateChanged, setPersistence, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { collection, getDocs, getFirestore, setDoc, doc } from 'firebase/firestore'
import { syncEventSchema, type SyncEvent } from '../../shared/sync'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

const configured = Object.values(firebaseConfig).every(Boolean)
const firebaseApp = configured ? initializeApp(firebaseConfig) : null
export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null
const firestore = firebaseApp ? getFirestore(firebaseApp) : null

if (firebaseAuth) void setPersistence(firebaseAuth, browserLocalPersistence)

export function observeFirebaseUser(callback: (user: User | null) => void): () => void {
  if (!firebaseAuth) { callback(null); return () => undefined }
  return onAuthStateChanged(firebaseAuth, callback)
}

export async function loginFirebase(email: string, password: string): Promise<User> {
  if (!firebaseAuth) throw new Error('Firebase não configurado.')
  return (await signInWithEmailAndPassword(firebaseAuth, email, password)).user
}

export async function logoutFirebase(): Promise<void> { if (firebaseAuth) await signOut(firebaseAuth) }

export async function synchronizeFirebase(): Promise<{ uploaded: number; downloaded: number; pending: number }> {
  const user = firebaseAuth?.currentUser
  if (!user || !firestore) throw new Error('Entre na sua conta Firebase antes de sincronizar.')
  if (!navigator.onLine) throw new Error('Sem conexão com a internet.')

  const pending = await window.fallz.sync.pending()
  for (const event of pending) {
    await setDoc(doc(firestore, 'users', user.uid, 'changes', event.id), event)
  }
  if (pending.length) await window.fallz.sync.markUploaded(pending.map((event) => event.id))

  const snapshot = await getDocs(collection(firestore, 'users', user.uid, 'changes'))
  const remote: SyncEvent[] = []
  snapshot.forEach((item) => {
    const parsed = syncEventSchema.safeParse(item.data())
    if (parsed.success) remote.push(parsed.data)
  })
  remote.sort((a, b) => {
    const priority = (event: SyncEvent): number => event.entityType === 'dogs' ? 0 : 1
    return priority(a) - priority(b) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
  })
  const downloaded = await window.fallz.sync.apply(remote)
  const summary = await window.fallz.sync.summary()
  return { uploaded: pending.length, downloaded, pending: summary.pending }
}
