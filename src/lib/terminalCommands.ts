import type { ManifestoItem } from '../data/manifestoItems';
import type { ManifestoMeta } from './markdown';
import { ACCENT_PRESETS } from './accentTheme';

export type TerminalLineKind =
  | 'input'
  | 'output'
  | 'accent'
  | 'muted'
  | 'error'
  | 'ascii'
  | 'heading';

export interface TerminalLine {
  id: string;
  kind: TerminalLineKind;
  text: string;
}

export type TerminalLineInput = Omit<TerminalLine, 'id'>;

export interface AccentChangeResult {
  ok: boolean;
  label: string;
  hex?: string;
  available: string[];
}

export interface TerminalCommandContext {
  args: string[];
  rawArgs: string;
  print: (...lines: TerminalLineInput[]) => void;
  stream: (lines: TerminalLineInput[], intervalMs?: number) => void;
  clear: () => void;
  navigate: (target: string) => void;
  setAccent: (name: string) => AccentChangeResult;
  playCoffeeAnimation: () => void;
  registry: CommandRegistry;
}

export interface TerminalCommand {
  description: string;
  usage?: string;
  hidden?: boolean;
  /** Optional static argument suggestions for Tab autocomplete */
  completeArgs?: () => string[];
  run: (ctx: TerminalCommandContext) => void;
}

export type CommandRegistry = Record<string, TerminalCommand>;

export const SITE_PAGES = [
  { slug: 'home', path: '/', note: 'hero & title plate' },
  { slug: 'statements', path: '/#statements', note: 'six pinned statements' },
  { slug: 'transition', path: '/#transition', note: 'the actual (human) job' },
  { slug: 'read', path: '/#read', note: 'ten working principles' },
  { slug: 'closing', path: '/#closing', note: 'stop / do more & sign-off' },
  { slug: 'raw', path: '/?view=raw', note: 'plain-text markdown view' },
  { slug: 'bug-museum', path: '/bug-museum', note: '8 anonymized bug exhibits' },
  { slug: 'commit-log', path: '/commit-log', note: 'principles as git history' },
  { slug: 'delete', path: '/delete', note: 'the joy of deleting code' },
  { slug: 'playground', path: '/playground', note: 'generative art canvas' },
  { slug: 'wall', path: '/wall', note: 'community principles wall' },
  { slug: 'shelf', path: '/shelf', note: 'bookshelf & workbench tools' },
  { slug: 'today', path: '/today', note: 'principle of the day' },
  { slug: 'focus', path: '/focus', note: 'calm work session timer & log' },
  { slug: 'naming', path: '/naming', note: '10-round naming things game' },
  { slug: 'privacy', path: '/privacy', note: 'plain-language privacy notes' },
  { slug: 'terminal', path: '/terminal', note: 'you are here' },
] as const;

export const COFFEE_FRAMES: string[][] = [
  [
    '        ( (',
    '         ) )',
    '      ........',
    '      |      |]',
    '      \\      /',
    "       `----'",
  ],
  [
    '         ) (',
    '        ( )',
    '      ........',
    '      |      |]',
    '      \\      /',
    "       `----'",
  ],
  [
    '        ) )',
    '       ( (',
    '      ........',
    '      |      |]',
    '      \\      /',
    "       `----'",
  ],
];

const UNKNOWN_COMMAND_REPLIES = [
  (cmd: string) =>
    `command not found: "${cmd}". try "help" before anyone checks git blame.`,
  (cmd: string) =>
    `"${cmd}" is not in $PATH—probably deprecated last Tuesday. type "help" to see what survived.`,
  (cmd: string) =>
    `no manual entry for "${cmd}". run "help", or pretend you meant "coffee".`,
  (cmd: string) =>
    `zsh-ish: "${cmd}" walked out of the sprint. type "help" for available commands.`,
];

let unknownReplyIdx = 0;

export function getUnknownCommandMessage(cmd: string): string {
  const fn = UNKNOWN_COMMAND_REPLIES[unknownReplyIdx % UNKNOWN_COMMAND_REPLIES.length];
  unknownReplyIdx += 1;
  return fn(cmd);
}

function stripInlineMarkdown(text: string): string {
  return text.replace(/\*([^*]+)\*/g, '$1');
}

function formatPrincipleLines(item: ManifestoItem): TerminalLineInput[] {
  const lines: TerminalLineInput[] = [
    {
      kind: 'heading',
      text: `### ${String(item.number).padStart(2, '0')}. ${item.title}`,
    },
  ];

  item.body.forEach((block) => {
    if (block.type === 'paragraph') {
      lines.push({ kind: 'output', text: stripInlineMarkdown(block.text) });
    } else if (block.type === 'bullets') {
      block.items.forEach((entry) => {
        lines.push({
          kind: 'output',
          text: `  – ${stripInlineMarkdown(entry)}`,
        });
      });
    } else if (block.type === 'lines') {
      block.lines.forEach((line) => {
        lines.push({
          kind: 'muted',
          text: `  | ${stripInlineMarkdown(line)}`,
        });
      });
    }
  });

  lines.push({ kind: 'muted', text: '' });
  return lines;
}

/**
 * Builds the default command registry object.
 * Adding a new command is a single key-value entry here.
 */
export function createManifestoCommands(
  meta: ManifestoMeta,
  items: ManifestoItem[],
): CommandRegistry {
  let lastRandomNumber = -1;

  return {
    help: {
      description: 'list available commands and keyboard shortcuts',
      run: ({ print, registry }) => {
        const visibleEntries = Object.entries(registry).filter(
          ([, cmd]) => !cmd.hidden,
        );
        print(
          { kind: 'heading', text: 'available commands' },
          ...visibleEntries.map(([name, cmd]) => ({
            kind: 'output' as const,
            text: `  ${(cmd.usage ?? name).padEnd(20, ' ')} ${cmd.description}`,
          })),
          { kind: 'muted', text: '' },
          {
            kind: 'muted',
            text: 'shortcuts: ↑/↓ history · tab autocomplete · ctrl+l clear · ctrl+c stop stream',
          },
        );
      },
    },

    about: {
      description: 'what this working copy is and why it lives in plain text',
      run: ({ print }) => {
        print(
          { kind: 'heading', text: `${meta.title} — ${meta.author} · ${meta.date}` },
          {
            kind: 'output',
            text: 'A quiet field manual for working software engineers—honest about tight deadlines, shifting stacks, and self-doubt, and stubbornly devoted to making software that holds up.',
          },
          { kind: 'muted', text: '' },
          {
            kind: 'muted',
            text: `source: ~/${meta.filename} · ${items.length} principles · ${meta.location}`,
          },
        );
      },
    },

    manifesto: {
      description: 'print all 10 principles one at a time',
      run: ({ stream }) => {
        const queued: TerminalLineInput[] = [
          {
            kind: 'accent',
            text: `streaming ${items.length} principles from ~/${meta.filename} (ctrl+c to pause)...`,
          },
          { kind: 'muted', text: '' },
        ];
        items.forEach((item) => {
          queued.push(...formatPrincipleLines(item));
        });
        queued.push({ kind: 'accent', text: '— end of file.' });
        stream(queued, 240);
      },
    },

    random: {
      description: 'print one random principle',
      run: ({ print }) => {
        if (items.length === 0) return;
        let pick = items[Math.floor(Math.random() * items.length)];
        if (items.length > 1 && pick.number === lastRandomNumber) {
          const nextIdx = (items.indexOf(pick) + 1) % items.length;
          pick = items[nextIdx];
        }
        lastRandomNumber = pick.number;
        print(...formatPrincipleLines(pick));
      },
    },

    ls: {
      description: 'list site pages and readable principles',
      run: ({ print }) => {
        print(
          { kind: 'muted', text: 'total 17' },
          ...SITE_PAGES.map((page) => ({
            kind: (page.slug === 'terminal' ? 'accent' : 'output') as TerminalLineKind,
            text: `  drwxr-xr-x  ${`${page.slug}/`.padEnd(15, ' ')} ${page.note}`,
          })),
          {
            kind: 'muted',
            text: `  -rw-r--r--  ${meta.filename.padEnd(15, ' ')} use "cat <1-${items.length}>" to read a principle`,
          },
        );
      },
    },

    cd: {
      usage: 'cd <page>',
      description: 'navigate to a page or section (e.g. cd read, cd home)',
      completeArgs: () => SITE_PAGES.map((p) => p.slug),
      run: ({ args, print, navigate }) => {
        const raw = (args[0] ?? 'home').toLowerCase().replace(/^\/|\/$/g, '');
        const aliasMap: Record<string, string> = {
          '': 'home',
          '~': 'home',
          '..': 'home',
          top: 'home',
          home: 'home',
          statements: 'statements',
          transition: 'transition',
          job: 'transition',
          read: 'read',
          principles: 'read',
          closing: 'closing',
          signoff: 'closing',
          raw: 'raw',
          [meta.filename.toLowerCase()]: 'raw',
          'bug-museum': 'bug-museum',
          museum: 'bug-museum',
          bugs: 'bug-museum',
          'commit-log': 'commit-log',
          commits: 'commit-log',
          log: 'commit-log',
          git: 'commit-log',
          delete: 'delete',
          rm: 'delete',
          playground: 'playground',
          play: 'playground',
          art: 'playground',
          wall: 'wall',
          admin: 'admin',
          shelf: 'shelf',
          books: 'shelf',
          tools: 'shelf',
          today: 'today',
          daily: 'today',
          focus: 'focus',
          pomodoro: 'focus',
          timer: 'focus',
          naming: 'naming',
          names: 'naming',
          privacy: 'privacy',
          terminal: 'terminal',
        };

        const resolved = aliasMap[raw];
        if (!resolved) {
          print({
            kind: 'error',
            text: `cd: no such page "${args[0]}". run "ls" to see available destinations.`,
          });
          return;
        }

        if (resolved === 'terminal') {
          print({
            kind: 'muted',
            text: 'already standing inside /terminal. try "cd read" or "cd home".',
          });
          return;
        }

        print({
          kind: 'accent',
          text: `navigating to ${resolved}...`,
        });
        navigate(resolved);
      },
    },

    cat: {
      usage: 'cat <1-10>',
      description: 'read a single principle by number (e.g. cat 3)',
      completeArgs: () => items.map((i) => String(i.number)),
      run: ({ args, print }) => {
        const arg = args[0]?.trim();
        if (!arg) {
          print({
            kind: 'error',
            text: `usage: cat <1-${items.length}> (example: cat 2)`,
          });
          return;
        }

        if (arg.toLowerCase() === meta.filename.toLowerCase()) {
          print({
            kind: 'muted',
            text: `tip: run "manifesto" to stream all ${items.length} principles, or "cd raw" to open the full source.`,
          });
          return;
        }

        const num = Number.parseInt(arg, 10);
        const found = items.find((item) => item.number === num);
        if (!found) {
          print({
            kind: 'error',
            text: `cat: principle "${arg}" not found. valid numbers are 1 through ${items.length}.`,
          });
          return;
        }

        print(...formatPrincipleLines(found));
      },
    },

    theme: {
      usage: 'theme <accent>',
      description: 'change the live accent color (orange, lime, amber, sage, coral, ice)',
      completeArgs: () => Object.keys(ACCENT_PRESETS),
      run: ({ args, print, setAccent }) => {
        const target = args[0];
        if (!target) {
          print(
            { kind: 'heading', text: 'available accents' },
            ...Object.values(ACCENT_PRESETS).map((preset) => ({
              kind: 'output' as const,
              text: `  ${preset.name.padEnd(10, ' ')} ${preset.hex}  — ${preset.label}`,
            })),
            { kind: 'muted', text: 'usage: theme <accent> (example: theme lime)' },
          );
          return;
        }

        const result = setAccent(target);
        if (!result.ok) {
          print({
            kind: 'error',
            text: `theme: unknown accent "${target}". choose one of: ${result.available.join(', ')}.`,
          });
          return;
        }

        print({
          kind: 'accent',
          text: `accent updated -> ${result.label} [${result.hex}]`,
        });
      },
    },

    clear: {
      description: 'clear terminal output',
      run: ({ clear }) => clear(),
    },

    whoami: {
      description: 'print current working identity',
      run: ({ print }) => {
        print(
          { kind: 'accent', text: 'working-engineer (uid=1000)' },
          {
            kind: 'output',
            text: 'holds cold coffee, checks git blame before judging, still loves watching a clean build go green.',
          },
        );
      },
    },

    /* ---------------- Hidden Easter-Egg Commands ---------------- */

    sudo: {
      description: 'playful refusal',
      hidden: true,
      run: ({ rawArgs, print }) => {
        const lower = rawArgs.toLowerCase();
        if (lower.includes('rm -rf')) {
          print({
            kind: 'error',
            text: 'permission denied: we delete dead code here, not the entire filesystem.',
          });
          return;
        }
        if (lower.includes('make me a sandwich')) {
          print({
            kind: 'accent',
            text: 'okay, fine. sourdough, sharp cheddar, no meetings until 2pm.',
          });
          return;
        }
        print(
          {
            kind: 'error',
            text: 'guest is not in the sudoers file.',
          },
          {
            kind: 'muted',
            text: 'this incident has been quietly logged next to whoever owns the 2am pager.',
          },
        );
      },
    },

    coffee: {
      description: 'brew a warm ASCII cup',
      hidden: true,
      run: ({ playCoffeeAnimation }) => {
        playCoffeeAnimation();
      },
    },

    '42': {
      description: 'the answer without the context',
      hidden: true,
      run: ({ print }) => {
        print(
          { kind: 'accent', text: '42' },
          {
            kind: 'output',
            text: 'correct answer, empty pull request description. please add three sentences explaining the question.',
          },
        );
      },
    },
  };
}
