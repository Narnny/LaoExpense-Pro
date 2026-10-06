import { Currency, ExchangeRates, Language, Transaction, Category, Account } from '../types';

export const formatCurrency = (amount: number, currency: Currency = 'LAK'): string => {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  let formattedNumber = '';
  if (currency === 'LAK') {
    formattedNumber = Math.round(absAmount).toLocaleString('en-US');
    return `${isNegative ? '-' : ''}${formattedNumber} ₭`;
  } else if (currency === 'THB') {
    formattedNumber = absAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return `${isNegative ? '-' : ''}฿ ${formattedNumber}`;
  } else {
    // USD
    formattedNumber = absAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${isNegative ? '-' : ''}$ ${formattedNumber}`;
  }
};

export const convertCurrency = (
  amount: number,
  from: Currency,
  to: Currency,
  rates: ExchangeRates
): number => {
  if (from === to) return amount;
  // Convert from source to LAK base first
  let amountInLAK = amount;
  if (from === 'THB') {
    amountInLAK = amount * rates.THB;
  } else if (from === 'USD') {
    amountInLAK = amount * rates.USD;
  }

  // Convert from LAK base to target
  if (to === 'LAK') return amountInLAK;
  if (to === 'THB') return amountInLAK / rates.THB;
  if (to === 'USD') return amountInLAK / rates.USD;

  return amountInLAK;
};

const LAO_MONTHS = [
  'ມັງກອນ', 'ກຸມພາ', 'ມີນາ', 'ເມສາ', 'ພຶດສະພາ', 'ມິຖຸນາ',
  'ກໍລະກົດ', 'ສິງຫາ', 'ກັນຍາ', 'ຕຸລາ', 'ພະຈິກ', 'ທັນວາ'
];

const EN_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const formatDate = (dateStr: string, lang: Language = 'lo'): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;

  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  if (lang === 'lo') {
    return `${day} ${LAO_MONTHS[monthIdx] || ''} ${year}`;
  } else {
    return `${EN_MONTHS[monthIdx] || ''} ${day}, ${year}`;
  }
};

export const formatRelativeTime = (timestamp: number, lang: Language = 'lo'): string => {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  
  if (diffSec < 60) {
    return lang === 'lo' ? 'ຫາກໍ່ລົງ' : 'Just now';
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return lang === 'lo' ? `${diffMin} ນາທີກ່ອນ` : `${diffMin}m ago`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return lang === 'lo' ? `${diffHours} ຊົ່ວໂມງກ່ອນ` : `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return lang === 'lo' ? `${diffDays} ມື້ກ່ອນ` : `${diffDays}d ago`;
};

export const exportTransactionsToCSV = (
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[],
  lang: Language = 'lo'
) => {
  const catMap = new Map(categories.map(c => [c.id, lang === 'lo' ? c.nameLo : c.nameEn]));
  const accMap = new Map(accounts.map(a => [a.id, lang === 'lo' ? a.nameLo : a.nameEn]));

  const headers = lang === 'lo'
    ? ['ວັນທີ', 'ເວລາ', 'ປະເພດ', 'ຫົວຂໍ້', 'ໝວດໝູ່', 'ບັນຊີ', 'ຈຳນວນເງິນ', 'ສະກຸນເງິນ', 'ມູນຄ່າກີບ (LAK)', 'ໝາຍເຫດ']
    : ['Date', 'Time', 'Type', 'Title', 'Category', 'Account', 'Amount', 'Currency', 'Amount in LAK', 'Notes'];

  const rows = transactions.map(t => {
    const typeLabel = t.type === 'income' ? (lang === 'lo' ? 'ລາຍຮັບ' : 'Income') :
                     t.type === 'expense' ? (lang === 'lo' ? 'ລາຍຈ່າຍ' : 'Expense') :
                     (lang === 'lo' ? 'ໂອນເງິນ' : 'Transfer');
    
    return [
      t.date,
      t.time,
      typeLabel,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${catMap.get(t.categoryId) || ''}"`,
      `"${accMap.get(t.accountId) || ''}"`,
      t.amount,
      t.currency,
      t.amountInBase,
      `"${(t.note || '').replace(/"/g, '""')}"`,
    ];
  });

  // UTF-8 BOM (\uFEFF) so Excel respects Lao and UTF-8 characters without corruption
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `LaoExpense_Export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
