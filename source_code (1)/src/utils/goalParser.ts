/**
 * goalParser.ts
 * Extracts structured financial signals from natural-language goal text.
 * Pure regex + keyword matching — no LLM required.
 *
 * SAFE VERSION: Uses regex literals, all functions wrapped in try-catch.
 */

export interface ParsedGoalModel {
  savingsGoal: number | null;
  targetMonthlyIncome: number | null;
  shortTermGoals: Array<{ label: string; amount: number }>;
  signals: Array<{ snippet: string; amount: number; type: GoalSignalType }>;
}

export type GoalSignalType = 'savings' | 'monthly_income' | 'short_term' | 'general';

// ---------------------------------------------------------------------------
// Number normaliser  "30k" → 30000  "3万" → 30000  "100K" → 100000
// ---------------------------------------------------------------------------
function normalise(raw: string): number {
  try {
    const clean = raw.replace(/[¥￥\s,]/g, '');
    const m = clean.match(/^(\d+(?:\.\d+)?)\s*([kKwW万千百]?)$/);
    if (!m) return NaN;
    const num = parseFloat(m[1]);
    if (isNaN(num)) return NaN;
    switch (m[2]) {
      case 'k': case 'K': return num * 1000;
      case 'w': case 'W': case '万': return num * 10000;
      case '千': return num * 1000;
      case '百': return num * 100;
      default: return num;
    }
  } catch {
    return NaN;
  }
}

// ---------------------------------------------------------------------------
// Regex literals — avoids any new RegExp() construction at module level
// ---------------------------------------------------------------------------

// Savings: 攒到100k, 存到100k, 攒够100k, 积累100k
const RE_SAVINGS = /(?:攒到|存到|存够|攒够|积累|储蓄达到|储蓄目标|存下)\s*(?:[¥￥]\s*)?(\d+(?:\.\d+)?(?:\s*[kKwW万千百])?)/g;

// Monthly income: 月入30k, 月收入3万, 月薪30k
const RE_INCOME = /(?:月入|月收入|月薪|月工资)\s*(?:[¥￥]\s*)?(\d+(?:\.\d+)?(?:\s*[kKwW万千百])?)/g;

// Short-term cash: 结款5000, 到账5000, 收款5000
const RE_SHORT = /(结款|到账|收款|回款|项目款|尾款|定金)\s*(?:[¥￥]\s*)?(\d+(?:\.\d+)?(?:\s*[kKwW万千百])?)/g;

// Fallback: ¥5000 or 5000元
const RE_FALLBACK = /[¥￥](\d+(?:\.\d+)?(?:[kKwW万千百])?)|((?<!\d)(\d+(?:\.\d+)?)\s*元)/g;

// ---------------------------------------------------------------------------
export function parseGoalText(text: string): ParsedGoalModel {
  const empty: ParsedGoalModel = { savingsGoal: null, targetMonthlyIncome: null, shortTermGoals: [], signals: [] };
  if (!text || !text.trim()) return empty;

  try {
    const signals: ParsedGoalModel['signals'] = [];
    const shortTermGoals: ParsedGoalModel['shortTermGoals'] = [];
    let savingsGoal: number | null = null;
    let targetMonthlyIncome: number | null = null;

    // ── Savings ────────────────────────────────────────────────────────────
    RE_SAVINGS.lastIndex = 0;
    {
      let m: RegExpExecArray | null;
      while ((m = RE_SAVINGS.exec(text)) !== null) {
        const amount = normalise(m[1] ?? '');
        if (!isNaN(amount) && amount > 0) {
          savingsGoal = Math.max(savingsGoal ?? 0, amount);
          signals.push({ snippet: m[0].trim(), amount, type: 'savings' });
        }
      }
    }

    // ── Monthly income ─────────────────────────────────────────────────────
    RE_INCOME.lastIndex = 0;
    {
      let m: RegExpExecArray | null;
      while ((m = RE_INCOME.exec(text)) !== null) {
        const amount = normalise(m[1] ?? '');
        if (!isNaN(amount) && amount > 0) {
          targetMonthlyIncome = Math.max(targetMonthlyIncome ?? 0, amount);
          signals.push({ snippet: m[0].trim(), amount, type: 'monthly_income' });
        }
      }
    }

    // ── Short-term ─────────────────────────────────────────────────────────
    RE_SHORT.lastIndex = 0;
    {
      let m: RegExpExecArray | null;
      while ((m = RE_SHORT.exec(text)) !== null) {
        const amount = normalise(m[2] ?? '');
        if (!isNaN(amount) && amount > 0) {
          const label = m[1] ?? '短期收款';
          shortTermGoals.push({ label, amount });
          signals.push({ snippet: m[0].trim(), amount, type: 'short_term' });
        }
      }
    }

    // ── Fallback ───────────────────────────────────────────────────────────
    RE_FALLBACK.lastIndex = 0;
    {
      let fm: RegExpExecArray | null;
      const matchedTexts = new Set(signals.map(s => s.snippet));
      while ((fm = RE_FALLBACK.exec(text)) !== null) {
        const rawNum = fm[1] ?? fm[3];
        if (!rawNum) continue;
        const amount = normalise(rawNum);
        if (isNaN(amount) || amount <= 0) continue;
        const snippet = fm[0].trim();
        // Skip if already captured
        if (matchedTexts.has(snippet)) continue;
        // Skip if snippet overlaps with any existing signal snippet
        const overlaps = signals.some(s => s.snippet.includes(snippet) || snippet.includes(s.snippet));
        if (!overlaps) {
          signals.push({ snippet, amount, type: 'general' });
        }
      }
    }

    return { savingsGoal, targetMonthlyIncome, shortTermGoals, signals };
  } catch {
    return empty;
  }
}

// ---------------------------------------------------------------------------
// Financial trajectory helpers
// ---------------------------------------------------------------------------

export interface FinancialTrajectory {
  monthsToSavingsGoal: number | null;
  monthsToSavingsGoalOptimistic: number | null;
  daysDelayedByExpense: (expenseAmount: number) => number;
  primaryGoalText: string | null;
  primaryGoalAmount: number | null;
  /** target monthly income parsed from goals */
  targetMonthlyIncome: number | null;
}

export function buildTrajectory(
  model: ParsedGoalModel,
  currentSavings: number,
  monthlyIncome: number,
  monthlyExpense: number,
): FinancialTrajectory {
  try {
    const monthlyNet = monthlyIncome - monthlyExpense;
    const safeNet = Math.max(monthlyNet, 1);

    const primaryGoalAmount = model.savingsGoal;
    const primaryGoalText = primaryGoalAmount
      ? `攒到 ¥${primaryGoalAmount >= 10000
          ? (primaryGoalAmount / 10000).toFixed(primaryGoalAmount % 10000 === 0 ? 0 : 1) + '万'
          : primaryGoalAmount.toLocaleString()}`
      : null;

    const gap = primaryGoalAmount !== null ? Math.max(0, primaryGoalAmount - currentSavings) : null;
    const monthsToSavingsGoal = gap !== null ? gap / safeNet : null;

    const optimisticNet = model.targetMonthlyIncome
      ? Math.max(model.targetMonthlyIncome - monthlyExpense, 1)
      : safeNet;
    const monthsToSavingsGoalOptimistic = gap !== null ? gap / optimisticNet : null;

    const daysDelayedByExpense = (expenseAmount: number): number => {
      if (gap === null || gap <= 0) return 0;
      const dailyNet = safeNet / 30;
      return Math.round(expenseAmount / Math.max(dailyNet, 0.01));
    };

    return {
      monthsToSavingsGoal,
      monthsToSavingsGoalOptimistic,
      daysDelayedByExpense,
      primaryGoalText,
      primaryGoalAmount,
      targetMonthlyIncome: model.targetMonthlyIncome,
    };
  } catch {
    return {
      monthsToSavingsGoal: null,
      monthsToSavingsGoalOptimistic: null,
      daysDelayedByExpense: () => 0,
      primaryGoalText: null,
      primaryGoalAmount: null,
      targetMonthlyIncome: null,
    };
  }
}

// ---------------------------------------------------------------------------
// "你说过..." intervention message
// ---------------------------------------------------------------------------
export function buildGoalWarning(
  expenseAmount: number,
  goalText: string,
  trajectory: FinancialTrajectory,
): string | null {
  try {
    if (!trajectory.primaryGoalText || !goalText.trim()) return null;
    const days = trajectory.daysDelayedByExpense(expenseAmount);
    if (days <= 0) return null;

    const lines = goalText.split('\n').map(l => l.trim()).filter(Boolean);
    const savingsLine =
      lines.find(l => /攒|存|储蓄|积累/.test(l)) ??
      lines.find(l => /月入|月薪|收入/.test(l)) ??
      lines[0] ??
      trajectory.primaryGoalText;

    return `你说过：「${savingsLine}」\n这笔 ¥${expenseAmount.toLocaleString()} 会让你晚 ${days} 天实现目标。`;
  } catch {
    return null;
  }
}
