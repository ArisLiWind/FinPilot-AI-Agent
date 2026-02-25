# RichUp 来财 · 深色科技感物理仿真量杯 App

## 项目说明

**RichUp（来财）** 是一款高保真 Web App 财务原型，采用 **深海科技 UI 语言** + **物理仿真圆柱量杯水池** 来可视化用户储蓄状态。

> "未来的你，正在看着你花钱。"

## 技术栈

- **React 18** + **TypeScript**
- **Vite 7** 构建工具
- **Tailwind CSS 3** 样式
- **Framer Motion** 动画
- **Zustand** 状态管理
- **Canvas 2D** 水物理仿真（无第三方库）
- **React Router DOM 6** 页面路由

## 核心功能

### 水物理仿真（`src/components/WaterCup.tsx`）

1D 离散波动方程驱动的水面波纹：
- `N = 128` height field 格点
- `c = 0.7` 波速
- `damping = 0.04` 衰减系数
- 粒子溅落系统（每次事件 ≤30 粒子）
- Fresnel 边缘高光 + 渐变水体
- 安全线 / 危险线 HUD 指示

### 状态管理（`src/store/appStore.ts`）

- `currentSavings`：当前储蓄金额
- `targetWaterLevel`：目标水位（0-1 归一化）
- `pourEvent`：倒水事件（由 Canvas 监听）
- `triggerIncome/triggerExpense`：触发进水/出水动画
- `showBlockCard`：安全线穿越时显示阻断卡

### 页面结构

| 路由 | 页面 | 功能 |
|------|------|------|
| `/` | PoolPage | 主页：水池视觉 + 储蓄数字 + 模拟按钮 |
| `/goals` | GoalsPage | 财务目标进度 |
| `/flow` | FlowPage | 交易流水记录 |
| `/profile` | ProfilePage | 我的 / 快捷功能 |

## 颜色 Token

```
--bg:       #0B1E3D  // 主背景
--blue-1:   #1E3A8A  // 主蓝
--water-a:  #1D4ED8  // 水色渐变起始
--water-b:  #3B82F6  // 水色渐变结束
--safe:     #38BDF8  // 安全线（青蓝）
--danger:   #EF4444  // 危险线（柔红）
--text:     #E6F0FF  // 主文字
--muted:    #7B8794  // 辅助灰
```

## 交互说明

1. **默认态**：显示储蓄水位（约 71%）+ 本月收支
2. **支出 ¥500**：量杯左侧倒出动画 + 粒子溅落
3. **收入 ¥2000**：顶部注水流动画 + 水面波动
4. **大额支出 ¥3500**：触发安全线穿越 → 底部阻断卡弹出（继续/延期/替代）
5. **+ 按钮**：点击打开记账模态框；长按展开快捷菜单

## PWA 支持

已升级为 Progressive Web App：
- **vite-plugin-pwa** 自动生成 Service Worker（Workbox generateSW 模式）
- **manifest.webmanifest**：`display: standalone`，主题色 `#0a1628`，图标 192+512px
- **离线缓存**：预缓存 HTML/CSS/JS/图标；运行时分别对图片（CacheFirst）和静态资源（StaleWhileRevalidate）缓存
- **iOS Safari**：`apple-mobile-web-app-capable`、`apple-touch-icon`，黑色半透明状态栏
- **Android Chrome / Edge**：`mobile-web-app-capable`，theme-color 元标签
- 图标文件：`public/icons/icon-192.png`、`public/icons/icon-512.png`（由 AI 生成后用 sharp 缩放）

## 构建命令

```bash
npm install
npm run build
npm run dev    # 开发预览
```

## 文件结构

```
src/
  store/
    appStore.ts          # Zustand 状态管理
  components/
    WaterCup.tsx         # Canvas 物理仿真（核心）
    BottomNav.tsx        # 底部四 Tab 导航
    FloatingButton.tsx   # + 浮动按钮
    TransactionModal.tsx # 快速记账模态框
    BlockCard.tsx        # 安全线阻断卡
  pages/
    PoolPage.tsx         # 水池主页
    GoalsPage.tsx        # 目标页
    FlowPage.tsx         # 流水页
    ProfilePage.tsx      # 我的页
  App.tsx                # 路由根组件
  index.css              # 全局样式 + CSS tokens
```

## 可降级策略

- 高端：Canvas 2D height-field + 粒子系统 + Framer Motion
- 中端：简化波动（减少 N 值）+ CSS 过渡替代粒子
- 静态演示：纯 CSS 水位条 + 数字插值

## 后续扩展建议

- 接入 Youbase 后端存储真实交易数据
- 添加 WebGL shader 提升水面质感
- 集成 OCR 识别支付通知
- iOS Shortcuts 自动化导入
