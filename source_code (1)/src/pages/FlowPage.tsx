import { motion } from 'framer-motion';
import { useAppStore, Transaction } from '../store/appStore';
import { useTheme } from '../hooks/useTheme';

const CATEGORY_COLORS: Record<string, string> = {
  '收入': '#3B82F6',
  '住房': '#818CF8',
  '饮食': '#F59E0B',
  '出行': '#34D399',
  '购物': '#F472B6',
  '支出': '#EF4444',
};

const CATEGORY_ICONS: Record<string, string> = {
  '收入': '💰',
  '住房': '🏠',
  '饮食': '🍜',
  '出行': '🚌',
  '购物': '🛍️',
  '支出': '💸',
};

function TxnItem({ txn, index }: { txn: Transaction; index: number }) {
  const c = useTheme();
  const color = CATEGORY_COLORS[txn.category] ?? '#7B8794';
  const icon  = CATEGORY_ICONS[txn.category]  ?? '📋';
  const sign  = txn.type === 'income' ? '+' : '-';
  const amountColor = txn.type === 'income' ? '#4ADE80' : '#F87171';

  const dateStr = new Date(txn.timestamp).toLocaleDateString('zh-CN', {
    month: 'numeric', day: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-center gap-3 py-3"
      style={{ borderBottom: c.isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.06)' }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
        style={{ background: `${color}22`, border: `1px solid ${color}44` }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: c.text }}>{txn.description}</p>
        <p className="text-xs mt-0.5" style={{ color: c.muted }}>{txn.category} · {dateStr}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-bold text-sm" style={{ color: amountColor }}>
          {sign}¥{txn.amount.toLocaleString()}
        </p>
        <p className="text-xs mt-0.5" style={{ color: c.muted }}>#{txn.auditId}</p>
      </div>
    </motion.div>
  );
}

export default function FlowPage() {
  const { transactions, monthlyIncome, monthlyExpense } = useAppStore();
  const c = useTheme();
  const netFlow = monthlyIncome - monthlyExpense;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 pt-12 pb-4 flex-shrink-0">
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: c.muted }}>RichUp · 来财</p>
        <h1 className="text-2xl font-bold mt-0.5" style={{ color: c.text }}>流水记录</h1>
      </div>

      {/* Monthly summary */}
      <div className="px-5 mb-5 flex-shrink-0">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '本月收入', value: monthlyIncome, color: '#4ADE80', prefix: '+' },
            { label: '本月支出', value: monthlyExpense, color: '#F87171', prefix: '-' },
            { label: '净结余',   value: netFlow, color: netFlow >= 0 ? '#38BDF8' : '#EF4444', prefix: netFlow >= 0 ? '+' : '' },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl p-3 text-center"
              style={{ background: c.card, border: `1px solid ${c.cardBorder}`, transition: 'background 0.4s ease' }}
            >
              <p className="text-xs mb-1" style={{ color: c.muted }}>{item.label}</p>
              <p className="font-bold text-sm" style={{ color: item.color }}>
                {item.prefix}¥{Math.abs(item.value).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions */}
      <div className="px-5 pb-24">
        <p className="text-xs font-medium mb-3" style={{ color: c.muted }}>最近记录</p>
        {transactions.length === 0 ? (
          <div className="text-center py-12 text-sm" style={{ color: c.muted }}>
            暂无记录，点击 + 开始记账
          </div>
        ) : (
          transactions.map((txn, i) => (
            <TxnItem key={txn.id} txn={txn} index={i} />
          ))
        )}
      </div>
    </div>
  );
}
