import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  set,
  get,
  remove,
  onValue,
  off,
  Database,
} from 'firebase/database';
import { Transaction, Account, Category, Budget, User } from '../types';

export const firebaseConfig = {
  apiKey: "AIzaSyAc-cbW6UZ9Wkcbq_WNWV5SvjH00-sJIsY",
  authDomain: "nkservice-c26f9.firebaseapp.com",
  databaseURL: "https://nkservice-c26f9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "nkservice-c26f9",
  storageBucket: "nkservice-c26f9.firebasestorage.app",
  messagingSenderId: "236216217201",
  appId: "1:236216217201:web:8f671a0621ba91db8db5d0",
  measurementId: "G-37F118BTQP"
};

// Singleton Firebase initialization
export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let realtimeDb: Database | null = null;
try {
  realtimeDb = getDatabase(firebaseApp, firebaseConfig.databaseURL);
} catch (err) {
  console.warn('Realtime Database initialization warning:', err);
}

export const rtdb = realtimeDb;

// Check if Realtime Database is ready
export function isRealtimeDbConfigured(): boolean {
  return !!rtdb && !!firebaseConfig.databaseURL;
}

// Helper to normalize phone numbers for comparison
function matchPhones(p1?: string, p2?: string): boolean {
  if (!p1 || !p2) return false;
  const d1 = p1.replace(/\D/g, '');
  const d2 = p2.replace(/\D/g, '');
  if (!d1 || !d2) return false;
  if (d1 === d2) return true;
  const tail1 = d1.slice(-8);
  const tail2 = d2.slice(-8);
  if (tail1.length >= 7 && tail1 === tail2) return true;
  return false;
}

// ---------------- TRANSACTIONS (ADD, EDIT, DELETE, LOAD, REALTIME ONVALUE) ----------------

/**
 * Save or update transaction in Firebase Realtime Database
 * Path: users/{userId}/transactions/{txId}
 */
export async function saveTransactionToRTDB(userId: string, tx: Transaction): Promise<void> {
  if (!rtdb || !userId || !tx?.id) return;
  try {
    const txRef = ref(rtdb, `users/${userId}/transactions/${tx.id}`);
    await set(txRef, {
      ...tx,
      userId,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.warn('Firebase RTDB save transaction failed:', err);
  }
}

/**
 * Delete transaction from Firebase Realtime Database
 * Path: users/{userId}/transactions/{txId}
 */
export async function deleteTransactionFromRTDB(userId: string, txId: string): Promise<void> {
  if (!rtdb || !userId || !txId) return;
  try {
    const txRef = ref(rtdb, `users/${userId}/transactions/${txId}`);
    await remove(txRef);
  } catch (err) {
    console.warn('Firebase RTDB delete transaction failed:', err);
  }
}

/**
 * Load all transactions from Firebase Realtime Database once
 */
export async function loadTransactionsFromRTDB(userId: string): Promise<Transaction[]> {
  if (!rtdb || !userId) return [];
  try {
    const txsRef = ref(rtdb, `users/${userId}/transactions`);
    const snapshot = await get(txsRef);
    if (!snapshot.exists()) return [];

    const val = snapshot.val();
    if (!val || typeof val !== 'object') return [];

    const list: Transaction[] = Object.values(val);
    return list.sort((a, b) => {
      const da = `${a.date} ${a.time || '00:00'}`;
      const db = `${b.date} ${b.time || '00:00'}`;
      return db.localeCompare(da);
    });
  } catch (err) {
    console.warn('Firebase RTDB load transactions failed:', err);
    return [];
  }
}

/**
 * Realtime synchronization listener for transactions (live push updates)
 */
export function subscribeTransactionsFromRTDB(
  userId: string,
  onUpdate: (txs: Transaction[]) => void
): () => void {
  if (!rtdb || !userId) return () => {};
  try {
    const txsRef = ref(rtdb, `users/${userId}/transactions`);
    const callback = (snapshot: any) => {
      if (!snapshot.exists()) {
        onUpdate([]);
        return;
      }
      const val = snapshot.val();
      if (!val || typeof val !== 'object') {
        onUpdate([]);
        return;
      }
      const list: Transaction[] = Object.values(val);
      list.sort((a, b) => {
        const da = `${a.date} ${a.time || '00:00'}`;
        const db = `${b.date} ${b.time || '00:00'}`;
        return db.localeCompare(da);
      });
      onUpdate(list);
    };

    onValue(txsRef, callback);

    return () => {
      off(txsRef, 'value', callback);
    };
  } catch {
    return () => {};
  }
}

// ---------------- ACCOUNTS, CATEGORIES, BUDGETS IN RTDB ----------------

export async function saveAccountsToRTDB(userId: string, accounts: Account[]): Promise<void> {
  if (!rtdb || !userId) return;
  try {
    const accRef = ref(rtdb, `users/${userId}/accounts`);
    await set(accRef, accounts);
  } catch (err) {
    console.warn('Firebase RTDB save accounts failed:', err);
  }
}

export async function loadAccountsFromRTDB(userId: string): Promise<Account[] | null> {
  if (!rtdb || !userId) return null;
  try {
    const accRef = ref(rtdb, `users/${userId}/accounts`);
    const snap = await get(accRef);
    if (snap.exists()) {
      return snap.val() as Account[];
    }
  } catch (err) {
    console.warn('Firebase RTDB load accounts failed:', err);
  }
  return null;
}

export async function saveCategoriesToRTDB(userId: string, categories: Category[]): Promise<void> {
  if (!rtdb || !userId) return;
  try {
    const catRef = ref(rtdb, `users/${userId}/categories`);
    await set(catRef, categories);
  } catch (err) {
    console.warn('Firebase RTDB save categories failed:', err);
  }
}

export async function saveBudgetsToRTDB(userId: string, budgets: Budget[]): Promise<void> {
  if (!rtdb || !userId) return;
  try {
    const budRef = ref(rtdb, `users/${userId}/budgets`);
    await set(budRef, budgets);
  } catch (err) {
    console.warn('Firebase RTDB save budgets failed:', err);
  }
}

// ---------------- USERS AUTH & CROSS-DEVICE IN RTDB ----------------

export async function saveUserToRTDB(user: User): Promise<void> {
  if (!rtdb || !user?.id) return;
  try {
    const userRef = ref(rtdb, `global_users/${user.id}`);
    await set(userRef, {
      ...user,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.warn('Firebase RTDB save user failed:', err);
  }
}

export async function findUserInRTDB(identifier: string): Promise<User | null> {
  if (!rtdb || !identifier.trim()) return null;
  try {
    const clean = identifier.trim().toLowerCase();
    const usersRef = ref(rtdb, 'global_users');
    const snap = await get(usersRef);
    if (!snap.exists()) return null;

    const data = snap.val();
    if (!data || typeof data !== 'object') return null;

    const usersList: User[] = Object.values(data);
    let match: User | null = null;

    for (const u of usersList) {
      if (matchPhones(u.phone, clean)) {
        match = u;
        break;
      }
      if ((u.username || '').toLowerCase() === clean) {
        match = u;
        break;
      }
      if ((u.fullName || '').toLowerCase() === clean || (clean.length >= 3 && (u.fullName || '').toLowerCase().includes(clean))) {
        match = u;
        break;
      }
    }

    return match;
  } catch (err) {
    console.warn('Firebase RTDB find user failed:', err);
    return null;
  }
}

export async function resetPasswordInRTDB(identifier: string, newPassword: string): Promise<User | null> {
  if (!rtdb || !identifier || !newPassword) return null;
  try {
    const user = await findUserInRTDB(identifier);
    if (!user) return null;

    user.password = newPassword.trim();
    const userPassRef = ref(rtdb, `global_users/${user.id}/password`);
    await set(userPassRef, user.password);
    return user;
  } catch (err) {
    console.warn('Firebase RTDB reset password failed:', err);
    return null;
  }
}
