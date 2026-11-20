export const EASE_EDITORIAL = [0.22, 1, 0.36, 1] as const;

/** Ease-out expo cubic-bezier approximation: fast launch, long cinematic settle */
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

/** 60ms letter-by-letter hero mask stagger */
export const LETTER_STAGGER = 0.06;

export const VIEWPORT_ONCE = {
  once: true,
  amount: 0.18,
} as const;

export const MOTION_DURATION = {
  fast: 0.25,
  base: 0.65,
  slow: 0.9,
} as const;
