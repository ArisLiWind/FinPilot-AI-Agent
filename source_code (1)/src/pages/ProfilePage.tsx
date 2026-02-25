import { motion } from 'framer-motion';
import { useAppStore } from '../store/appStore';
import { useTheme, useThemeName } from '../hooks/useTheme';

// ─── Theme Toggle Switch ──────────────────────────────────────────────────────
function ThemeToggle() {
  const { toggleTheme } = useAppStore();
  const theme = useThemeName();
  const isLight = theme === 'light';

  return (
    <button
      onClick={toggleTheme}
      className="relative flex items-center"
      aria-label={isLight ? '切换到黑夜模式' : '切换到白天模式'}
    >
      <div
        className="w-14 h-7 rounded-full relative transition-all duration-400"
        style={{
          background: isLight
            ? 'linear-gradient(135deg, #FCD34D, #F59E0B)'
            : 'linear-gradient(135deg, #1E3A8A, #312E81)',
          boxShadow: isLight
            ? '0 0 12px rgba(251,191,36,0.5)'
            : '0 0 12px rgba(99,102,241,0.4)',
          transition: 'background 0.4s ease, box-shadow 0.4s ease',
        }}
      >
        {/* Stars (dark mode) */}
        {!isLight && (
          <div className="absolute inset-0 flex items-center justify-start pl-2 pointer-events-none">
            <span className="text-[8px] opacity-70">✦</span>
          </div>
        )}
        {/* Sun rays (light mode) */}
        {isLight && (
          <div className="absolute inset-0 flex items-center justify-end pr-2 pointer-events-none">
            <span className="text-[8px] opacity-70">☀</span>
          </div>
        )}
        {/* Thumb */}
        <motion.div
          className="absolute top-0.5 w-6 h-6 rounded-full flex items-center justify-center shadow-md"
          animate={{ x: isLight ? 30 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{
            background: isLight ? '#FFFBEB' : '#E0E7FF',
          }}
        >
          <span className="text-xs">{isLight ? '☀️' : '🌙'}</span>
        </motion.div>
      </div>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { currentSavings, monthlyIncome, monthlyExpense, cupCapacity } = useAppStore();
  const c = useTheme();
  const theme = useThemeName();
  const savingsRate = Math.round(((monthlyIncome - monthlyExpense) / monthlyIncome) * 100);
  const healthScore = Math.min(100, Math.round((currentSavings / cupCapacity) * 80 + savingsRate * 0.2));

  const shortcuts = [
    { icon: '📱', label: '导入 Shortcuts', desc: '一键导入 iOS 快捷指令', badge: 'iCloud' },
    { icon: '🔔', label: '支付通知拦截', desc: '识别支付宝/微信付款', badge: '已启用' },
    { icon: '📊', label: '月度报告', desc: '每月 1 日自动生成', badge: '本月' },
    { icon: '🎯', label: '预算设置', desc: '设定各类支出上限', badge: null },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 pt-12 pb-4 flex-shrink-0">
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: c.muted }}>RichUp · 来财</p>
        <h1 className="text-2xl font-bold mt-0.5" style={{ color: c.text }}>我的</h1>
      </div>

      {/* ── Theme Toggle Card ── */}
      <div className="px-5 mb-4 flex-shrink-0">
        <div
          className="rounded-2xl px-4 py-4 flex items-center justify-between"
          style={{
            background: theme === 'light'
              ? 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(255,255,255,0.95))'
              : 'linear-gradient(135deg, rgba(49,46,129,0.5), rgba(15,24,50,0.9))',
            border: theme === 'light' ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(99,102,241,0.3)',
            transition: 'background 0.4s ease, border-color 0.4s ease',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{
                background: theme === 'light' ? 'rgba(251,191,36,0.2)' : 'rgba(99,102,241,0.2)',
                border: theme === 'light' ? '1px solid rgba(251,191,36,0.4)' : '1px solid rgba(99,102,241,0.4)',
              }}
            >
              {theme === 'light' ? '☀️' : '🌙'}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: c.text }}>
                {theme === 'light' ? '白天模式' : '黑夜模式'}
              </p>
              <p className="text-xs" style={{ color: c.muted }}>
                {theme === 'light' ? '清爽日间风格' : '深海科技风格'}
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Profile card */}
      <div className="px-5 mb-5 flex-shrink-0">
        <div
          className="rounded-2xl p-5"
          style={{
            background: c.isDark
              ? 'linear-gradient(135deg, rgba(29,78,216,0.35), rgba(11,30,61,0.9))'
              : 'linear-gradient(135deg, rgba(29,78,216,0.12), rgba(255,255,255,0.95))',
            border: `1px solid ${c.cardBorder}`,
            transition: 'background 0.4s ease',
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: c.accent, border: `1px solid ${c.accentBorder}` }}
            >
              👤
            </div>
            <div className="flex-1">
              <p className="font-bold text-base" style={{ color: c.text }}>来财用户</p>
              <p className="text-xs mt-0.5" style={{ color: c.muted }}>财务健康评分</p>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: c.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${healthScore}%` }}
                    transition={{ duration: 0.8, ease: [0.2, 0.9, 0.2, 1] }}
                    style={{ background: 'linear-gradient(90deg, #1D4ED8, #38BDF8)' }}
                  />
                </div>
                <span className="text-xs font-bold" style={{ color: '#38BDF8' }}>{healthScore}</span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4" style={{ borderTop: `1px solid ${c.cardBorder}` }}>
            {[
              { label: '储蓄率', value: `${savingsRate}%`, color: '#38BDF8' },
              { label: '月结余', value: `¥${(monthlyIncome - monthlyExpense).toLocaleString()}`, color: '#4ADE80' },
              { label: '目标进度', value: `${Math.round((currentSavings / cupCapacity) * 100)}%`, color: '#818CF8' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-bold text-sm" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-xs mt-0.5" style={{ color: c.muted }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Shortcuts section */}
      <div className="px-5 mb-5 flex-shrink-0">
        <p className="text-xs font-medium mb-3 uppercase tracking-wide" style={{ color: c.muted }}>快捷功能</p>
        <div className="space-y-2">
          {shortcuts.map((s, i) => (
            <motion.button
              key={s.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
              className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all active:scale-98"
              style={{ background: c.card, border: `1px solid ${c.cardBorder}`, transition: 'background 0.4s ease' }}
            >
              <span className="text-xl w-8 text-center flex-shrink-0">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: c.text }}>{s.label}</p>
                <p className="text-xs mt-0.5" style={{ color: c.muted }}>{s.desc}</p>
              </div>
              {s.badge && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    background: s.label === '导入 Shortcuts' ? 'rgba(56,189,248,0.2)' : 'rgba(74,222,128,0.15)',
                    color: s.label === '导入 Shortcuts' ? '#38BDF8' : '#4ADE80',
                    border: `1px solid ${s.label === '导入 Shortcuts' ? 'rgba(56,189,248,0.3)' : 'rgba(74,222,128,0.25)'}`,
                  }}
                >
                  {s.badge}
                </span>
              )}
              <svg viewBox="0 0 24 24" fill="none" stroke={c.muted} strokeWidth="2" className="w-4 h-4 flex-shrink-0">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Version info */}
      <div className="px-5 pb-28 text-center">
        <p className="text-xs" style={{ color: c.muted }}>RichUp 来财 v1.0.0</p>
        <p className="text-xs mt-1" style={{ color: c.muted }}>深海科技 × 物理仿真量杯</p>
      </div>
    </div>
  );
}
