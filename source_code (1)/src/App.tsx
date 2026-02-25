import { Component, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAppStore } from './store/appStore';
import BottomNav from './components/BottomNav';
import FloatingButton from './components/FloatingButton';
import BlockCard from './components/BlockCard';
import TransactionModal from './components/TransactionModal';
import PoolPage from './pages/PoolPage';
import GoalsPage from './pages/GoalsPage';
import FlowPage from './pages/FlowPage';
import ProfilePage from './pages/ProfilePage';

// ── Error boundary to prevent total black screen on render errors ──────────
interface EBState { hasError: boolean; error?: Error }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed', inset: 0,
          background: '#020c1e',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⚠️</div>
          <p style={{ color: '#E6F0FF', fontWeight: 700, marginBottom: '8px' }}>加载出错了</p>
          <p style={{ color: '#7B8794', fontSize: '13px', marginBottom: '20px' }}>
            {this.state.error?.message ?? '未知错误'}
          </p>
          <button
            style={{
              background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)',
              color: '#93C5FD', borderRadius: '12px', padding: '10px 20px', cursor: 'pointer',
            }}
            onClick={() => window.location.reload()}
          >
            重新加载
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Main App ───────────────────────────────────────────────────────────────
function AppInner() {
  const theme = useAppStore((s) => s.theme);

  const bgStyle = theme === 'light'
    ? {
        background: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.12) 0%, transparent 70%), #EFF6FF',
        transition: 'background 0.4s ease',
      }
    : {
        background: 'radial-gradient(ellipse at 50% 0%, rgba(29,78,216,0.15) 0%, transparent 70%), #020c1e',
        transition: 'background 0.4s ease',
      };

  return (
    <Router>
      <div
        data-theme={theme}
        className="relative w-full h-screen overflow-hidden flex flex-col"
        style={{ maxWidth: '430px', margin: '0 auto', ...bgStyle }}
      >
        {/* Main content area */}
        <div className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/"        element={<PoolPage />} />
            <Route path="/goals"   element={<GoalsPage />} />
            <Route path="/flow"    element={<FlowPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </div>

        {/* Persistent overlays */}
        <FloatingButton />
        <BottomNav />
        <BlockCard />
        <TransactionModal />
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
