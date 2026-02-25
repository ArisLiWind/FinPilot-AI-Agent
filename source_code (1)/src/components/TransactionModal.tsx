import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/appStore';

export default function TransactionModal() {
  const { showModal, closeModal, triggerIncome, triggerExpense, currentSavings, cupCapacity } = useAppStore();
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [confidence] = useState(Math.floor(Math.random() * 3) + 1); // 1-3

  const handleSubmit = () => {
    const n = parseFloat(amount);
    if (!n || n <= 0) return;
    if (type === 'income') {
      triggerIncome(n, desc || '收入');
    } else {
      triggerExpense(n, desc || '支出');
    }
    closeModal();
    setAmount('');
    setDesc('');
  };

  const previewLevel = type === 'expense'
    ? Math.max(0, (currentSavings - (parseFloat(amount) || 0)) / cupCapacity)
    : Math.min(1, (currentSavings + (parseFloat(amount) || 0)) / cupCapacity);

  const currentLevel = currentSavings / cupCapacity;
  const levelDelta = previewLevel - currentLevel;

  return (
    <AnimatePresence>
      {showModal && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
            style={{
              background: 'rgba(11,24,54,0.97)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(59,130,246,0.25)',
              borderBottom: 'none',
            }}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            <div className="max-w-md mx-auto p-6">
              {/* Handle */}
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />

              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[#E6F0FF] text-lg font-bold">记一笔</h2>
                <button onClick={closeModal} className="text-[#7B8794] hover:text-white">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>

              {/* Type toggle */}
              <div
                className="flex rounded-xl p-1 mb-5"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                {(['expense', 'income'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      type === t
                        ? t === 'expense'
                          ? 'bg-red-500/80 text-white shadow-lg'
                          : 'bg-[#1D4ED8] text-white shadow-lg'
                        : 'text-[#7B8794]'
                    }`}
                  >
                    {t === 'expense' ? '💸 支出' : '💰 收入'}
                  </button>
                ))}
              </div>

              {/* Amount input */}
              <div
                className="flex items-center rounded-2xl px-4 py-3 mb-4"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(59,130,246,0.2)' }}
              >
                <span className="text-[#7B8794] text-xl mr-2">¥</span>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 bg-transparent text-2xl font-bold text-[#E6F0FF] outline-none placeholder:text-[#7B8794]/40"
                  autoFocus
                />
                {/* Confidence dots */}
                <div className="flex gap-1 ml-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: i <= confidence ? '#38BDF8' : 'rgba(255,255,255,0.15)',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Description */}
              <input
                type="text"
                placeholder="备注（选填）"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full rounded-2xl px-4 py-3 mb-4 text-sm text-[#E6F0FF] placeholder:text-[#7B8794]/50 outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(59,130,246,0.15)' }}
              />

              {/* Mini preview */}
              {parseFloat(amount) > 0 && (
                <div
                  className="rounded-2xl px-4 py-3 mb-5 flex items-center gap-3"
                  style={{ background: 'rgba(29,78,216,0.15)', border: '1px solid rgba(59,130,246,0.2)' }}
                >
                  {/* Mini water bar */}
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-[#7B8794] mb-1">
                      <span>水位变化</span>
                      <span className={levelDelta >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {levelDelta >= 0 ? '+' : ''}{(levelDelta * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background: levelDelta >= 0
                            ? 'linear-gradient(90deg, #1D4ED8, #3B82F6)'
                            : 'linear-gradient(90deg, #EF4444, #F87171)',
                        }}
                        initial={{ width: `${currentLevel * 100}%` }}
                        animate={{ width: `${previewLevel * 100}%` }}
                        transition={{ duration: 0.5, ease: [0.2, 0.9, 0.2, 1] }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!parseFloat(amount)}
                className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all duration-200 disabled:opacity-40"
                style={{
                  background: 'linear-gradient(135deg, #1D4ED8, #2563EB)',
                  boxShadow: '0 4px 20px rgba(29,78,216,0.4)',
                }}
              >
                确认并记录 ✓
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
