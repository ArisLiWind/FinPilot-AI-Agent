import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WaterCup, WaterCupHandle } from '../components/WaterCup';
import { useAppStore } from '../store/appStore';
import { useTheme } from '../hooks/useTheme';

export default function PoolPage() {
  const cupRef = useRef<WaterCupHandle>(null);
  const {
    currentSavings,
    monthlyIncome,
    monthlyExpense,
    targetWaterLevel,
    safeLevel,
    dangerLevel,
    setWaterLevel,
    showAlert,
    alertMessage,
    dismissAlert,
    triggerIncome,
    triggerExpense,
    pourEvent,
    clearPourEvent,
  } = useAppStore();
  const c = useTheme();

  const [lastAction, setLastAction] = useState<string | null>(null);

  // Sync pour events to canvas
  useEffect(() => {
    if (!pourEvent || !cupRef.current) return;
    const normalizedAmount = pourEvent.amount / 18000;
    if (pourEvent.type === 'in') {
      cupRef.current.pourIn(normalizedAmount);
    } else {
      cupRef.current.pourOut(normalizedAmount);
    }
    clearPourEvent();
  }, [pourEvent, clearPourEvent]);

  const handleIncome = (amount: number, label: string) => {
    triggerIncome(amount, label);
    setLastAction(`+¥${amount.toLocaleString()} ${label}`);
  };

  const handleExpense = (amount: number, label: string) => {
    triggerExpense(amount, label);
    setLastAction(`-¥${amount.toLocaleString()} ${label}`);
  };

  const savingsLevel = currentSavings / 18000;
  const monthsEmergency = (currentSavings / monthlyExpense).toFixed(1);
  const isBelowSafe = savingsLevel < safeLevel;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-10 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide uppercase" style={{ color: c.muted }}>RichUp · 来财</p>
            <h1 className="text-2xl font-bold mt-0.5" style={{ color: c.text }}>现金流水池</h1>
          </div>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: c.accent, border: `1px solid ${c.accentBorder}` }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#93C5FD" strokeWidth="1.8" className="w-5 h-5">
              <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
      {/* Alert banner */}
      <AnimatePresence>
        {showAlert && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-5 mb-2 rounded-xl px-4 py-2.5 flex items-center justify-between flex-shrink-0"
            style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.4)',
              boxShadow: '0 0 20px rgba(239,68,68,0.2)',
            }}
          >
            <p className="text-sm" style={{ color: '#FCA5A5' }}>{alertMessage}</p>
            <button onClick={dismissAlert} style={{ color: c.muted }} className="ml-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Main savings number */}
      <div className="flex-shrink-0 px-5 mb-2">
        <div className="flex items-baseline gap-2">
          <span className="text-sm" style={{ color: c.muted }}>当前储蓄</span>
          <motion.span
            key={currentSavings}
            className="text-4xl font-bold tracking-tight"
            style={{ color: isBelowSafe ? '#EF4444' : c.text }}
            initial={{ opacity: 0.6, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            ¥{currentSavings.toLocaleString()}
          </motion.span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs" style={{ color: c.muted }}>应急金 {monthsEmergency} 个月</span>
          {isBelowSafe && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(239,68,68,0.2)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              ⚠ 低于安全线
            </span>
          )}
        </div>
      </div>
      {/* Water Cup - main visual (fixed reasonable size) */}
      <div className="flex justify-center py-2 flex-shrink-0">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.2, 0.9, 0.2, 1] }}
          style={{ width: 190, height: 290 }}
        >
          <WaterCup
            ref={cupRef}
            targetWaterLevel={targetWaterLevel}
            safeLevel={safeLevel}
            dangerLevel={dangerLevel}
            onWaterLevelChange={setWaterLevel}
            className="w-full h-full"
          />
        </motion.div>
      </div>
      {/* Stats row */}
      <div className="flex-shrink-0 px-5 mb-3">
        <div className="grid grid-cols-2 gap-3">
          <div
            className="rounded-2xl px-4 py-3"
            style={{ background: c.accent, border: `1px solid ${c.accentBorder}`, transition: 'background 0.4s ease' }}
          >
            <p className="text-xs mb-1" style={{ color: c.muted }}>本月收入</p>
            <p className="font-bold text-lg" style={{ color: c.text }}>
              <span className="text-green-400 text-sm mr-1">↑</span>
              ¥{monthlyIncome.toLocaleString()}
            </p>
          </div>
          <div
            className="rounded-2xl px-4 py-3"
            style={{ background: c.card2, border: `1px solid ${c.cardBorder}`, transition: 'background 0.4s ease' }}
          >
            <p className="text-xs mb-1" style={{ color: c.muted }}>本月支出</p>
            <p className="font-bold text-lg" style={{ color: c.text }}>
              <span className="text-red-400 text-sm mr-1">↓</span>
              ¥{monthlyExpense.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
      {/* Demo interaction buttons */}
      <div className="flex-shrink-0 px-5 mb-4">
        <p className="text-xs mb-2 font-medium text-center" style={{ color: c.muted }}>模拟交互</p>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => handleExpense(500, '消费支出')}
            className="py-3 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-95"
            style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#FCA5A5',
            }}
          >
            💸 支出 ¥500
          </button>
          <button
            onClick={() => handleIncome(2000, '工资入账')}
            className="py-3 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-95"
            style={{
              background: c.accent,
              border: `1px solid ${c.accentBorder}`,
              color: '#93C5FD',
            }}
          >
            💰 收入 ¥2000
          </button>
          <button
            onClick={() => handleExpense(3500, '大额消费')}
            className="py-3 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-95 col-span-2"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#F87171',
            }}
          >
            ⚠️ 大额支出 ¥3500（触发安全线警告）
          </button>
        </div>

        {/* Last action feedback */}
        <AnimatePresence>
          {lastAction && (
            <motion.div
              key={lastAction + Date.now()}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="text-center text-xs mt-2"
              style={{ color: c.muted }}
            >
              {lastAction} 已记录
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
