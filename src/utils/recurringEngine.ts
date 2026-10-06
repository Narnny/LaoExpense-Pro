import { RecurringTransaction, RecurringFrequency, Transaction, ExchangeRates } from '../types';

/**
 * Computes the next run date based on frequency.
 * Format: YYYY-MM-DD
 */
export function computeNextRunDate(dateStr: string, frequency: RecurringFrequency): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);

  switch (frequency) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly': {
      const targetMonth = d.getMonth() + 1;
      d.setMonth(targetMonth);
      // Handle day overflow (e.g. Jan 31 -> Feb 28)
      if (d.getMonth() > targetMonth % 12) {
        d.setDate(0);
      }
      break;
    }
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
  }

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayStr = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayStr}`;
}

/**
 * Checks all active recurring schedules and generates new transactions
 * if their nextRunDate <= today.
 */
export function processRecurringTransactions(
  recurringList: RecurringTransaction[],
  rates: ExchangeRates,
  todayStr: string = new Date().toISOString().slice(0, 10)
): {
  newTransactions: Transaction[];
  updatedRecurring: RecurringTransaction[];
  hasChanges: boolean;
} {
  const newTransactions: Transaction[] = [];
  let hasChanges = false;

  const updatedRecurring = recurringList.map((rec) => {
    if (!rec.active || !rec.autoPost) {
      return rec;
    }

    let currentNext = rec.nextRunDate;
    let lastRun = rec.lastRunDate;
    let isActive: boolean = rec.active;
    let itemChanged = false;

    // Advance and post until nextRunDate is in the future (max 60 iterations to prevent infinite loops)
    let iterations = 0;
    while (currentNext <= todayStr && (!rec.endDate || currentNext <= rec.endDate) && iterations < 60) {
      iterations++;
      itemChanged = true;
      hasChanges = true;

      // Calculate amount in base
      let amountInBase = rec.amount;
      if (rec.currency === 'THB') {
        amountInBase = Math.round(rec.amount * rates.THB);
      } else if (rec.currency === 'USD') {
        amountInBase = Math.round(rec.amount * rates.USD);
      }

      const tx: Transaction = {
        id: `tx_rec_${rec.id}_${currentNext.replace(/-/g, '')}_${iterations}`,
        userId: rec.userId,
        type: rec.type,
        amount: rec.amount,
        currency: rec.currency,
        amountInBase,
        categoryId: rec.categoryId,
        accountId: rec.accountId,
        date: currentNext,
        time: '08:00',
        title: rec.title,
        note: (rec.note ? rec.note + ' · ' : '') + `[ລາຍການປະຈຳ / Recurring ${rec.frequency}]`,
        createdAt: Date.now() + iterations,
      };

      newTransactions.push(tx);
      lastRun = currentNext;
      currentNext = computeNextRunDate(currentNext, rec.frequency);

      if (rec.endDate && currentNext > rec.endDate) {
        isActive = false;
        break;
      }
    }

    if (itemChanged) {
      return {
        ...rec,
        nextRunDate: currentNext,
        lastRunDate: lastRun,
        active: isActive,
      };
    }

    return rec;
  });

  return { newTransactions, updatedRecurring, hasChanges };
}

/**
 * Manually trigger a single execution of a recurring item right now
 */
export function triggerManualRecurringRun(
  rec: RecurringTransaction,
  rates: ExchangeRates,
  todayStr: string = new Date().toISOString().slice(0, 10)
): {
  newTx: Transaction;
  updatedRec: RecurringTransaction;
} {
  let amountInBase = rec.amount;
  if (rec.currency === 'THB') {
    amountInBase = Math.round(rec.amount * rates.THB);
  } else if (rec.currency === 'USD') {
    amountInBase = Math.round(rec.amount * rates.USD);
  }

  const tx: Transaction = {
    id: `tx_manrec_${rec.id}_${Date.now()}`,
    userId: rec.userId,
    type: rec.type,
    amount: rec.amount,
    currency: rec.currency,
    amountInBase,
    categoryId: rec.categoryId,
    accountId: rec.accountId,
    date: todayStr,
    time: new Date().toTimeString().slice(0, 5),
    title: rec.title,
    note: (rec.note ? rec.note + ' · ' : '') + `[ລາຍການປະຈຳ / Recurring ${rec.frequency} - ປະມວນຜົນທັນທີ]`,
    createdAt: Date.now(),
  };

  const nextRun = computeNextRunDate(rec.nextRunDate, rec.frequency);
  const updatedRec: RecurringTransaction = {
    ...rec,
    lastRunDate: todayStr,
    nextRunDate: nextRun,
    active: rec.endDate && nextRun > rec.endDate ? false : rec.active,
  };

  return { newTx: tx, updatedRec };
}

export function formatFrequency(frequency: RecurringFrequency, lang: 'lo' | 'en'): string {
  const map: Record<RecurringFrequency, { lo: string; en: string }> = {
    daily: { lo: 'ປະຈຳວັນ', en: 'Daily' },
    weekly: { lo: 'ປະຈຳອາທິດ', en: 'Weekly' },
    monthly: { lo: 'ປະຈຳເດືອນ', en: 'Monthly' },
    yearly: { lo: 'ປະຈຳປີ', en: 'Yearly' },
  };
  return map[frequency] ? map[frequency][lang] : frequency;
}

export function getDaysUntil(dateStr: string, todayStr: string = new Date().toISOString().slice(0, 10)): number {
  const d1 = new Date(todayStr).getTime();
  const d2 = new Date(dateStr).getTime();
  return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
}
