export interface BeforeAfterExample {
  id: string;
  number: string;
  title: string;
  filename: string;
  beforeCode: string;
  afterCode: string;
  lesson: string;
}

export interface DeletableCodeLine {
  lineNumber: number;
  code: string;
  safeToDelete: boolean;
  reason: string;
}

/**
 * Three editable JS/TS before/after examples for the draggable comparison slider.
 */
export const DELETE_COMPARISONS: BeforeAfterExample[] = [
  {
    id: 'compare-01',
    number: '01',
    title: 'The Strategy Factory That Mailed One Postcard',
    filename: 'order-notice.ts',
    beforeCode: `interface DispatchStrategy {
  execute(payload: Record<string, unknown>): Promise<void>;
}

class WebhookDispatchAdapter implements DispatchStrategy {
  constructor(private readonly endpoint: string) {}

  async execute(payload: Record<string, unknown>) {
    await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
}

class NoticeDispatcherFactory {
  static create(endpoint: string): DispatchStrategy {
    return new WebhookDispatchAdapter(endpoint);
  }
}

export async function sendOrderNotice(url: string, orderId: string) {
  const dispatcher = NoticeDispatcherFactory.create(url);
  await dispatcher.execute({ orderId });
}`,
    afterCode: `// One function, zero ceremony.
export async function sendOrderNotice(
  url: string,
  orderId: string,
): Promise<void> {
  await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ orderId }),
  });
}`,
    lesson:
      'Do not build an airport terminal when you are mailing one postcard.',
  },
  {
    id: 'compare-02',
    number: '02',
    title: 'Six Nested Branches Replaced by One Map',
    filename: 'plan-badge.ts',
    beforeCode: `type PlanTier = 'free' | 'studio' | 'team';

export function getPlanBadge(tier: PlanTier) {
  let label = '';
  let maxSeats = 1;
  let canExport = false;

  if (tier === 'free') {
    label = 'Starter';
    maxSeats = 1;
    canExport = false;
  } else if (tier === 'studio') {
    label = 'Studio';
    maxSeats = 5;
    canExport = true;
  } else if (tier === 'team') {
    label = 'Team';
    maxSeats = 25;
    canExport = true;
  }

  return { label, maxSeats, canExport };
}`,
    afterCode: `type PlanTier = 'free' | 'studio' | 'team';

const PLAN_BADGES = {
  free: { label: 'Starter', maxSeats: 1, canExport: false },
  studio: { label: 'Studio', maxSeats: 5, canExport: true },
  team: { label: 'Team', maxSeats: 25, canExport: true },
} as const;

export function getPlanBadge(tier: PlanTier) {
  return PLAN_BADGES[tier];
}`,
    lesson:
      'When five branches share the exact same shape, the logic belongs in data rather than nested conditionals.',
  },
  {
    id: 'compare-03',
    number: '03',
    title: 'Temporary Variables Multiply Places to Hide',
    filename: 'active-emails.ts',
    beforeCode: `interface Member {
  email: string;
  subscribed: boolean;
}

export function getUniqueEmails(members: Member[]): string[] {
  const copied: Member[] = [];
  for (let i = 0; i < members.length; i++) {
    copied.push(members[i]);
  }

  const filtered: string[] = [];
  for (let i = 0; i < copied.length; i++) {
    if (copied[i].subscribed === true) {
      const normalized = copied[i].email.trim().toLowerCase();
      if (filtered.indexOf(normalized) === -1) {
        filtered.push(normalized);
      }
    }
  }

  return filtered.sort();
}`,
    afterCode: `interface Member {
  email: string;
  subscribed: boolean;
}

export function getUniqueEmails(members: Member[]): string[] {
  const emails = members
    .filter((m) => m.subscribed)
    .map((m) => m.email.trim().toLowerCase());

  return [...new Set(emails)].sort();
}`,
    lesson:
      'Every extra temporary array is another seam where a subtle mutation can quietly drift out of sync.',
  },
];

/**
 * Interactive "delete the line" game — 15 lines total:
 * 7 safe to delete (dead, duplicated, or no-op) and 8 load-bearing.
 */
export const DELETE_GAME_FILENAME = 'format-receipt.ts';

export const DELETE_GAME_LINES: DeletableCodeLine[] = [
  {
    lineNumber: 1,
    code: "import { formatCurrency } from './money';",
    safeToDelete: false,
    reason: 'Load-bearing: formatCurrency is called on the return line.',
  },
  {
    lineNumber: 2,
    code: "import { legacyTaxTable } from './deprecated-tax';",
    safeToDelete: true,
    reason: 'Safe to delete: unused import left behind after the 2024 tax cleanup.',
  },
  {
    lineNumber: 3,
    code: 'let debugRunCount = 0;',
    safeToDelete: true,
    reason: 'Safe to delete: module counter is incremented once and never read anywhere.',
  },
  {
    lineNumber: 4,
    code: 'export function formatReceipt(prices: number[], taxRate: number): string {',
    safeToDelete: false,
    reason: 'Load-bearing: the exported function signature callers depend on.',
  },
  {
    lineNumber: 5,
    code: '  debugRunCount += 1;',
    safeToDelete: true,
    reason: 'Safe to delete: mutates an unread debug counter as a side effect.',
  },
  {
    lineNumber: 6,
    code: "  if (prices.length === 0) return '$0.00';",
    safeToDelete: false,
    reason: 'Load-bearing: handles empty carts cleanly without extra work.',
  },
  {
    lineNumber: 7,
    code: "  if (prices.length === 0) return '$0.00'; // double check",
    safeToDelete: true,
    reason: 'Safe to delete: unreachable duplicate of line 6.',
  },
  {
    lineNumber: 8,
    code: '  const snapshot = [...prices];',
    safeToDelete: true,
    reason: 'Safe to delete: defensive copy is never mutated; reduce reads prices directly.',
  },
  {
    lineNumber: 9,
    code: '  // const oldPromo = snapshot[0] * 0.15; // TEMP remove after Black Friday',
    safeToDelete: true,
    reason: 'Safe to delete: commented-out zombie code lives safely in git history.',
  },
  {
    lineNumber: 10,
    code: '  const subtotal = prices.reduce((sum, n) => sum + n, 0);',
    safeToDelete: false,
    reason: 'Load-bearing: computes the cart subtotal needed for tax and total.',
  },
  {
    lineNumber: 11,
    code: '  const tax = subtotal * taxRate;',
    safeToDelete: false,
    reason: 'Load-bearing: computes tax before adding it into total.',
  },
  {
    lineNumber: 12,
    code: '  const total = subtotal + tax;',
    safeToDelete: false,
    reason: 'Load-bearing: combines subtotal and tax for formatting.',
  },
  {
    lineNumber: 13,
    code: '  const generatedAt = Date.now();',
    safeToDelete: true,
    reason: 'Safe to delete: timestamp is computed and silently discarded.',
  },
  {
    lineNumber: 14,
    code: '  return formatCurrency(total);',
    safeToDelete: false,
    reason: 'Load-bearing: returns the formatted receipt string.',
  },
  {
    lineNumber: 15,
    code: '}',
    safeToDelete: false,
    reason: 'Load-bearing: closes the function block.',
  },
];
