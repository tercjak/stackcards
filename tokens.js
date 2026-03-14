// ─── THEME TOKENS (OCSS-style) ───────────────────────────────────────────────
// Design tokens for Stacklands card game
// Usage: THEME.colors.primary, THEME.spacing.md, etc.

const THEME = {
  colors: {
    // Surface colors
    surface: '#1a1a1a',
    surfaceDark: '#000000',
    surfaceLight: '#E0E0E0',
    surfaceVariant: 'rgba(200, 180, 140, 0.06)',

    // Primary colors
    primary: '#000000',
    primaryHover: '#333333',
    disabled: '#E0E0E0',

    // Accent colors
    accent: '#f0d080',
    accentBorder: '#c8a86b',
    accentDim: '#b09060',

    // Text colors
    text: '#FFFFFF',
    textDark: '#000000',
    textMuted: 'rgba(255,255,255,0.38)',
    textSecondary: 'rgba(255,255,255,0.8)',

    // Type colors (card type indicators)
    unit: '#4a90d9',
    resource: '#5aaa60',
    food: '#9b59b6',
    material: '#d4801a',
    building: '#c0392b',
    currency: '#d4ac0d',
    weapon: '#7f8c8d',
    enemy: '#922b21',

    // Card colors
    cardBg: '#fdf8ee',
    cardBgDark: '#e8dac8',
    cardBorder: '#c8a86b',
    cardBorderEnemy: '#9a7755',

    // UI colors
    board: '#5a9040',
    boardHighlight: '#8ab560',
    boardAccent: '#72b050',

    // Progress bar colors
    progressBg: '#e0d0b0',
    progressFill: '#7bc244',
    progressFillDark: '#4a9010',

    // Slot overlay colors
    slotHover: 'rgba(58,158,253,0.4)',
    slotFilled: 'rgba(123,194,68,0.35)',
    slotRequired: 'rgba(255,215,0,0.2)',

    // Toast colors
    toastBg: 'rgba(248, 242, 220, 0.98)',
    toastText: '#3a2808',

    // Dropdown colors
    dropdownBg: 'rgba(0,0,0,0.8)',
    dropdownText: '#fff',
    dropdownAccent: '#f0d080',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 20,
  },

  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.3)',
    md: '0 4px 12px rgba(0,0,0,0.15)',
    lg: '0 20px 40px rgba(0,0,0,0.3)',
    toast: '0 4px 16px #0006',
    card: '0 4px 12px #0003, 0 2px 4px #0002, inset 0 1px 0 #ffffffcc',
    cardDrag: '0 0 0 4px #3a9efd44, 0 20px 40px #0007, 0 8px 16px #0004',
    button: '0 2px 10px #0004',
    dropdown: '0 8px 30px #0008',
  },

  typography: {
    fontFamily: "'Nunito', 'Segoe UI', sans-serif",
    sizes: {
      xs: 9,
      sm: 11,
      md: 12,
      lg: 14,
      xl: 18,
      xxl: 24,
    },
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
  },

  // Card dimensions
  card: {
    width: 350 / 2,
    height: 460 / 2,
  },

  // Transitions
  transitions: {
    fast: '0.1s ease',
    normal: '0.18s cubic-bezier(0.34,1.56,0.64,1)',
    slow: '0.2s ease',
    drag: '0.12s cubic-bezier(0.34,1.56,0.64,1)',
  },

  // Z-index layers
  zIndex: {
    base: 10,
    asset: 50,
    cardDrag: 500,
    dropdown: 200,
    recipeOverlay: 1000,
    mapSelector: 1000,
    toast: 9000,
  },
};

// Expose to global scope for use in stacklands.jsx
window.THEME = THEME;
