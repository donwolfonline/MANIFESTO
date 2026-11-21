import { useEffect, useState } from 'react';

export interface BatteryManagerLike {
  charging: boolean;
  level: number;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

interface NavigatorPowerInfo extends Navigator {
  deviceMemory?: number;
  hardwareConcurrency: number;
  connection?: {
    saveData?: boolean;
    effectiveType?: string;
  };
  getBattery?: () => Promise<BatteryManagerLike>;
}

/**
 * Evaluates whether heavy visual / canvas animations should pause to preserve
 * battery and frame pacing on low-power, battery-saver, or Data Saver devices.
 */
export function detectLowPowerMode(battery?: BatteryManagerLike | null): boolean {
  if (typeof document !== 'undefined') {
    const forced = document.documentElement.getAttribute('data-low-power');
    if (forced === 'true') return true;
  }

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return true;
      }
    } catch {
      // Ignore matchMedia errors
    }
  }

  if (typeof navigator !== 'undefined') {
    const nav = navigator as NavigatorPowerInfo;
    if (nav.connection?.saveData === true) return true;
    if (
      nav.connection?.effectiveType === 'slow-2g' ||
      nav.connection?.effectiveType === '2g'
    ) {
      return true;
    }
    if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2) {
      return true;
    }
    if (
      typeof nav.hardwareConcurrency === 'number' &&
      nav.hardwareConcurrency > 0 &&
      nav.hardwareConcurrency <= 2
    ) {
      return true;
    }
  }

  if (battery && !battery.charging && battery.level <= 0.2) {
    return true;
  }

  return false;
}

/**
 * React hook that tracks battery-saver, Data Saver, low-core/memory devices,
 * and `prefers-reduced-motion`, mirroring state onto `<html data-low-power="true">`.
 */
export function useLowPowerMode(): boolean {
  const [lowPower, setLowPower] = useState<boolean>(() => detectLowPowerMode());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let activeBattery: BatteryManagerLike | null = null;
    let cancelled = false;

    const evaluate = (batteryOverride?: BatteryManagerLike | null) => {
      const next = detectLowPowerMode(batteryOverride ?? activeBattery);
      setLowPower(next);
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute(
          'data-low-power',
          next ? 'true' : 'false',
        );
      }
    };

    evaluate();

    let mq: MediaQueryList | null = null;
    if (typeof window.matchMedia === 'function') {
      try {
        mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const onMediaChange = () => evaluate();
        mq.addEventListener('change', onMediaChange);
      } catch {
        mq = null;
      }
    }

    const nav = navigator as NavigatorPowerInfo | undefined;
    if (nav?.getBattery) {
      nav
        .getBattery()
        .then((battery) => {
          if (cancelled) return;
          activeBattery = battery;
          evaluate(battery);
          const onBatteryChange = () => evaluate(battery);
          battery.addEventListener?.('chargingchange', onBatteryChange);
          battery.addEventListener?.('levelchange', onBatteryChange);
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
      if (mq) {
        mq.removeEventListener('change', () => evaluate());
      }
    };
  }, []);

  return lowPower;
}
