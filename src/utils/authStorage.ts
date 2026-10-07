import { User, Transaction, Account, Budget, RecurringTransaction } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS, DEFAULT_BUDGETS, generateInitialTransactions } from '../data/defaultData';
import {
  saveTransactionToRTDB,
  deleteTransactionFromRTDB,
  loadTransactionsFromRTDB,
  saveAccountsToRTDB,
  saveCategoriesToRTDB,
  saveBudgetsToRTDB,
  saveUserToRTDB,
  findUserInRTDB,
  resetPasswordInRTDB,
} from './firebase';

const AUTH_STORAGE_KEYS = {
  USERS: 'lao_expense_users_v2',
  CURRENT_USER_ID: 'lao_expense_current_user_id_v2',
};

// No pre-seeded demo accounts
export const DEFAULT_USERS: User[] = [];

// Helper to normalize phone numbers (remove spaces, leading zeroes, dashes)
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\+]/g, '');
}

export function getStoredUsers(): User[] {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.USERS);
    if (raw) {
      const users: User[] = JSON.parse(raw);
      if (Array.isArray(users)) {
        // Filter out any leftover demo accounts
        const realUsers = users.filter(u => u.id !== 'usr_somxay_1' && u.id !== 'usr_daovone_2');
        if (realUsers.length !== users.length) {
          saveUsers(realUsers);
        }
        return realUsers;
      }
    }
  } catch {
    // fallback
  }
  return [];
}

export function saveUsers(users: User[]): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEYS.USERS, JSON.stringify(users));
  } catch {}
}

export function getCurrentUser(): User | null {
  try {
    const currentId = localStorage.getItem(AUTH_STORAGE_KEYS.CURRENT_USER_ID);
    if (!currentId || currentId === 'usr_somxay_1' || currentId === 'usr_daovone_2') {
      localStorage.removeItem(AUTH_STORAGE_KEYS.CURRENT_USER_ID);
      return null;
    }
    const users = getStoredUsers();
    return users.find(u => u.id === currentId) || null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: User | null): void {
  try {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER_ID, user.id);
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEYS.CURRENT_USER_ID);
    }
  } catch {}
}

export function loginUser(
  identifier: string,
  pass: string
): { success: boolean; user?: User; error?: string } {
  const users = getStoredUsers();
  const cleanId = identifier.trim().toLowerCase();
  const cleanNormPhone = normalizePhone(cleanId);

  const matched = users.find(u => {
    const userCleanName = (u.username || '').toLowerCase().trim();
    const userCleanPhone = normalizePhone(u.phone);
    const userCleanFull = (u.fullName || '').toLowerCase().trim();
    return (
      userCleanName === cleanId ||
      userCleanPhone === cleanNormPhone ||
      u.phone.replace(/\D/g, '').includes(cleanNormPhone) ||
      userCleanFull === cleanId ||
      (cleanId.length >= 3 && userCleanFull.includes(cleanId))
    );
  });

  if (!matched) {
    return {
      success: false,
      error: 'ບໍ່ພົບຜູ້ໃຊ້ນີ້ໃນລະບົບ (User not found). ກະລຸນາກວດສອບເບີໂທ, ຊື່ຜູ້ໃຊ້ ຫຼື ຊື່ເຕັມ.',
    };
  }

  if (matched.password !== pass) {
    return {
      success: false,
      error: 'ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ (Incorrect password). ກະລຸນາລອງໃໝ່.',
    };
  }

  setCurrentUser(matched);
  return { success: true, user: matched };
}

// Remote cross-device login (allows logging in from other machines)
export async function loginUserRemote(
  identifier: string,
  pass: string
): Promise<{
  success: boolean;
  user?: User;
  error?: string;
  found?: boolean;
  accountName?: string;
  accountPhone?: string;
}> {
  const cleanId = identifier.trim();
  const cleanPass = pass.trim();

  // 1. Try server first so accounts registered on other machines are found!
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: cleanId, password: cleanPass }),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data && data.success && data.user) {
      const serverUser: User = data.user;
      const localUsers = getStoredUsers();
      if (!localUsers.some(u => u.id === serverUser.id)) {
        saveUsers([...localUsers, serverUser]);
      }
      setCurrentUser(serverUser);

      // If server sent synced user data, populate local store
      if (data.data) {
        if (Array.isArray(data.data.transactions)) saveUserTransactions(serverUser.id, data.data.transactions);
        if (Array.isArray(data.data.categories)) saveUserCategories(serverUser.id, data.data.categories);
        if (Array.isArray(data.data.accounts)) saveUserAccounts(serverUser.id, data.data.accounts);
        if (Array.isArray(data.data.budgets)) saveUserBudgets(serverUser.id, data.data.budgets);
        if (Array.isArray(data.data.recurring)) saveUserRecurring(serverUser.id, data.data.recurring);
      } else {
        if (loadUserAccounts(serverUser.id).length === 0) {
          initializeUserData(serverUser.id, serverUser.fullName);
        }
      }
      // Save to Realtime Database in background
      saveUserToRTDB(serverUser).catch(() => {});
      return { success: true, user: serverUser };
    } else if (data) {
      // Structured server error response (account found vs not found, wrong password)
      return {
        success: false,
        error: data.error,
        found: data.found,
        accountName: data.accountName,
        accountPhone: data.accountPhone,
      };
    }
  } catch (err) {
    console.warn('Server login fetch failed, falling back to Realtime Database/local storage:', err);
  }

  // 2. Try Firebase Realtime Database fallback directly
  try {
    const rtdbUser = await findUserInRTDB(cleanId);
    if (rtdbUser) {
      if (rtdbUser.password === cleanPass) {
        const localUsers = getStoredUsers();
        if (!localUsers.some(u => u.id === rtdbUser.id)) {
          saveUsers([...localUsers, rtdbUser]);
        }
        setCurrentUser(rtdbUser);
        const rtdbTxs = await loadTransactionsFromRTDB(rtdbUser.id);
        if (rtdbTxs.length > 0) {
          saveUserTransactions(rtdbUser.id, rtdbTxs);
        }
        return { success: true, user: rtdbUser };
      } else {
        return {
          success: false,
          found: true,
          accountName: rtdbUser.fullName || rtdbUser.username,
          accountPhone: rtdbUser.phone,
          error: `ພົບບັນຊີ "${rtdbUser.fullName}" ແຕ່ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ`,
        };
      }
    }
  } catch (err) {
    console.warn('Firebase RTDB fallback login error:', err);
  }

  // 3. Fallback to local storage verification
  return loginUser(cleanId, cleanPass);
}

// Reset Password / Forgot Password Remote (Works by Phone, Name, or Username)
export async function resetPasswordRemote(
  identifier: string,
  newPassword: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  const cleanId = identifier.trim();
  const cleanPass = newPassword.trim();

  // Sync to Firebase Realtime Database directly
  resetPasswordInRTDB(cleanId, cleanPass).catch(() => {});

  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: cleanId, newPassword: cleanPass }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        const updatedUser: User = data.user;
        const localUsers = getStoredUsers();
        const idx = localUsers.findIndex(u => u.id === updatedUser.id);
        if (idx >= 0) {
          localUsers[idx] = updatedUser;
          saveUsers(localUsers);
        } else {
          saveUsers([...localUsers, updatedUser]);
        }
        setCurrentUser(updatedUser);

        if (data.data) {
          if (Array.isArray(data.data.transactions)) saveUserTransactions(updatedUser.id, data.data.transactions);
          if (Array.isArray(data.data.categories)) saveUserCategories(updatedUser.id, data.data.categories);
          if (Array.isArray(data.data.accounts)) saveUserAccounts(updatedUser.id, data.data.accounts);
          if (Array.isArray(data.data.budgets)) saveUserBudgets(updatedUser.id, data.data.budgets);
          if (Array.isArray(data.data.recurring)) saveUserRecurring(updatedUser.id, data.data.recurring);
        }
        return { success: true, user: updatedUser };
      }
    } else {
      const errData = await res.json().catch(() => null);
      if (errData && errData.error) {
        return { success: false, error: errData.error };
      }
    }
  } catch (err) {
    console.warn('Server reset password fetch failed, checking local store:', err);
  }

  // Local fallback
  const users = getStoredUsers();
  const cleanLower = cleanId.toLowerCase();
  const user = users.find(u =>
    (u.username || '').toLowerCase() === cleanLower ||
    normalizePhone(u.phone) === normalizePhone(cleanId) ||
    (u.fullName || '').toLowerCase() === cleanLower
  );
  if (!user) {
    return { success: false, error: 'ບໍ່ພົບບັນຊີຈາກ ເບີໂທ ຫຼື ຊື່ ນີ້' };
  }
  user.password = cleanPass;
  saveUsers(users);
  setCurrentUser(user);
  return { success: true, user };
}

// Find account preview by Phone or Name
export async function findAccountRemote(
  identifier: string
): Promise<{ found: boolean; user?: Partial<User> }> {
  try {
    const res = await fetch(`/api/auth/find-account?identifier=${encodeURIComponent(identifier.trim())}`);
    if (res.ok) {
      const data = await res.json();
      return { found: !!data.found, user: data.user };
    }
  } catch {}

  // Check Firebase Realtime Database
  try {
    const rtdbUser = await findUserInRTDB(identifier);
    if (rtdbUser) {
      return {
        found: true,
        user: { fullName: rtdbUser.fullName, phone: rtdbUser.phone, username: rtdbUser.username },
      };
    }
  } catch {}

  const users = getStoredUsers();
  const q = identifier.trim().toLowerCase();
  const u = users.find(x =>
    (x.username || '').toLowerCase() === q ||
    normalizePhone(x.phone) === normalizePhone(q) ||
    (x.fullName || '').toLowerCase() === q
  );
  if (u) return { found: true, user: { fullName: u.fullName, phone: u.phone, username: u.username } };
  return { found: false };
}

// Sync user account profile to server and Realtime Database
export function syncUserProfileToServer(user: User): void {
  if (!user || !user.id) return;
  saveUserToRTDB(user).catch(() => {});
  try {
    fetch('/api/auth/sync-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user }),
    }).catch(() => {});
  } catch {}
}

// Sync all existing local users to server (ensures local users are recognized across devices)
export function syncAllLocalUsersToServer(): void {
  try {
    const users = getStoredUsers();
    users.forEach(user => {
      fetch('/api/auth/sync-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user }),
      }).catch(() => {});
    });
  } catch {}
}

// Automatically sync on module load
if (typeof window !== 'undefined') {
  setTimeout(() => {
    syncAllLocalUsersToServer();
  }, 500);
}

// Remote registration
export async function registerUserRemote(
  phone: string,
  username: string,
  fullName: string,
  pass: string
): Promise<{
  success: boolean;
  user?: User;
  error?: string;
  alreadyExists?: boolean;
  existingUser?: any;
}> {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, username, fullName, password: pass }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.success && data?.user) {
      const newUser: User = data.user;
      const users = getStoredUsers();
      saveUsers([...users, newUser]);
      setCurrentUser(newUser);
      initializeUserData(newUser.id, newUser.fullName);
      // Sync fresh starter data to RTDB and server
      saveUserToRTDB(newUser).catch(() => {});
      syncUserDataToServer(newUser.id);
      return { success: true, user: newUser };
    } else if (data) {
      return {
        success: false,
        error: data.error,
        alreadyExists: data.alreadyExists,
        existingUser: data.existingUser,
      };
    }
  } catch (err) {
    console.warn('Server register fetch failed, using local/RTDB registration:', err);
  }

  const localRes = registerUser(phone, username, fullName, pass);
  if (localRes.user) {
    saveUserToRTDB(localRes.user).catch(() => {});
    syncUserProfileToServer(localRes.user);
  }
  return localRes;
}

// Sync user data to server in background
export function syncUserDataToServer(userId: string): void {
  try {
    const user = getStoredUsers().find(u => u.id === userId);
    if (user) {
      syncUserProfileToServer(user);
    }

    const transactions = loadUserTransactions(userId);
    const categories = loadUserCategories(userId);
    const accounts = loadUserAccounts(userId);
    const budgets = loadUserBudgets(userId);
    const recurring = loadUserRecurring(userId);

    fetch('/api/user/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        transactions,
        categories,
        accounts,
        budgets,
        recurring,
      }),
    }).catch(() => {});
  } catch {}
}

export function registerUser(
  phone: string,
  username: string,
  fullName: string,
  pass: string
): { success: boolean; user?: User; error?: string } {
  const cleanPhone = phone.trim();
  const cleanUsername = username.trim().toLowerCase();
  const cleanFullName = fullName.trim() || username.trim();
  const cleanPass = pass.trim();

  if (!cleanPhone || cleanPhone.length < 6) {
    return { success: false, error: 'ກະລຸນາປ້ອນເບີໂທລະສັບທີ່ຖືກຕ້ອງ (ຢ່າງໜ້ອຍ 6 ຕົວເລກ).' };
  }

  if (!cleanUsername || cleanUsername.length < 2) {
    return { success: false, error: 'ກະລຸນາປ້ອນຊື່ຜູ້ໃຊ້ງານ (ຢ່າງໜ້ອຍ 2 ຕົວອັກສອນ).' };
  }

  if (!cleanPass || cleanPass.length < 3) {
    return { success: false, error: 'ກະລຸນາຕັ້ງລະຫັດຜ່ານຢ່າງໜ້ອຍ 3 ຕົວອັກສອນຂຶ້ນໄປ.' };
  }

  const users = getStoredUsers();
  const normPhone = normalizePhone(cleanPhone);

  // Check uniqueness
  const existsPhone = users.some(u => normalizePhone(u.phone) === normPhone);
  if (existsPhone) {
    return {
      success: false,
      error: 'ເບີໂທລະສັບນີ້ໄດ້ຖືກລົງທະບຽນໄວ້ແລ້ວ! ກະລຸນາເຂົ້າສູ່ລະບົບ.',
    };
  }

  const existsUsername = users.some(u => u.username.toLowerCase() === cleanUsername);
  if (existsUsername) {
    return {
      success: false,
      error: 'ຊື່ຜູ້ໃຊ້ນີ້ມີຄົນໃຊ້ແລ້ວ! ກະລຸນາເລືອກຊື່ຜູ້ໃຊ້ອື່ນ.',
    };
  }

  const avatarColors = ['#059669', '#2563eb', '#7c3aed', '#db2777', '#d97706', '#0891b2'];
  const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

  const newUser: User = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    username: cleanUsername,
    phone: cleanPhone,
    fullName: cleanFullName,
    password: cleanPass,
    avatarColor: randomColor,
    createdAt: Date.now(),
  };

  const updatedUsers = [...users, newUser];
  saveUsers(updatedUsers);
  setCurrentUser(newUser);

  // Initialize fresh isolated user data
  initializeUserData(newUser.id, cleanFullName);

  return { success: true, user: newUser };
}

// Storage helpers per user
export function getUserStorageKey(userId: string, keyName: string): string {
  return `lao_expense_${userId}_${keyName}_v2`;
}

export function loadUserTransactions(userId: string): Transaction[] {
  try {
    const raw = localStorage.getItem(getUserStorageKey(userId, 'txns'));
    if (raw) {
      let txns: Transaction[] = JSON.parse(raw);
      // Migration: Clean out any dummy test transactions (Project OPEC, Project OT, tx_1..tx_7)
      const cleanKey = `lao_expense_${userId}_clean_dummy_v5`;
      if (!localStorage.getItem(cleanKey)) {
        txns = txns.filter(t =>
          t.title !== 'Project OPEC' &&
          t.title !== 'Project OT' &&
          !['tx_1', 'tx_2', 'tx_3', 'tx_4', 'tx_5', 'tx_6', 'tx_7'].includes(t.id)
        );
        localStorage.setItem(cleanKey, 'true');
        localStorage.setItem(getUserStorageKey(userId, 'txns'), JSON.stringify(txns));
      }
      return txns;
    }
  } catch {}

  return [];
}

export function saveUserTransactions(userId: string, txns: Transaction[]): void {
  try {
    localStorage.setItem(getUserStorageKey(userId, 'txns'), JSON.stringify(txns));
    txns.forEach(tx => {
      saveTransactionToRTDB(userId, tx).catch(() => {});
    });
  } catch {}
}

export function loadUserCategories(userId: string) {
  try {
    const raw = localStorage.getItem(getUserStorageKey(userId, 'cats'));
    if (raw) return JSON.parse(raw);
  } catch {}
  const cats = DEFAULT_CATEGORIES.map(c => ({ ...c, userId }));
  saveUserCategories(userId, cats);
  return cats;
}

export function saveUserCategories(userId: string, cats: any[]): void {
  try {
    localStorage.setItem(getUserStorageKey(userId, 'cats'), JSON.stringify(cats));
    saveCategoriesToRTDB(userId, cats).catch(() => {});
  } catch {}
}

export function loadUserAccounts(userId: string): Account[] {
  try {
    const raw = localStorage.getItem(getUserStorageKey(userId, 'accs'));
    if (raw) {
      let accs: Account[] = JSON.parse(raw);
      // Migration: Reset preset starter balance (1,000,000, 200,000, 12,500,000, etc.) to 0
      // so balance starts at 0 until user enters their own money
      const resetKey = `lao_expense_${userId}_zero_init_bal_v5`;
      if (!localStorage.getItem(resetKey)) {
        accs = accs.map(a => {
          if (
            a.initialBalance === 1000000 ||
            a.initialBalance === 200000 ||
            a.initialBalance === 12500000 ||
            a.initialBalance === 1800000 ||
            a.initialBalance === 10000000
          ) {
            return { ...a, initialBalance: 0 };
          }
          return a;
        });
        localStorage.setItem(resetKey, 'true');
        saveUserAccounts(userId, accs);
      }
      return accs;
    }
  } catch {}
  const accs = DEFAULT_ACCOUNTS.map(a => ({ ...a, userId, initialBalance: 0 }));
  saveUserAccounts(userId, accs);
  return accs;
}

// Function to immediately reset all balances to 0 for a user
export function resetUserBalanceToZero(userId: string): { accounts: Account[]; transactions: Transaction[] } {
  try {
    const currentAccs = loadUserAccounts(userId);
    const zeroedAccs = currentAccs.map(a => ({ ...a, initialBalance: 0 }));
    saveUserAccounts(userId, zeroedAccs);
    saveUserTransactions(userId, []);
    syncUserDataToServer(userId);
    return { accounts: zeroedAccs, transactions: [] };
  } catch {
    return { accounts: [], transactions: [] };
  }
}

export function saveUserAccounts(userId: string, accs: Account[]): void {
  try {
    localStorage.setItem(getUserStorageKey(userId, 'accs'), JSON.stringify(accs));
    saveAccountsToRTDB(userId, accs).catch(() => {});
  } catch {}
}

export function loadUserBudgets(userId: string): Budget[] {
  try {
    const raw = localStorage.getItem(getUserStorageKey(userId, 'budgets'));
    if (raw) return JSON.parse(raw);
  } catch {}
  const budgets = DEFAULT_BUDGETS.map(b => ({ ...b, userId }));
  saveUserBudgets(userId, budgets);
  return budgets;
}

export function saveUserBudgets(userId: string, budgets: Budget[]): void {
  try {
    localStorage.setItem(getUserStorageKey(userId, 'budgets'), JSON.stringify(budgets));
    saveBudgetsToRTDB(userId, budgets).catch(() => {});
  } catch {}
}

export function loadUserRecurring(userId: string): RecurringTransaction[] {
  try {
    const raw = localStorage.getItem(getUserStorageKey(userId, 'recurring'));
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveUserRecurring(userId: string, items: RecurringTransaction[]): void {
  try {
    localStorage.setItem(getUserStorageKey(userId, 'recurring'), JSON.stringify(items));
  } catch {}
}

export function initializeUserData(userId: string, fullName: string): void {
  // Fresh starter data with 0 initial balance
  const starterAccs: Account[] = [
    {
      id: `acc_${userId}_bcel`,
      userId,
      nameLo: 'BCEL One (ບັນຊີຫຼັກ)',
      nameEn: 'BCEL One Main',
      type: 'bank',
      initialBalance: 0,
      currency: 'LAK',
      accountNumber: '010-12-0008899',
      color: '#2563eb',
    },
    {
      id: `acc_${userId}_cash`,
      userId,
      nameLo: 'ເງິນສົດຕິດກະເປົາ',
      nameEn: 'Cash in Wallet',
      type: 'cash',
      initialBalance: 0,
      currency: 'LAK',
      color: '#10b981',
    },
  ];

  saveUserAccounts(userId, starterAccs);
  saveUserCategories(userId, DEFAULT_CATEGORIES.map(c => ({ ...c, userId })));
  saveUserBudgets(userId, DEFAULT_BUDGETS.map(b => ({ ...b, userId })));
  saveUserTransactions(userId, []);
}
