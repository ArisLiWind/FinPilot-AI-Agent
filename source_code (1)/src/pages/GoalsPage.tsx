import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/appStore';
import { useTheme } from '../hooks/useTheme';
import { buildTrajectory } from '../utils/goalParser';

// ─────────────────────────────────────────────────────────────────────────────
// Signal chip: one extracted number with its context
// ─────────────────────────────────────────────────────────────────────────────
function SignalChip({ snippet, amount, type }: { snippet: string; amount: number; type: string }) {
  const c = useTheme();
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    savings:        { bg: 'rgba(56,189,248,0.10)', text: '#38BDF8', border: 'rgba(56,189,248,0.25)' },
    monthly_income: { bg: 'rgba(52,211,153,0.10)', text: '#34D399', border: 'rgba(52,211,153,0.25)' },
    short_term:     { bg: 'rgba(167,139,250,0.10)', text: '#A78BFA', border: 'rgba(167,139,250,0.25)' },
    general:        { bg: c.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', text: c.muted, border: c.cardBorder },
  };
  const col = colorMap[type] ?? colorMap.general;

  const fmtAmount = amount >= 10000
    ? `¥${(amount / 10000).toFixed(amount % 10000 === 0 ? 0 : 1)}万`
    : `¥${amount.toLocaleString()}`;

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: col.bg, border: `1px solid ${col.border}`, color: col.text }}
    >
      <span className="opacity-70 truncate max-w-[100px]">「{snippet}」</span>
      <span className="font-bold">{fmtAmount}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Trajectory metric card
// ─────────────────────────────────────────────────────────────────────────────
function MetricCard({
  label, value, sub, color, emphasis = false,
}: {
  label: string; value: string; sub?: string; color?: string; emphasis?: boolean;
}) {
  const c = useTheme();
  return (
    <div
      className="flex-1 rounded-2xl p-3.5"
      style={{
        background: emphasis
          ? (c.isDark ? 'rgba(56,189,248,0.08)' : 'rgba(56,189,248,0.06)')
          : c.card,
        border: `1px solid ${emphasis ? 'rgba(56,189,248,0.28)' : c.cardBorder}`,
        transition: 'background 0.4s ease',
      }}
    >
      <p className="text-[10px] uppercase tracking-wide font-medium mb-1" style={{ color: c.muted }}>{label}</p>
      <p className="text-xl font-bold leading-none" style={{ color: color ?? c.text }}>{value}</p>
      {sub && <p className="text-[11px] mt-1 leading-snug" style={{ color: c.muted }}>{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Impact scenario row
// ─────────────────────────────────────────────────────────────────────────────
function ImpactRow({
  icon, label, value, positive = false,
}: {
  icon: string; label: string; value: string; positive?: boolean;
}) {
  const c = useTheme();
  return (
    <div className="flex items-center justify-between py-2.5 border-b last:border-b-0" style={{ borderColor: c.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
      <div className="flex items-center gap-2.5">
        <span className="text-base">{icon}</span>
        <span className="text-sm" style={{ color: c.text }}>{label}</span>
      </div>
      <span
        className="text-sm font-bold"
        style={{ color: positive ? '#34D399' : '#F87171' }}
      >
        {value}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Goals Page
// ─────────────────────────────────────────────────────────────────────────────
export default function GoalsPage() {
  const { goalText, parsedGoals, setGoalText, currentSavings, monthlyIncome, monthlyExpense } = useAppStore();
  const c = useTheme();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localText, setLocalText] = useState(goalText);
  const [isSaved, setIsSaved] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [localText]);

  // Debounced auto-save to store
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (localText !== goalText) {
        setGoalText(localText);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 1800);
      }
    }, 600);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [localText, goalText, setGoalText]);

  // Build financial trajectory
  const trajectory = useMemo(
    () => buildTrajectory(parsedGoals, currentSavings, monthlyIncome, monthlyExpense),
    [parsedGoals, currentSavings, monthlyIncome, monthlyExpense],
  );

  const monthlyNet = monthlyIncome - monthlyExpense;
  const hasGoals = parsedGoals.signals.length > 0;
  const savingsGap = trajectory.primaryGoalAmount
    ? Math.max(0, trajectory.primaryGoalAmount - currentSavings)
    : null;

  // Impact scenario helpers
  const expenseScenario = 500; // illustrative monthly reduction
  const improvedNet = monthlyNet + expenseScenario;
  const improvedMonths =
    savingsGap !== null && improvedNet > 0 ? savingsGap / improvedNet : null;
  const currentMonths = trajectory.monthsToSavingsGoal;
  const gainDays = currentMonths !== null && improvedMonths !== null
    ? Math.round((currentMonths - improvedMonths) * 30)
    : null;

  const fmtMonths = (m: number | null) => {
    if (m === null || !isFinite(m) || m < 0) return '—';
    if (m < 1) return `${Math.round(m * 30)} 天`;
    return `${m.toFixed(1)} 个月`;
  };

  const fmtAmount = (n: number) =>
    n >= 10000 ? `¥${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 1)}万` : `¥${n.toLocaleString()}`;

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: c.pageBg, transition: 'background 0.4s ease' }}>

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-5 pt-12 pb-4">
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: c.muted }}>RichUp · 来财</p>
        <h1 className="text-2xl font-bold mt-0.5" style={{ color: c.text }}>自我约束</h1>
        <p className="text-sm mt-1 leading-relaxed" style={{ color: c.muted }}>
          用你自己的话写下财务目标 — 它们将成为你每一笔消费的约束
        </p>
      </div>

      {/* ── Goal Text Input ───────────────────────────────────── */}
      <div className="px-5 mb-5 flex-shrink-0">
        <div
          className="rounded-2xl overflow-hidden transition-all duration-200"
          style={{
            background: c.card,
            border: `1px solid ${isFocused ? 'rgba(56,189,248,0.5)' : c.cardBorder}`,
            boxShadow: isFocused
              ? '0 0 0 3px rgba(56,189,248,0.08), 0 4px 24px rgba(56,189,248,0.12)'
              : undefined,
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background 0.4s ease',
          }}
        >
          {/* Label row */}
          <div
            className="flex items-center justify-between px-4 pt-3.5 pb-2"
            style={{ borderBottom: `1px solid ${c.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}
          >
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: c.muted }}>
              我的目标
            </span>
            <AnimatePresence>
              {isSaved && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] font-medium"
                  style={{ color: '#34D399' }}
                >
                  ✓ 已保存
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={"例如：\n月入 30k\n攒到 100k\n完成项目结款 5000 元\n产品上线"}
            rows={4}
            className="w-full resize-none outline-none bg-transparent px-4 py-3 text-sm leading-relaxed"
            style={{
              color: c.text,
              caretColor: '#38BDF8',
              minHeight: '120px',
            }}
          />

          {/* Hint */}
          <div className="px-4 pb-3">
            <p className="text-[11px] leading-relaxed" style={{ color: c.isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)' }}>
              支持中文自然语言 · 带金额或不带均可 · 自动保存 · 这些话会出现在你消费时
            </p>
          </div>
        </div>
      </div>

      {/* ── Parsed Signals ────────────────────────────────────── */}
      <AnimatePresence>
        {hasGoals && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="px-5 mb-5 flex-shrink-0"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: c.muted }}>
              系统识别到
            </p>
            <div className="flex flex-wrap gap-2">
              {parsedGoals.signals.map((s, i) => (
                <SignalChip key={i} snippet={s.snippet} amount={s.amount} type={s.type} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Financial Trajectory ──────────────────────────────── */}
      <AnimatePresence>
        {hasGoals && trajectory.primaryGoalAmount && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.05 }}
            className="px-5 mb-5 flex-shrink-0"
          >
            {/* Section header */}
            <p className="text-[11px] font-semibold uppercase tracking-wide mb-2.5" style={{ color: c.muted }}>
              财务轨迹预测
            </p>

            {/* Core metrics */}
            <div className="flex gap-2.5 mb-2.5">
              <MetricCard
                label="距目标还差"
                value={savingsGap !== null ? fmtAmount(savingsGap) : '—'}
                sub={`目标 ${fmtAmount(trajectory.primaryGoalAmount!)}`}
                color="#38BDF8"
                emphasis
              />
              <MetricCard
                label="按当前速度"
                value={fmtMonths(currentMonths)}
                sub={`月净存 ¥${monthlyNet >= 0 ? monthlyNet.toLocaleString() : '...'}`}
                color={monthlyNet > 0 ? c.text : '#F87171'}
              />
            </div>

            {trajectory.targetMonthlyIncome && (
              <div className="flex gap-2.5">
                <MetricCard
                  label="月收入目标"
                  value={fmtAmount(trajectory.targetMonthlyIncome ?? 0)}
                  sub={`当前 ¥${monthlyIncome.toLocaleString()}`}
                  color="#A78BFA"
                />
                <MetricCard
                  label="达到目标后"
                  value={fmtMonths(trajectory.monthsToSavingsGoalOptimistic)}
                  sub="可提前完成"
                  color="#34D399"
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Behavior Impact Section ───────────────────────────── */}
      <AnimatePresence>
        {hasGoals && trajectory.primaryGoalAmount && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.1 }}
            className="px-5 mb-5 flex-shrink-0"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide mb-2.5" style={{ color: c.muted }}>
              行为影响因果
            </p>

            <div
              className="rounded-2xl px-4 py-1"
              style={{
                background: c.card,
                border: `1px solid ${c.cardBorder}`,
                transition: 'background 0.4s ease',
              }}
            >
              <ImpactRow
                icon="🔻"
                label={`若每月多花 ¥500`}
                value={currentMonths !== null ? `推迟 ${Math.round(expenseScenario / Math.max(monthlyNet / 30, 0.01))} 天` : '—'}
              />
              <ImpactRow
                icon="📉"
                label={`一次 ¥${(1000).toLocaleString()} 消费`}
                value={`推迟 ${trajectory.daysDelayedByExpense(1000)} 天`}
              />
              <ImpactRow
                icon="✂️"
                label={`控制月支出 -¥500`}
                value={gainDays !== null ? `提前 ${gainDays} 天` : '—'}
                positive
              />
              {trajectory.targetMonthlyIncome && trajectory.targetMonthlyIncome > monthlyIncome && (
                <ImpactRow
                  icon="📈"
                  label={`收入提升至 ${fmtAmount(trajectory.targetMonthlyIncome)}`}
                  value={`提前 ${currentMonths && improvedMonths ? Math.round((currentMonths - (trajectory.monthsToSavingsGoalOptimistic ?? currentMonths)) * 30) : 0} 天`}
                  positive
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Short-term goals ─────────────────────────────────── */}
      <AnimatePresence>
        {hasGoals && parsedGoals.shortTermGoals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.15 }}
            className="px-5 mb-5 flex-shrink-0"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide mb-2.5" style={{ color: c.muted }}>
              近期现金目标
            </p>
            <div className="space-y-2">
              {parsedGoals.shortTermGoals.map((g, i) => {
                const pct = Math.min(1, currentSavings / g.amount);
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="rounded-xl p-3.5"
                    style={{ background: c.card, border: `1px solid ${c.cardBorder}`, transition: 'background 0.4s ease' }}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium" style={{ color: c.text }}>{g.label}</span>
                      <span className="text-xs font-bold" style={{ color: '#A78BFA' }}>
                        {fmtAmount(g.amount)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: c.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct * 100}%` }}
                        transition={{ duration: 0.8, ease: [0.2, 0.9, 0.2, 1] }}
                        style={{ background: 'linear-gradient(90deg, #7C3AED, #A78BFA)' }}
                      />
                    </div>
                    <p className="text-[11px] mt-1.5" style={{ color: c.muted }}>
                      当前持有 {fmtAmount(currentSavings)} / {Math.round(pct * 100)}% 覆盖率
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Psychological anchor (empty state) ───────────────── */}
      <AnimatePresence>
        {!hasGoals && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-5 flex-shrink-0"
          >
            <div
              className="rounded-2xl p-6 text-center"
              style={{
                background: c.isDark ? 'rgba(56,189,248,0.05)' : 'rgba(56,189,248,0.04)',
                border: `1px dashed rgba(56,189,248,0.25)`,
              }}
            >
              <p className="text-3xl mb-3">✍️</p>
              <p className="text-sm font-medium mb-1" style={{ color: c.text }}>用你自己的话写下第一个目标</p>
              <p className="text-xs leading-relaxed" style={{ color: c.muted }}>
                写下来的话会成为你消费时的约束。<br />
                不是系统规则 — 是你自己说的话。
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Philosophy footer ─────────────────────────────────── */}
      <div className="px-5 pt-4 pb-28 flex-shrink-0">
        <div
          className="rounded-2xl p-4"
          style={{
            background: c.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
            border: `1px solid ${c.cardBorder}`,
          }}
        >
          <p className="text-xs italic text-center leading-relaxed" style={{ color: c.isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.3)' }}>
            "目标不是约束你的枷锁<br />是你对未来自己的承诺"
          </p>
        </div>
      </div>
    </div>
  );
}
