import { Category, Account, Budget, Transaction, ExchangeRates } from '../types';

export const DEFAULT_EXCHANGE_RATES: ExchangeRates = {
  LAK: 1,
  THB: 640,
  USD: 22000,
};

export const DEFAULT_CATEGORIES: Category[] = [
  // Income categories
  { id: 'inc_salary', nameLo: 'ເງິນເດືອນຫຼັກ', nameEn: 'Primary Salary', type: 'income', icon: 'Briefcase', color: '#10b981' },
  { id: 'inc_business', nameLo: 'ຄ້າຂາຍ & ທຸລະກິດ', nameEn: 'Business & Sales', type: 'income', icon: 'TrendingUp', color: '#06b6d4' },
  { id: 'inc_bonus', nameLo: 'ໂບນັດ & ລາຍຮັບເສີມ', nameEn: 'Bonus & Freelance', type: 'income', icon: 'Award', color: '#8b5cf6' },
  { id: 'inc_investment', nameLo: 'ດອກເບ້ຍ & ການລົງທຶນ', nameEn: 'Investments', type: 'income', icon: 'DollarSign', color: '#3b82f6' },
  { id: 'inc_other', nameLo: 'ລາຍຮັບອື່ນໆ', nameEn: 'Other Income', type: 'income', icon: 'PlusCircle', color: '#14b8a6' },
  
  // Expense categories
  { id: 'exp_food', nameLo: 'ອາຫານ & ເຄື່ອງດື່ມ', nameEn: 'Food & Dining', type: 'expense', icon: 'Utensils', color: '#f97316' },
  { id: 'exp_fuel', nameLo: 'ການເດີນທາງ & ນ້ຳມັນ', nameEn: 'Transport & Fuel', type: 'expense', icon: 'Car', color: '#3b82f6' },
  { id: 'exp_utilities', nameLo: 'ຄ່ານ້ຳ-ຄ່າໄຟ-ເນັດ', nameEn: 'Utilities (EDL/Net)', type: 'expense', icon: 'Zap', color: '#eab308' },
  { id: 'exp_housing', nameLo: 'ທີ່ພັກອາໄສ & ຄ່າເຊົ່າ', nameEn: 'Housing & Rent', type: 'expense', icon: 'Home', color: '#6366f1' },
  { id: 'exp_shopping', nameLo: 'ຊື້ເຄື່ອງໃຊ້ & ຊັອບປິ້ງ', nameEn: 'Shopping', type: 'expense', icon: 'ShoppingBag', color: '#ec4899' },
  { id: 'exp_health', nameLo: 'ສຸຂະພາບ & ຢາ', nameEn: 'Healthcare', type: 'expense', icon: 'HeartPulse', color: '#ef4444' },
  { id: 'exp_social', nameLo: 'ງານບຸນ & ງານສັງຄົມ', nameEn: 'Social & Merit', type: 'expense', icon: 'Gift', color: '#a855f7' },
  { id: 'exp_entertainment', nameLo: 'ບັນເທີງ & ພັກຜ່ອນ', nameEn: 'Entertainment', type: 'expense', icon: 'Film', color: '#06b6d4' },
  { id: 'exp_education', nameLo: 'ການສຶກສາ & ຝຶກອົບຮົມ', nameEn: 'Education', type: 'expense', icon: 'GraduationCap', color: '#14b8a6' },
  { id: 'exp_other', nameLo: 'ລາຍຈ່າຍອື່ນໆ', nameEn: 'Other Expenses', type: 'expense', icon: 'MoreHorizontal', color: '#64748b' },
];

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'acc_bcel', nameLo: 'BCEL One (ບັນຊີຫຼັກ)', nameEn: 'BCEL One (Main)', type: 'bank', initialBalance: 0, currency: 'LAK', accountNumber: '010-12-0004589', color: '#2563eb' },
  { id: 'acc_cash', nameLo: 'ເງິນສົດຕິດໂຕ', nameEn: 'Cash in Wallet', type: 'cash', initialBalance: 0, currency: 'LAK', color: '#10b981' },
  { id: 'acc_savings', nameLo: 'ເງິນຝາກປະຢັດດອກເບ້ຍສູງ', nameEn: 'High-Yield Savings', type: 'savings', initialBalance: 0, currency: 'LAK', accountNumber: '010-88-9923145', color: '#8b5cf6' },
  { id: 'acc_jdb', nameLo: 'JDB Yes Account', nameEn: 'JDB Bank', type: 'bank', initialBalance: 0, currency: 'LAK', accountNumber: '109-33-001290', color: '#f59e0b' },
];

export const DEFAULT_BUDGETS: Budget[] = [
  { id: 'b_food', categoryId: 'exp_food', amount: 3500000, period: 'monthly' },
  { id: 'b_fuel', categoryId: 'exp_fuel', amount: 1500000, period: 'monthly' },
  { id: 'b_utilities', categoryId: 'exp_utilities', amount: 800000, period: 'monthly' },
  { id: 'b_shopping', categoryId: 'exp_shopping', amount: 2000000, period: 'monthly' },
  { id: 'b_social', categoryId: 'exp_social', amount: 1200000, period: 'monthly' },
  { id: 'b_entertainment', categoryId: 'exp_entertainment', amount: 1000000, period: 'monthly' },
];

// Generates dynamic dates relative to current date so demo data is always fresh and in the current month!
export const generateInitialTransactions = (): Transaction[] => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = now.getDate();

  const getDateStr = (offsetDays: number) => {
    const d = new Date(now);
    d.setDate(now.getDate() - offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayStr}`;
  };

  return [
    {
      id: 'tx_1',
      type: 'income',
      amount: 15000000,
      currency: 'LAK',
      amountInBase: 15000000,
      categoryId: 'inc_salary',
      accountId: 'acc_bcel',
      date: getDateStr(1),
      time: '08:30',
      title: 'ເງິນເດືອນປະຈຳເດືອນ (Company Salary)',
      note: 'ໂອນເຂົ້າຜ່ານລະບົບ Payroll ທະນາຄານການຄ້າ',
      createdAt: Date.now() - 86400000 * 1,
    },
    {
      id: 'tx_2',
      type: 'income',
      amount: 3500000,
      currency: 'LAK',
      amountInBase: 3500000,
      categoryId: 'inc_business',
      accountId: 'acc_bcel',
      date: getDateStr(2),
      time: '14:20',
      title: 'ລາຍຮັບຂາຍເຄື່ອງອອນລາຍ (Online Orders)',
      note: 'ລູກຄ້າໂອນ QR Code ຜ່ານ BCEL One',
      createdAt: Date.now() - 86400000 * 2,
    },
    {
      id: 'tx_3',
      type: 'expense',
      amount: 65000,
      currency: 'LAK',
      amountInBase: 65000,
      categoryId: 'exp_food',
      accountId: 'acc_cash',
      date: getDateStr(0),
      time: '12:15',
      title: 'ກິນເຂົ້າປຽກ ແລະ ກາເຟຕອນທ່ຽງ',
      note: 'ຮ້ານອາຫານໃກ້ຫ້ອງການ',
      createdAt: Date.now() - 3600000 * 4,
    },
    {
      id: 'tx_4',
      type: 'expense',
      amount: 450000,
      currency: 'LAK',
      amountInBase: 450000,
      categoryId: 'exp_fuel',
      accountId: 'acc_bcel',
      date: getDateStr(1),
      time: '17:45',
      title: 'ຕື່ມນ້ຳມັນລົດໃຫຍ່ ເຕັມຖັງ (PetroLao)',
      note: 'ນ້ຳມັນແອັດຊັງພິເສດ ປ້ຳໃຫຍ່',
      createdAt: Date.now() - 86400000 * 1 - 7200000,
    },
    {
      id: 'tx_5',
      type: 'expense',
      amount: 520000,
      currency: 'LAK',
      amountInBase: 520000,
      categoryId: 'exp_utilities',
      accountId: 'acc_bcel',
      date: getDateStr(3),
      time: '10:00',
      title: 'ຈ່າຍຄ່າໄຟຟ້າ EDL ປະຈຳເດືອນ',
      note: 'ຊຳລະຜ່ານ Bill Payment ໃນ BCEL One',
      createdAt: Date.now() - 86400000 * 3,
    },
    {
      id: 'tx_6',
      type: 'expense',
      amount: 280000,
      currency: 'LAK',
      amountInBase: 280000,
      categoryId: 'exp_utilities',
      accountId: 'acc_bcel',
      date: getDateStr(4),
      time: '11:30',
      title: 'ຄ່າອິນເຕີເນັດບ້ານ Fiber Unitel',
      note: 'ແພັກເກັດຄວາມໄວສູງ 50Mbps',
      createdAt: Date.now() - 86400000 * 4,
    },
    {
      id: 'tx_7',
      type: 'expense',
      amount: 480000,
      currency: 'LAK',
      amountInBase: 480000,
      categoryId: 'exp_food',
      accountId: 'acc_bcel',
      date: getDateStr(4),
      time: '19:30',
      title: 'ກິນເຂົ້າແລງນຳຄອບຄົວ ຮ້ານຊີ້ນດາດ',
      note: 'ຊີ້ນດາດແຄມຂອງ ວຽງຈັນ',
      createdAt: Date.now() - 86400000 * 4 - 3600000,
    },
    {
      id: 'tx_8',
      type: 'expense',
      amount: 350000,
      currency: 'LAK',
      amountInBase: 350000,
      categoryId: 'exp_shopping',
      accountId: 'acc_cash',
      date: getDateStr(5),
      time: '16:00',
      title: 'ຊື້ເຄື່ອງໃຊ້ໃນບ້ານ ຕະຫຼາດຊັ່ງຈ່ຽງ',
      note: 'ສະບູ່, ແຟບ, ເຄື່ອງຄົວ',
      createdAt: Date.now() - 86400000 * 5,
    },
    {
      id: 'tx_9',
      type: 'expense',
      amount: 500000,
      currency: 'LAK',
      amountInBase: 500000,
      categoryId: 'exp_social',
      accountId: 'acc_bcel',
      date: getDateStr(6),
      time: '18:00',
      title: 'ໃສ່ຊອງງານດອງເພື່ອນຮ່ວມງານ',
      note: 'ງານດອງ ທີ່ໂຮງແຮມລ້ານຊ້າງ',
      createdAt: Date.now() - 86400000 * 6,
    },
    {
      id: 'tx_10',
      type: 'transfer',
      amount: 3000000,
      currency: 'LAK',
      amountInBase: 3000000,
      categoryId: 'exp_other',
      accountId: 'acc_bcel',
      toAccountId: 'acc_savings',
      date: getDateStr(2),
      time: '09:00',
      title: 'ໂອນເງິນເຂົ້າບັນຊີເງິນຝາກປະຢັດ',
      note: 'ເງິນທ້ອນປະຈຳເດືອນ 20%',
      createdAt: Date.now() - 86400000 * 2,
    },
    {
      id: 'tx_11',
      type: 'expense',
      amount: 120000,
      currency: 'LAK',
      amountInBase: 120000,
      categoryId: 'exp_food',
      accountId: 'acc_cash',
      date: getDateStr(0),
      time: '15:10',
      title: 'ກາເຟ Amazon + ເຂົ້າໜົມ',
      note: 'Amazon ປ້ຳ ດົງໂດກ',
      createdAt: Date.now() - 3600000 * 1,
    }
  ];
};
