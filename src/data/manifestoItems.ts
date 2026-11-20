import type { ManifestoMeta } from '../lib/markdown';

export type ManifestoBodyBlock =
  | {
      type: 'paragraph';
      /** Supports inline *italic* syntax */
      text: string;
    }
  | {
      type: 'bullets';
      /** Short bullet list rendered with custom "–" accent markers */
      items: string[];
    }
  | {
      type: 'lines';
      /** Short line-broken list without bullets */
      lines: string[];
    };

export interface ManifestoItem {
  number: number;
  title: string;
  body: ManifestoBodyBlock[];
}

/**
 * Placeholder manifesto items — replace titles, paragraphs, and lists with your own copy.
 * Inline *italics* are supported inside any paragraph, bullet item, or line.
 */
export const MANIFESTO_ITEMS: ManifestoItem[] = [
  {
    number: 1,
    title: 'start from plain text',
    body: [
      {
        type: 'paragraph',
        text: 'Before layout, color, or motion enter the room, the thought has to hold up in a plain `.md` file. If a sentence only sounds convincing once it is wrapped in a gradient, it is *not ready yet*.',
      },
      {
        type: 'paragraph',
        text: 'Plain text strips away excuses. What survives a monospace editor usually survives a decade.',
      },
    ],
  },
  {
    number: 2,
    title: 'notice what gets smoothed away',
    body: [
      {
        type: 'paragraph',
        text: 'Most modern defaults optimize for the average of everything that came before. That is useful for plumbing and *fatal* for voice.',
      },
      {
        type: 'bullets',
        items: [
          'Keep the slightly odd phrasing that actually sounds like you.',
          'Question every convention copied purely out of habit.',
          'Leave *texture* where the template asks for gloss.',
        ],
      },
    ],
  },
  {
    number: 3,
    title: 'choose the problem, not just the output',
    body: [
      {
        type: 'paragraph',
        text: 'Generating ten variations takes seconds now. Deciding which question deserves an afternoon—and which nine options belong in the trash—is still *the whole craft*.',
      },
      {
        type: 'lines',
        lines: [
          'Anyone can produce more.',
          'Few people pause to ask *whether it should exist*.',
          'Taste begins with subtraction.',
        ],
      },
    ],
  },
  {
    number: 4,
    title: 'respect the reader’s nervous system',
    body: [
      {
        type: 'paragraph',
        text: 'A calm page is a form of hospitality. Set prose to a humane reading measure, give paragraphs room to breathe, and refuse to interrupt the person who already gave you their *attention*.',
      },
      {
        type: 'bullets',
        items: [
          'No pop-ups ambushing the second paragraph.',
          'No motion that ignores `prefers-reduced-motion`.',
          'No artificial urgency dressed up as design.',
        ],
      },
    ],
  },
  {
    number: 5,
    title: 'make speed feel quiet',
    body: [
      {
        type: 'paragraph',
        text: 'Fast software does not need to boast about benchmarks. When a tool responds immediately and predictably, the interface recedes and the work comes forward.',
      },
      {
        type: 'paragraph',
        text: 'Latency breaks a train of thought in *sub-second* slices; smoothness protects it.',
      },
    ],
  },
  {
    number: 6,
    title: 'use one accent like a margin mark',
    body: [
      {
        type: 'paragraph',
        text: 'Color loses authority the moment every button demands the spotlight. Keep the canvas steady and warm, keep the ink legible for an hour, and reserve your single accent for moments that genuinely *turn the sentence*.',
      },
      {
        type: 'lines',
        lines: [
          'Warm near-black ground.',
          'Paper-soft off-white ink.',
          'One bright pencil mark in the margin.',
        ],
      },
    ],
  },
  {
    number: 7,
    title: 'stay close to the material',
    body: [
      {
        type: 'paragraph',
        text: 'Every extra layer of abstraction promises convenience and quietly charges interest in understanding. Learn the grain of the medium—type, spacing, timing, light, code—so you can bend rules on purpose instead of by accident.',
      },
      {
        type: 'bullets',
        items: [
          'Inspect what ships, not only the mockup.',
          'Read the raw source when something feels off.',
          'Fix the *small* seam nobody filed a ticket for.',
        ],
      },
    ],
  },
  {
    number: 8,
    title: 'work at a human tempo',
    body: [
      {
        type: 'paragraph',
        text: 'Urgency is cheap; endurance is rare. The pieces people return to years later almost never came from a panicked sprint—they came from someone staying with an idea slightly longer than felt efficient.',
      },
      {
        type: 'paragraph',
        text: 'Slowness on purpose is not laziness. It is *refusal to rush past the good part*.',
      },
    ],
  },
  {
    number: 9,
    title: 'keep your own tools sharp',
    body: [
      {
        type: 'paragraph',
        text: 'Build small utilities, notes, and references that belong to you. Your best work rarely comes from renting someone else’s workflow; it grows out of a quiet workbench arranged for how *your* mind moves.',
      },
      {
        type: 'lines',
        lines: [
          'Own your files.',
          'Name your directories clearly.',
          'Leave breadcrumbs for your future self.',
        ],
      },
    ],
  },
  {
    number: 10,
    title: 'revise in public, finish in peace',
    body: [
      {
        type: 'paragraph',
        text: 'A personal manifesto is not a monument carved in granite—it is a working log. Update it whenever your habits drift from your convictions, keep the diff honest, and close the tab when the work is done.',
      },
      {
        type: 'bullets',
        items: [
          'Say what you actually believe *right now*.',
          'Allow yourself to outgrow last year’s rules.',
          'Ship the quiet thing anyway.',
        ],
      },
    ],
  },
];

export interface ClosingSignOff {
  disclaimer: string;
  signature: string;
  lastTouched: string;
  email: string;
}

export const STOP_DOING_ITEMS: string[] = [
  'checking feeds before my own thoughts have warmed up',
  'mistaking motion and busyness for forward progress',
  'adding one more feature when cutting two would solve it',
  'borrowing interface defaults without questioning why they exist',
  'keeping thirty tabs open as a substitute for making a decision',
  'writing paragraphs that apologize before stating the point',
];

export const DO_MORE_ITEMS: string[] = [
  'starting every hard problem inside a blank plain-text file',
  'deleting draft sentences and surplus code with quiet delight',
  'taking long, unhurried walks without audio in my ears',
  'leaving generous whitespace where anxiety asks for decoration',
  'finishing small, durable things all the way to the colophon',
  'sitting with a single good question slightly longer than feels efficient',
];

export const CLOSING_SIGN_OFF: ClosingSignOff = {
  disclaimer:
    'This is a living set of working notes, not a finished creed—held loosely and revised whenever practice teaches me something truer.',
  signature: '— y. n.',
  lastTouched: 'november 2026',
  email: 'hello@yourdomain.com',
};

/**
 * Serializes metadata, the 10 structured items, and closing lists into plain-text
 * Markdown so the "Raw .md" view and document stats always match the rendered page.
 */
export function serializeManifestoToMarkdown(
  meta: ManifestoMeta,
  items: ManifestoItem[],
  stopItems: string[] = STOP_DOING_ITEMS,
  doMoreItems: string[] = DO_MORE_ITEMS,
  signOff: ClosingSignOff = CLOSING_SIGN_OFF,
): string {
  const headerLines = [
    '---',
    `filename: ${meta.filename}`,
    `title: ${meta.title}`,
    `author: ${meta.author}`,
    `date: ${meta.date}`,
    ...meta.subtitles.map((line, i) => `subtitle_${i + 1}: ${line}`),
    `location: ${meta.location}`,
    '---',
    '',
    '## the actual (human) job',
    '',
  ];

  const bodyLines: string[] = [];

  items.forEach((item, idx) => {
    bodyLines.push(`### ${item.number}. ${item.title}`);
    bodyLines.push('');

    item.body.forEach((block) => {
      if (block.type === 'paragraph') {
        bodyLines.push(block.text);
        bodyLines.push('');
      } else if (block.type === 'bullets') {
        block.items.forEach((entry) => {
          bodyLines.push(`- ${entry}`);
        });
        bodyLines.push('');
      } else if (block.type === 'lines') {
        block.lines.forEach((line) => {
          bodyLines.push(`${line}  `);
        });
        bodyLines.push('');
      }
    });

    if (idx < items.length - 1) {
      bodyLines.push('---');
      bodyLines.push('');
    }
  });

  const closingLines = [
    '---',
    '',
    '## things I am trying to stop doing',
    '',
    ...stopItems.map((item) => `- ~~${item}~~`),
    '',
    '## things I am trying to do more',
    '',
    ...doMoreItems.map((item) => `- [x] ${item}`),
    '',
    '---',
    '',
    `*${signOff.disclaimer}*`,
    '',
    signOff.signature,
    `last touched: ${signOff.lastTouched}`,
    signOff.email,
  ];

  return [...headerLines, ...bodyLines, ...closingLines].join('\n').trimEnd() + '\n';
}
