// ─── DARK THEME ──────────────────────────────────────────────────────────────
// Dark theme with brown cards (#B79C64) and gold border (#F0D080)

const DARK_THEME = {
  // Disable card gradient (use solid color)
  disableCardGradient: true,
  // Use thick border like on drag (3px instead of 2px)
  thickCardBorder: true,

  colors: {
    // Surface colors
    surface: '#1d3124',
    surfaceDark: '#0f1a14',
    surfaceLight: '#2d4a34',
    surfaceVariant: 'rgba(80, 67, 42, 0.3)',

    // Primary colors
    primary: '#50432a',
    primaryHover: '#6b5a38',
    disabled: '#3d3426',
    craftButtonDisabled: '#2D461F',

    // Accent colors
    accent: '#dfa125',
    accentBorder: '#b8841f',
    accentDim: '#9a6d1a',

    // Text colors
    text: '#f5e6d0',
    textDark: '#1a1a1a',
    textMuted: 'rgba(245, 230, 208, 0.5)',
    textSecondary: 'rgba(245, 230, 208, 0.85)',

    // Type colors (card type indicators) - muted versions
    unit: '#000000',
    resource: '#000000',
    food: '#000000',
    material: '#000000',
    building: '#000000',
    currency: '#000000',
    weapon: '#000000',
    enemy: '#000000',
    knowledge: "#000000",
    consumable: "#000000",

    // Card colors - brown theme
    cardBg: '#B79C64',
    cardBgDark: '#B79C64',
    cardBorder: '#ffffff',
    cardBorderEnemy: '#ffffff',

    // UI colors - green background
    board: '#1d3124',
    boardHighlight: '#2d4a34',
    boardAccent: '#3a5f44',

    // Progress bar colors
    progressBg: '#3d3426',
    progressFill: '#5a7a40',
    progressFillDark: '#3a5a25',

    // Slot overlay colors - same as default theme (cauldron style unchanged)
    slotHover: 'rgba(58,158,253,0.4)',
    slotFilled: 'rgba(123,194,68,0.35)',
    slotRequired: 'rgba(255,215,0,0.2)',

    // Toast colors
    toastBg: 'rgba(80, 67, 42, 0.95)',
    toastText: '#f5e6d0',

    // Dropdown colors
    dropdownBg: 'rgba(15,26,20,0.9)',
    dropdownText: '#f5e6d0',
    dropdownAccent: '#dfa125',
  },
};

// Expose to global scope
window.STYLES = window.STYLES || {};
window.STYLES.dark = DARK_THEME;

// Apply dark style on load (optional, default is default)
// Only applies if explicitly set via setStyle()
