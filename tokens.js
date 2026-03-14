// ─── THEME TOKENS (OCSS-style) ───────────────────────────────────────────────
// Design tokens for Stacklands card game
// Usage: THEME.colors.primary, THEME.spacing.md, etc.

// Base THEME structure (non-color properties)
const THEME = {
  colors: {}, // Will be populated by style files
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

// Current style key
let CURRENT_STYLE_KEY = 'default';

// Function to apply a different style/theme
window.setStyle = function(styleKey) {
  if (window.STYLES && window.STYLES[styleKey]) {
    CURRENT_STYLE_KEY = styleKey;
    const style = window.STYLES[styleKey];
    // Apply colors to THEME
    Object.assign(THEME.colors, JSON.parse(JSON.stringify(style.colors)));
    // Apply non-color properties (like disableCardGradient, thickCardBorder)
    Object.assign(THEME, {
      disableCardGradient: style.disableCardGradient || false,
      thickCardBorder: style.thickCardBorder || false,
    });
    // Trigger re-render by dispatching custom event
    window.dispatchEvent(new CustomEvent('stylechange', { detail: styleKey }));
    console.log(`Style changed to: ${styleKey}`);
  }
};

// Get current style key
window.getCurrentStyle = function() {
  return CURRENT_STYLE_KEY;
};

// Get all available styles
window.getAvailableStyles = function() {
  return window.STYLES ? Object.keys(window.STYLES) : ['default'];
};

// Expose to global scope for use in stacklands.jsx
window.THEME = THEME;
