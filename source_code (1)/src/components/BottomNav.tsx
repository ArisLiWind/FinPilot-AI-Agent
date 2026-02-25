import { NavLink } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

interface Tab {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  {
    to: '/',
    label: '水池',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z"/>
        <path d="M7 13s.5-2 5-2 5 2 5 2" strokeLinecap="round"/>
        <path d="M12 8v2M8.5 9.5l1.5 1.5M15.5 9.5L14 11" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    to: '/goals',
    label: '目标',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="6"/>
        <circle cx="12" cy="12" r="2"/>
      </svg>
    ),
  },
  {
    to: '/flow',
    label: '流水',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
      </svg>
    ),
  },
  {
    to: '/profile',
    label: '我的',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

export default function BottomNav() {
  const c = useTheme();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 safe-bottom" style={{ maxWidth: '430px', left: '50%', transform: 'translateX(-50%)', right: 'auto', width: '100%' }}>
      <div
        style={{
          background: c.glassNav,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: `1px solid ${c.glassNavBorder}`,
          transition: 'background 0.4s ease, border-color 0.4s ease',
        }}
      >
        <div className="flex items-center justify-around px-2 py-2">
          {/* Left 2 tabs */}
          {tabs.slice(0, 2).map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-all duration-200 ${
                  isActive ? '' : ''
                }`
              }
              style={({ isActive }) => ({
                color: isActive ? '#3B82F6' : c.muted,
              })}
            >
              {tab.icon}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </NavLink>
          ))}

          {/* Center spacer for floating + button */}
          <div className="w-16" />

          {/* Right 2 tabs */}
          {tabs.slice(2).map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-all duration-200`
              }
              style={({ isActive }) => ({
                color: isActive ? '#3B82F6' : c.muted,
              })}
            >
              {tab.icon}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
