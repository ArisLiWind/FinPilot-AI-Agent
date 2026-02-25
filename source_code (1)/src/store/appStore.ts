import { create } from 'zustand';
import { parseGoalText, buildTrajectory, buildGoalWarning, ParsedGoalModel } from '../utils/goalParser';

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  timestamp: Date;
  auditId: string;
}

interface AppState {
  currentSavings: number;
  monthlyIncome: number;
  monthlyExpense: number;
  transactions: Transaction[];
  waterLevel: number;          // actual displayed level 0-1 (updated by canvas)
  targetWaterLevel: number;    // target level 0-1
  cupCapacity: number;         // 18000 yuan = full
  safeLevel: number;           // 0.25
  dangerLevel: number;         // 0.10

  // Alert state
  showAlert: boolean;
  alertMessage: string;

  // Block card state
  showBlockCard: boolean;
  pendingTransaction: Partial<Transaction> | null;
  blockCardMessage: string;
  blockCardSubMessage: string;
  /** "你说过..." goal-anchored warning — shown when goals are set */
  goalWarning: string | null;

  // Transaction modal
  showModal: boolean;
  showQuickMenu: boolean;

  // Pour event flags (read by WaterCup, reset after reading)
  pourEvent: { type: 'in' | 'out'; amount: number } | null;

  // Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  // ── Goal System ──────────────────────────────────────────────────────────
  /** Raw natural-language goal text written by user */
  goalText: string;
  /** Structured model parsed from goalText */
  parsedGoals: ParsedGoalModel;
  setGoalText: (text: string) => void;

  // Actions
  triggerIncome: (amount: number, description?: string) => void;
  triggerExpense: (amount: number, description?: string) => void;
  confirmTransaction: () => void;
  cancelTransaction: (alternative?: 'delay' | 'substitute') => void;
  dismissAlert: () => void;
  openModal: () => void;
  closeModal: () => void;
  toggleQuickMenu: () => void;
  setWaterLevel: (level: number) => void;
  clearPourEvent: () => void;
}

const INITIAL_SAVINGS = 12850;
const CUP_CAPACITY = 18000;

const DEFAULT_GOAL_TEXT = `月入 30k
攒到 100k
完成项目结款 5000 元`;

const defaultParsedGoals = parseGoalText(DEFAULT_GOAL_TEXT);

const initialTransactions: Transaction[] = [
  { id: '1', type: 'income',  amount: 8500, description: '工资',    category: '收入', timestamp: new Date(Date.now() - 86400000 * 2), auditId: 'A001' },
  { id: '2', type: 'expense', amount: 1200, description: '房租',    category: '住房', timestamp: new Date(Date.now() - 86400000 * 3), auditId: 'A002' },
  { id: '3', type: 'expense', amount: 380,  description: '餐饮',    category: '饮食', timestamp: new Date(Date.now() - 86400000 * 4), auditId: 'A003' },
  { id: '4', type: 'expense', amount: 220,  description: '交通',    category: '出行', timestamp: new Date(Date.now() - 86400000 * 5), auditId: 'A004' },
  { id: '5', type: 'income',  amount: 500,  description: '副业收入', category: '收入', timestamp: new Date(Date.now() - 86400000 * 6), auditId: 'A005' },
  { id: '6', type: 'expense', amount: 860,  description: '购物',    category: '购物', timestamp: new Date(Date.now() - 86400000 * 7), auditId: 'A006' },
];

export const useAppStore = create<AppState>((set, get) => ({
  currentSavings: INITIAL_SAVINGS,
  monthlyIncome: 8500,
  monthlyExpense: 3200,
  transactions: initialTransactions,
  waterLevel: INITIAL_SAVINGS / CUP_CAPACITY,
  targetWaterLevel: INITIAL_SAVINGS / CUP_CAPACITY,
  cupCapacity: CUP_CAPACITY,
  safeLevel: 0.25,
  dangerLevel: 0.10,

  showAlert: false,
  alertMessage: '',
  showBlockCard: false,
  pendingTransaction: null,
  blockCardMessage: '',
  blockCardSubMessage: '',
  goalWarning: null,
  showModal: false,
  showQuickMenu: false,
  pourEvent: null,

  theme: 'dark',
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

  // ── Goal System ──────────────────────────────────────────────────────────
  goalText: DEFAULT_GOAL_TEXT,
  parsedGoals: defaultParsedGoals,

  setGoalText: (text) => {
    const parsed = parseGoalText(text);
    set({ goalText: text, parsedGoals: parsed });
  },

  // ── Transactions ─────────────────────────────────────────────────────────
  triggerIncome: (amount, description = '收入') => {
    const state = get();
    const newSavings = state.currentSavings + amount;
    const newLevel = Math.min(1, newSavings / state.cupCapacity);
    const txn: Transaction = {
      id: Date.now().toString(),
      type: 'income',
      amount,
      description,
      category: '收入',
      timestamp: new Date(),
      auditId: `A${Date.now()}`,
    };
    set({
      currentSavings: newSavings,
      targetWaterLevel: newLevel,
      transactions: [txn, ...state.transactions],
      pourEvent: { type: 'in', amount },
    });
  },

  triggerExpense: (amount, description = '支出') => {
    const state = get();
    const newSavings = state.currentSavings - amount;
    const newLevel = Math.max(0, newSavings / state.cupCapacity);
    const currentLevel = state.targetWaterLevel;
    const monthsAfter = newSavings / (state.monthlyExpense || 1);
    const monthsBefore = state.currentSavings / (state.monthlyExpense || 1);

    // Build goal-anchored warning
    const trajectory = buildTrajectory(
      state.parsedGoals,
      state.currentSavings,
      state.monthlyIncome,
      state.monthlyExpense,
    );
    const goalWarning = buildGoalWarning(amount, state.goalText, trajectory);

    const pendingTxn: Partial<Transaction> = {
      id: Date.now().toString(),
      type: 'expense',
      amount,
      description,
      category: '支出',
      timestamp: new Date(),
      auditId: `A${Date.now()}`,
    };

    // Show block card if crosses safe line or already below it
    const willCrossOrBelow = newLevel < state.safeLevel;
    if (willCrossOrBelow) {
      set({
        showBlockCard: true,
        pendingTransaction: pendingTxn,
        blockCardMessage: `这笔消费将使你的应急金从 ${monthsBefore.toFixed(1)} 个月降到 ${monthsAfter.toFixed(1)} 个月`,
        blockCardSubMessage: `付款后余额 ¥${newSavings.toLocaleString()}，低于安全线`,
        goalWarning,
        pourEvent: { type: 'out', amount },
        // Preview the drop
        targetWaterLevel: newLevel,
        currentSavings: newSavings,
        transactions: [pendingTxn as Transaction, ...state.transactions],
      });
    } else {
      // Even outside safe-line, show a softer goal warning if goals are set
      set({
        currentSavings: newSavings,
        targetWaterLevel: newLevel,
        transactions: [pendingTxn as Transaction, ...state.transactions],
        pourEvent: { type: 'out', amount },
        ...(goalWarning
          ? {
              showBlockCard: true,
              pendingTransaction: pendingTxn,
              blockCardMessage: goalWarning.split('\n')[0] ?? '',
              blockCardSubMessage: goalWarning.split('\n').slice(1).join(' '),
              goalWarning,
            }
          : {}),
      });
    }

    // Check for alert if crosses safe line
    if (currentLevel >= state.safeLevel && newLevel < state.safeLevel) {
      setTimeout(() => {
        set({
          showAlert: true,
          alertMessage: '⚠️ 储蓄已跌破安全线，注意控制支出',
        });
      }, 500);
    }
  },

  confirmTransaction: () => {
    set({
      showBlockCard: false,
      pendingTransaction: null,
      goalWarning: null,
    });
  },

  cancelTransaction: () => {
    const state = get();
    if (!state.pendingTransaction) return;
    const txn = state.pendingTransaction as Transaction;
    // Reverse the transaction
    const restoredSavings = state.currentSavings + txn.amount;
    const restoredLevel = Math.min(1, restoredSavings / state.cupCapacity);
    set({
      showBlockCard: false,
      pendingTransaction: null,
      goalWarning: null,
      currentSavings: restoredSavings,
      targetWaterLevel: restoredLevel,
      transactions: state.transactions.filter(t => t.id !== txn.id),
      pourEvent: { type: 'in', amount: txn.amount }, // pour back in
    });
  },

  dismissAlert: () => set({ showAlert: false, alertMessage: '' }),
  openModal: () => set({ showModal: true }),
  closeModal: () => set({ showModal: false }),
  toggleQuickMenu: () => set((s) => ({ showQuickMenu: !s.showQuickMenu })),
  setWaterLevel: (level) => set({ waterLevel: level }),
  clearPourEvent: () => set({ pourEvent: null }),
}));
