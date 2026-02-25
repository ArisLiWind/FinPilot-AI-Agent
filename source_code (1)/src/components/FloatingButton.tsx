import { useRef, useState, useCallback } from 'react';
import { useAppStore } from '../store/appStore';

export default function FloatingButton() {
  const { toggleQuickMenu, showQuickMenu, openModal, triggerIncome, triggerExpense } = useAppStore();
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pressed, setPressed] = useState(false);

  const handlePressStart = useCallback(() => {
    setPressed(true);
    pressTimer.current = setTimeout(() => {
      toggleQuickMenu();
      setPressed(false);
    }, 500);
  }, [toggleQuickMenu]);

  const handlePressEnd = useCallback(() => {
    setPressed(false);
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    if (!showQuickMenu) {
      openModal();
    }
  }, [openModal, showQuickMenu]);

  return (
    <>
      {/* Quick menu overlay */}
      {showQuickMenu && (
        <div className="fixed inset-0 z-50" onClick={toggleQuickMenu}>
          <div
            className="absolute bottom-24 left-1/2 -translate-x-1/2 w-64 rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(15,37,77,0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(59,130,246,0.3)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2">
              <p className="text-[#7B8794] text-xs text-center py-2 font-medium">快捷收集</p>

              {[
                {
                  icon: '📷',
                  label: '扫描通知',
                  desc: 'OCR 识别账单',
                  action: () => { triggerExpense(128, '扫描消费'); toggleQuickMenu(); },
                },
                {
                  icon: '✏️',
                  label: '手动输入',
                  desc: '记录一笔交易',
                  action: () => { openModal(); toggleQuickMenu(); },
                },
                {
                  icon: '🔁',
                  label: '最近交易',
                  desc: '重复上次记录',
                  action: () => { triggerExpense(380, '餐饮'); toggleQuickMenu(); },
                },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                >
                  <span className="text-xl w-8 text-center">{item.icon}</span>
                  <div>
                    <p className="text-[#E6F0FF] text-sm font-medium">{item.label}</p>
                    <p className="text-[#7B8794] text-xs">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating + button */}
      <button
        className="fixed z-50 bottom-14 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full flex items-center justify-center transition-transform select-none"
        style={{
          background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
          boxShadow: `0 0 0 2px rgba(56,189,248,0.6), 0 8px 24px rgba(29,78,216,0.6)`,
          transform: `translateX(-50%) scale(${pressed ? 0.92 : 1})`,
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        aria-label="快速记账"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          className="w-6 h-6"
          style={{
            transform: showQuickMenu ? 'rotate(45deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </>
  );
}
