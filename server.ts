import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.resolve(__dirname, 'data', 'app-database.json');

// Ensure data directory exists
const dataDir = path.dirname(DB_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

interface ServerDB {
  users: Array<{
    id: string;
    username: string;
    phone: string;
    fullName: string;
    password: string;
    avatarColor: string;
    createdAt: number;
  }>;
  userData: Record<string, {
    transactions?: any[];
    categories?: any[];
    accounts?: any[];
    budgets?: any[];
    recurring?: any[];
    updatedAt?: number;
  }>;
}

function readDB(): ServerDB {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        userData: parsed.userData && typeof parsed.userData === 'object' ? parsed.userData : {},
      };
    }
  } catch (err) {
    console.error('Error reading DB:', err);
  }
  return { users: [], userData: {} };
}

function writeDB(data: ServerDB) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing DB:', err);
  }
}

app.use(express.json({ limit: '15mb' }));

// Smart Phone matcher for Lao phone numbers (handles 020, 20, +856 20, spacing, dashes)
function matchPhones(p1?: string, p2?: string): boolean {
  if (!p1 || !p2) return false;
  const d1 = p1.replace(/\D/g, '');
  const d2 = p2.replace(/\D/g, '');
  if (!d1 || !d2) return false;
  if (d1 === d2) return true;
  // Match last 8 digits (standard Lao mobile tail e.g. 77889900)
  const tail1 = d1.slice(-8);
  const tail2 = d2.slice(-8);
  if (tail1.length >= 7 && tail1 === tail2) return true;
  return false;
}

// Flexible User Finder: by Phone, Username, or Full Name
function findUserByIdentifier(users: ServerDB['users'], identifier: string) {
  if (!identifier) return null;
  const rawQuery = identifier.trim();
  const queryLower = rawQuery.toLowerCase();

  return users.find(u => {
    // 1. Phone number match
    if (matchPhones(u.phone, rawQuery)) return true;
    // 2. Exact username match (case-insensitive)
    if (u.username.toLowerCase() === queryLower) return true;
    // 3. Exact full name match (case-insensitive)
    if (u.fullName.toLowerCase() === queryLower) return true;
    // 4. Substring full name match if query is at least 3 chars
    if (queryLower.length >= 3 && u.fullName.toLowerCase().includes(queryLower)) return true;
    return false;
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Check/Find account by Name or Phone (for Forgot Password verification)
app.get('/api/auth/find-account', (req, res) => {
  const identifier = (req.query.identifier as string) || '';
  if (!identifier.trim()) {
    return res.status(400).json({ success: false, error: 'Missing identifier' });
  }

  const db = readDB();
  const user = findUserByIdentifier(db.users, identifier);
  if (!user) {
    return res.json({ success: true, found: false });
  }

  return res.json({
    success: true,
    found: true,
    user: {
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      username: user.username,
      avatarColor: user.avatarColor,
    },
  });
});

// Register User
app.post('/api/auth/register', (req, res) => {
  const { phone, username, fullName, password, avatarColor } = req.body;
  if (!phone || !username || !password) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const db = readDB();
  const cleanPhone = phone.trim();
  const cleanUsername = username.trim().toLowerCase();

  // Check uniqueness by phone or username
  const existing = db.users.find(
    u => matchPhones(u.phone, cleanPhone) || u.username.toLowerCase() === cleanUsername
  );
  if (existing) {
    const error = matchPhones(existing.phone, cleanPhone)
      ? 'ເບີໂທລະສັບນີ້ໄດ້ລົງທະບຽນແລ້ວ (Phone number already registered)'
      : 'ຊື່ຜູ້ໃຊ້ນີ້ມີຄົນໃຊ້ແລ້ວ (Username already taken)';
    return res.status(409).json({ success: false, error });
  }

  const colors = ['#2563eb', '#059669', '#7c3aed', '#db2777', '#ea580c', '#0891b2', '#10b981'];
  const user = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    username: cleanUsername,
    phone: cleanPhone,
    fullName: fullName ? fullName.trim() : username.trim(),
    password: password.trim(),
    avatarColor: avatarColor || colors[Math.floor(Math.random() * colors.length)],
    createdAt: Date.now(),
  };

  db.users.push(user);
  writeDB(db);

  return res.json({ success: true, user });
});

// Login User (Works from ANY device or machine using Phone, Username, or Name)
app.post('/api/auth/login', (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ success: false, error: 'Missing identifier or password' });
  }

  const db = readDB();
  const user = findUserByIdentifier(db.users, identifier);

  if (!user || user.password !== password.trim()) {
    return res.status(401).json({
      success: false,
      error: 'ເບີໂທ, ຊື່ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ (Invalid credentials)',
    });
  }

  // Send back user and any existing synced data
  const userData = db.userData[user.id] || null;

  return res.json({
    success: true,
    user,
    data: userData,
  });
});

// Forgot Password / Reset Password (by Name or Phone)
app.post('/api/auth/reset-password', (req, res) => {
  const { identifier, newPassword } = req.body;
  if (!identifier || !newPassword) {
    return res.status(400).json({
      success: false,
      error: 'ກະລຸນາປ້ອນຊື່/ເບີໂທ ແລະ ລະຫັດຜ່ານໃໝ່ໃຫ້ຄົບຖ້ວນ',
    });
  }

  if (newPassword.trim().length < 3) {
    return res.status(400).json({
      success: false,
      error: 'ລະຫັດຜ່ານໃໝ່ຕ້ອງມີຢ່າງໜ້ອຍ 3 ຕົວອັກສອນ',
    });
  }

  const db = readDB();
  const user = findUserByIdentifier(db.users, identifier);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'ບໍ່ພົບບັນຊີຈາກ ເບີໂທ, ຊື່ຜູ້ໃຊ້ ຫຼື ຊື່ ນີ້ໃນລະບົບ (Account not found)',
    });
  }

  user.password = newPassword.trim();
  writeDB(db);

  const userData = db.userData[user.id] || null;

  return res.json({
    success: true,
    message: `ຕັ້ງລະຫັດຜ່ານໃໝ່ສຳເລັດສຳລັບບັນຊີ ${user.fullName}!`,
    user,
    data: userData,
  });
});

// Sync user account profile (ensures user is saved in db.users from any active device)
app.post('/api/auth/sync-user', (req, res) => {
  const { user } = req.body;
  if (!user || !user.id || !user.password) {
    return res.status(400).json({ success: false, error: 'Invalid user payload' });
  }

  const db = readDB();
  const idx = db.users.findIndex(u => u.id === user.id);
  if (idx >= 0) {
    db.users[idx] = { ...db.users[idx], ...user };
  } else {
    // Also check if phone or username exists to avoid duplicates
    const dupIdx = db.users.findIndex(
      u => matchPhones(u.phone, user.phone) || u.username.toLowerCase() === user.username.toLowerCase()
    );
    if (dupIdx >= 0) {
      db.users[dupIdx] = { ...db.users[dupIdx], ...user };
    } else {
      db.users.push(user);
    }
  }
  writeDB(db);

  return res.json({ success: true });
});

// Fetch user data
app.get('/api/user/data', (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'Missing userId' });
  }
  const db = readDB();
  const data = db.userData[userId] || null;
  res.json({ success: true, data });
});

// Sync user financial data to server
app.post('/api/user/sync', (req, res) => {
  const { userId, transactions, categories, accounts, budgets, recurring } = req.body;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'Missing userId' });
  }

  const db = readDB();
  db.userData[userId] = {
    transactions,
    categories,
    accounts,
    budgets,
    recurring,
    updatedAt: Date.now(),
  };
  writeDB(db);

  res.json({ success: true });
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`LaoExpense Pro Server running on port ${PORT}`);
  });
}

startServer();
