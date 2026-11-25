/**
 * Typed NEXORA Design System Tokens & Motion Curves.
 * Mirrors CSS custom properties in src/index.css for JS/SVG consumers and Motion springs.
 */
export const NX_COLORS = {
  midnightCanvas: '#070B19',
  frostedLightCanvas: '#EFF4FC',
  purple: {
    dark: '#8B5CF6',
    light: '#7C3AED',
    soft: '#A78BFA',
  },
  cyan: {
    dark: '#06B6D4',
    light: '#0891B2',
    bright: '#22D3EE',
  },
  semantic: {
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#F43F5E',
  },
} as const;

export const NX_SPRINGS = {
  snappy: { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.8 },
  smooth: { type: 'spring' as const, stiffness: 320, damping: 30, mass: 0.9 },
  gentle: { type: 'spring' as const, stiffness: 220, damping: 28, mass: 1 },
} as const;

export const NX_TRANSITIONS = {
  page: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const },
  micro: { duration: 0.16, ease: [0.16, 1, 0.3, 1] as const },
} as const;
