import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/appStore';
import { useTheme } from '../hooks/useTheme';

export default function BlockCard() {
  const {
    showBlockCard,
    blockCardMessage,
    blockCardSubMessage,
    goalWarning,
    pendingTransaction,
    confirmTransaction,
    cancelTransaction,
    currentSavings,
    cupCapacity,
  } = useAppStore();
  const c = useTheme();

  const amount = pendingTransaction?.amount ?? 0;
  const newBalance = currentSavings; // already updated in store
  const beforeBalance = currentSavings + amount;

  // Detect if this is a goal-anchored warning vs safety-line warning
  const isGoalWarning = !!goalWarning && !!(goalWarning.startsWith('你说过'));

  return (
    <AnimatePresence>
      {showBlockCard && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Card */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl"
            style={{
              background: c.isDark
                ? 'rgba(11,24,54,0.97)'
                : 'rgba(248,250,255,0.98)',
              backdropFilter: 'blur(24px)',
              border: `1px solid ${isGoalWarning ? 'rgba(251,191,36,0.35)' : 'rgba(239,68,68,0.35)'}`,
              borderBottom: 'none',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          >
            <div className="max-w-md mx-auto p-6 pb-8">
              {/* Handle */}
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

              {/* Icon + title */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isGoalWarning
                      ? 'rgba(251,191,36,0.15)'
                      : 'rgba(239,68,68,0.15)',
                    border: `1px solid ${isGoalWarning ? 'rgba(251,191,36,0.4)' : 'rgba(239,68,68,0.4)'}`,
                  }}
                >
                  {isGoalWarning ? (
                    <span className="text-lg">🎯</span>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" className="w-5 h-5">
                      <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div>
                  <h3
                    className="font-bold text-base"
                    style={{ color: c.text }}
                  >
                    {isGoalWarning ? '你的目标正在等你' : '储蓄将跌破安全线'}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: c.muted }}>
                    {isGoalWarning ? '每一笔消费都有代价' : '未来的你，正在看着你花钱。'}
                  </p>
                </div>
              </div>

              {/* "你说过..." goal anchor — primary highlight */}
              {isGoalWarning && goalWarning && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.12 }}
                  className="rounded-2xl p-4 mb-4"
                  style={{
                    background: 'rgba(251,191,36,0.06)',
                    border: '1px solid rgba(251,191,36,0.25)',
                  }}
                >
                  {goalWarning.split('\n').map((line, i) => (
                    <p
                      key={i}
                      className={`leading-relaxed ${i === 0 ? 'text-sm font-semibold mb-1.5' : 'text-sm'}`}
                      style={{
                        color: i === 0
                          ? (c.isDark ? '#FDE68A' : '#92400E')
                          : (c.isDark ? '#FCD34D' : '#B45309'),
                      }}
                    >
                      {line}
                    </p>
                  ))}
                </motion.div>
              )}

              {/* Safety-line message (shown when not goal-anchored, or as secondary) */}
              {(!isGoalWarning || blockCardSubMessage) && (
                <div
                  className="rounded-2xl p-4 mb-4"
                  style={{
                    background: isGoalWarning
                      ? (c.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)')
                      : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${isGoalWarning ? c.cardBorder : 'rgba(239,68,68,0.2)'}`,
                  }}
                >
                  <p className="text-sm leading-relaxed" style={{ color: c.text }}>
                    {isGoalWarning ? blockCardSubMessage : blockCardMessage}
                  </p>
                </div>
              )}

              {/* Before / After balance comparison */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div
                  className="rounded-xl p-3 text-center"
                  style={{
                    background: c.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                    border: `1px solid ${c.cardBorder}`,
                  }}
                >
                  <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: c.muted }}>消费前</p>
                  <p className="text-base font-bold" style={{ color: c.text }}>¥{beforeBalance.toLocaleString()}</p>
                </div>
                <div
                  className="rounded-xl p-3 text-center"
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.25)',
                  }}
                >
                  <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: c.muted }}>消费后</p>
                  <p className="text-base font-bold text-red-400">¥{newBalance.toLocaleString()}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                {/* Cancel / rethink */}
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => cancelTransaction()}
                  className="rounded-xl py-3 text-sm font-semibold"
                  style={{
                    background: isGoalWarning
                      ? 'rgba(52,211,153,0.12)'
                      : (c.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                    border: `1px solid ${isGoalWarning ? 'rgba(52,211,153,0.3)' : c.cardBorder}`,
                    color: isGoalWarning ? '#34D399' : c.text,
                  }}
                >
                  {isGoalWarning ? '取消这笔消费' : '再想想'}
                </motion.button>

                {/* Confirm */}
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={confirmTransaction}
                  className="rounded-xl py-3 text-sm font-semibold"
                  style={{
                    background: isGoalWarning
                      ? 'rgba(239,68,68,0.10)'
                      : 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.1))',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#F87171',
                  }}
                >
                  {isGoalWarning ? '还是花了' : '确认消费'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
