// ─── DEFAULT THEME ───────────────────────────────────────────────────────────
// Default theme tokens for Stacklands card game

const DEFAULT_THEME = {
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
    craftButtonDisabled: '#2D461F',

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
};

// Expose to global scope
window.STYLES = window.STYLES || {};
window.STYLES.default = DEFAULT_THEME;

// Apply default style on load
if (window.THEME && window.THEME.colors) {
  Object.assign(window.THEME.colors, JSON.parse(JSON.stringify(DEFAULT_THEME.colors)));
  window.THEME.disableCardGradient = DEFAULT_THEME.disableCardGradient || false;
  window.THEME.thickCardBorder = DEFAULT_THEME.thickCardBorder || false;
}
