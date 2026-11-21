import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Terminal } from '../components/Terminal';
import type { ManifestoItem } from '../data/manifestoItems';
import { ACCENT_PRESETS } from '../lib/accentTheme';
import type { ManifestoMeta } from '../lib/markdown';
import {
  createManifestoCommands,
  getUnknownCommandMessage,
  SITE_PAGES,
  type AccentChangeResult,
  type TerminalCommandContext,
  type TerminalLineInput,
} from '../lib/terminalCommands';

const TEST_META: ManifestoMeta = {
  filename: 'WORKING_COPY.md',
  title: 'WORKING_COPY.md',
  subtitles: ['notes-to-self, mostly.'],
  author: 'Test Author',
  date: 'Nov 2026',
  location: 'Plain Text, UTF-8',
};

const TEST_ITEMS: ManifestoItem[] = [
  {
    number: 1,
    slug: 'write-the-pr-description',
    title: 'write the pull request description before you hit submit',
    date: '2026-02-14',
    tags: ['pull-requests'],
    summary: 'Three honest sentences save forty minutes of archaeology.',
    draft: false,
    readingTimeMinutes: 1,
    wordCount: 40,
    toc: [],
    prev: null,
    next: null,
    body: [
      { type: 'paragraph', text: 'Explain *what* changed and why.' },
      { type: 'bullets', items: ['Context', 'Trade-off'] },
    ],
    rawBody: 'Explain *what* changed and why.',
  },
  {
    number: 2,
    slug: 'name-things-for-2am',
    title: 'name things for the engineer holding cold coffee at 2am',
    date: '2026-03-01',
    tags: ['naming'],
    summary: 'Clear names outlast clever ones.',
    draft: false,
    readingTimeMinutes: 1,
    wordCount: 32,
    toc: [],
    prev: null,
    next: null,
    body: [{ type: 'lines', lines: ['Name what it returns.', 'Not how it computes.'] }],
    rawBody: 'Name what it returns.',
  },
  {
    number: 3,
    slug: 'delete-dead-code',
    title: 'delete dead code before celebrating new code',
    date: '2026-04-01',
    tags: ['refactoring'],
    summary: 'Every deleted branch is a bug that can never wake you up.',
    draft: false,
    readingTimeMinutes: 1,
    wordCount: 28,
    toc: [],
    prev: null,
    next: null,
    body: [{ type: 'paragraph', text: 'Git remembers what you tried.' }],
    rawBody: 'Git remembers what you tried.',
  },
];

function createMockContext(
  registry: ReturnType<typeof createManifestoCommands>,
  args: string[] = [],
  rawArgs = args.join(' '),
) {
  const printed: TerminalLineInput[] = [];
  const streamed: { lines: TerminalLineInput[]; intervalMs?: number }[] = [];
  const clear = vi.fn();
  const navigate = vi.fn();
  const playCoffeeAnimation = vi.fn();
  const setAccent = vi.fn<(name: string) => AccentChangeResult>((name) => {
    const preset = ACCENT_PRESETS[name.toLowerCase()];
    if (!preset) {
      return {
        ok: false,
        label: name,
        available: Object.keys(ACCENT_PRESETS),
      };
    }
    return {
      ok: true,
      label: preset.label,
      hex: preset.hex,
      available: Object.keys(ACCENT_PRESETS),
    };
  });

  const ctx: TerminalCommandContext = {
    args,
    rawArgs,
    print: (...lines) => printed.push(...lines),
    stream: (lines, intervalMs) => streamed.push({ lines, intervalMs }),
    clear,
    navigate,
    setAccent,
    playCoffeeAnimation,
    registry,
  };

  return { ctx, printed, streamed, clear, navigate, setAccent, playCoffeeAnimation };
}

describe('terminal command registry', () => {
  it('help lists all visible commands and hides Easter-egg commands', () => {
    const registry = createManifestoCommands(TEST_META, TEST_ITEMS);
    const { ctx, printed } = createMockContext(registry);

    registry.help.run(ctx);

    const output = printed.map((l) => l.text).join('\n');
    expect(output).toContain('available commands');
    for (const cmd of [
      'help',
      'about',
      'manifesto',
      'random',
      'ls',
      'cd <page>',
      'cat <1-10>',
      'theme <accent>',
      'clear',
      'whoami',
    ]) {
      expect(output).toContain(cmd);
    }
    expect(output).not.toContain('sudo');
    expect(output).not.toContain('coffee');
    expect(output).not.toContain('42');
  });

  it('about prints manifesto metadata and principle count', () => {
    const registry = createManifestoCommands(TEST_META, TEST_ITEMS);
    const { ctx, printed } = createMockContext(registry);

    registry.about.run(ctx);

    const output = printed.map((l) => l.text).join('\n');
    expect(output).toContain('WORKING_COPY.md — Test Author · Nov 2026');
    expect(output).toContain('3 principles');
    expect(output).toContain('Plain Text, UTF-8');
  });

  it('manifesto streams all principles in order and appends end of file', () => {
    const registry = createManifestoCommands(TEST_META, TEST_ITEMS);
    const { ctx, streamed } = createMockContext(registry);

    registry.manifesto.run(ctx);

    expect(streamed).toHaveLength(1);
    const texts = streamed[0].lines.map((l) => l.text);
    expect(texts[0]).toContain('streaming 3 principles');
    expect(texts.some((t) => t.includes('### 01. write the pull request description'))).toBe(true);
    expect(texts.some((t) => t.includes('Explain what changed and why.'))).toBe(true);
    expect(texts.some((t) => t.includes('– Context'))).toBe(true);
    expect(texts.some((t) => t.includes('| Name what it returns.'))).toBe(true);
    expect(texts.some((t) => t.includes('### 03. delete dead code'))).toBe(true);
    expect(texts[texts.length - 1]).toBe('— end of file.');
  });

  it('random prints a principle and avoids immediate back-to-back repeats', () => {
    const registry = createManifestoCommands(TEST_META, TEST_ITEMS);
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    try {
      const first = createMockContext(registry);
      registry.random.run(first.ctx);
      const second = createMockContext(registry);
      registry.random.run(second.ctx);

      expect(first.printed[0].text).toContain('### 01.');
      expect(second.printed[0].text).toContain('### 02.');
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('random safely no-ops when given an empty principle list', () => {
    const registry = createManifestoCommands(TEST_META, []);
    const { ctx, printed } = createMockContext(registry);

    registry.random.run(ctx);
    expect(printed).toHaveLength(0);
  });

  it('ls lists every site page and the cat hint', () => {
    const registry = createManifestoCommands(TEST_META, TEST_ITEMS);
    const { ctx, printed } = createMockContext(registry);

    registry.ls.run(ctx);

    const output = printed.map((l) => l.text).join('\n');
    for (const page of SITE_PAGES) {
      expect(output).toContain(`${page.slug}/`);
    }
    expect(output).toContain('use "cat <1-3>" to read a principle');
  });

  it('cd navigates to canonical pages, aliases, handles terminal self-target, and rejects unknown destinations', () => {
    const registry = createManifestoCommands(TEST_META, TEST_ITEMS);

    // Canonical route
    const wallRun = createMockContext(registry, ['wall']);
    registry.cd.run(wallRun.ctx);
    expect(wallRun.navigate).toHaveBeenCalledWith('wall');

    // Alias resolution (`..` -> `home`, `museum` -> `bug-museum`, `books` -> `shelf`)
    const parentRun = createMockContext(registry, ['..']);
    registry.cd.run(parentRun.ctx);
    expect(parentRun.navigate).toHaveBeenCalledWith('home');

    const aliasRun = createMockContext(registry, ['museum']);
    registry.cd.run(aliasRun.ctx);
    expect(aliasRun.navigate).toHaveBeenCalledWith('bug-museum');

    // Self-target
    const selfRun = createMockContext(registry, ['terminal']);
    registry.cd.run(selfRun.ctx);
    expect(selfRun.navigate).not.toHaveBeenCalled();
    expect(selfRun.printed[0].text).toContain('already standing inside /terminal');

    // Unknown page
    const badRun = createMockContext(registry, ['mars']);
    registry.cd.run(badRun.ctx);
    expect(badRun.navigate).not.toHaveBeenCalled();
    expect(badRun.printed[0]).toMatchObject({
      kind: 'error',
      text: expect.stringContaining('no such page "mars"'),
    });

    // Autocomplete suggestions
    expect(registry.cd.completeArgs?.()).toEqual(SITE_PAGES.map((p) => p.slug));
  });

  it('cat prints a valid principle, handles missing/invalid args, and tips for the filename', () => {
    const registry = createManifestoCommands(TEST_META, TEST_ITEMS);

    const valid = createMockContext(registry, ['2']);
    registry.cat.run(valid.ctx);
    expect(valid.printed[0].text).toContain('### 02. name things for the engineer');

    const missing = createMockContext(registry, []);
    registry.cat.run(missing.ctx);
    expect(missing.printed[0]).toMatchObject({
      kind: 'error',
      text: expect.stringContaining('usage: cat <1-3>'),
    });

    const filenameTip = createMockContext(registry, ['WORKING_COPY.md']);
    registry.cat.run(filenameTip.ctx);
    expect(filenameTip.printed[0].text).toContain('run "manifesto"');

    const outOfRange = createMockContext(registry, ['99']);
    registry.cat.run(outOfRange.ctx);
    expect(outOfRange.printed[0]).toMatchObject({
      kind: 'error',
      text: expect.stringContaining('principle "99" not found'),
    });

    expect(registry.cat.completeArgs?.()).toEqual(['1', '2', '3']);
  });

  it('theme lists available accents without args, applies valid accents, and rejects unknown accents', () => {
    const registry = createManifestoCommands(TEST_META, TEST_ITEMS);

    const listRun = createMockContext(registry, []);
    registry.theme.run(listRun.ctx);
    const listed = listRun.printed.map((l) => l.text).join('\n');
    expect(listed).toContain('available accents');
    for (const presetName of Object.keys(ACCENT_PRESETS)) {
      expect(listed).toContain(presetName);
    }

    const okRun = createMockContext(registry, ['lime']);
    registry.theme.run(okRun.ctx);
    expect(okRun.setAccent).toHaveBeenCalledWith('lime');
    expect(okRun.printed[0]).toMatchObject({
      kind: 'accent',
      text: expect.stringContaining('accent updated ->'),
    });

    const badRun = createMockContext(registry, ['ultraviolet']);
    registry.theme.run(badRun.ctx);
    expect(badRun.printed[0]).toMatchObject({
      kind: 'error',
      text: expect.stringContaining('unknown accent "ultraviolet"'),
    });

    expect(registry.theme.completeArgs?.()).toEqual(Object.keys(ACCENT_PRESETS));
  });

  it('clear and whoami behave as expected', () => {
    const registry = createManifestoCommands(TEST_META, TEST_ITEMS);

    const clearRun = createMockContext(registry);
    registry.clear.run(clearRun.ctx);
    expect(clearRun.clear).toHaveBeenCalledTimes(1);

    const whoamiRun = createMockContext(registry);
    registry.whoami.run(whoamiRun.ctx);
    expect(whoamiRun.printed[0].text).toContain('working-engineer (uid=1000)');
  });

  it('hidden commands sudo, coffee, and 42 respond playfully', () => {
    const registry = createManifestoCommands(TEST_META, TEST_ITEMS);
    expect(registry.sudo.hidden).toBe(true);
    expect(registry.coffee.hidden).toBe(true);
    expect(registry['42'].hidden).toBe(true);

    const sudoDefault = createMockContext(registry, ['reboot'], 'reboot');
    registry.sudo.run(sudoDefault.ctx);
    expect(sudoDefault.printed[0].text).toContain('not in the sudoers file');

    const sudoRm = createMockContext(registry, ['rm', '-rf', '/'], 'rm -rf /');
    registry.sudo.run(sudoRm.ctx);
    expect(sudoRm.printed[0].text).toContain('we delete dead code here');

    const sudoSandwich = createMockContext(
      registry,
      ['make', 'me', 'a', 'sandwich'],
      'make me a sandwich',
    );
    registry.sudo.run(sudoSandwich.ctx);
    expect(sudoSandwich.printed[0].text).toContain('sourdough');

    const coffeeRun = createMockContext(registry);
    registry.coffee.run(coffeeRun.ctx);
    expect(coffeeRun.playCoffeeAnimation).toHaveBeenCalledTimes(1);

    const answerRun = createMockContext(registry);
    registry['42'].run(answerRun.ctx);
    expect(answerRun.printed[0].text).toBe('42');
    expect(answerRun.printed[1].text).toContain('empty pull request description');
  });

  it('getUnknownCommandMessage returns rotating friendly error replies naming the command', () => {
    const replies = new Set([
      getUnknownCommandMessage('foobar'),
      getUnknownCommandMessage('foobar'),
      getUnknownCommandMessage('foobar'),
      getUnknownCommandMessage('foobar'),
    ]);

    expect(replies.size).toBe(4);
    for (const msg of replies) {
      expect(msg).toContain('foobar');
      expect(msg).toContain('help');
    }
  });
});

describe('<Terminal /> interactive behavior', () => {
  function renderTerminal() {
    const commands = createManifestoCommands(TEST_META, TEST_ITEMS);
    const onNavigate = vi.fn();
    const onAccentChange = vi.fn<(name: string) => AccentChangeResult>((name) => {
      const preset = ACCENT_PRESETS[name.toLowerCase()];
      return preset
        ? { ok: true, label: preset.label, hex: preset.hex, available: Object.keys(ACCENT_PRESETS) }
        : { ok: false, label: name, available: Object.keys(ACCENT_PRESETS) };
    });

    render(
      <Terminal
        commands={commands}
        welcomeLines={[{ kind: 'muted', text: 'welcome test' }]}
        onNavigate={onNavigate}
        onAccentChange={onAccentChange}
      />,
    );

    const input = screen.getByRole('textbox', {
      name: /terminal command input/i,
    });
    return { input, onNavigate, onAccentChange };
  }

  it('runs known commands, replies with a funny error on unknown commands, and clears output', async () => {
    const user = userEvent.setup();
    const { input } = renderTerminal();

    await user.type(input, 'whoami{Enter}');
    expect(screen.getByText(/working-engineer \(uid=1000\)/i)).toBeInTheDocument();

    await user.type(input, 'notarealcmd{Enter}');
    expect(screen.getByText(/notarealcmd/i, { selector: 'div' })).toBeInTheDocument();

    await user.type(input, 'clear{Enter}');
    expect(screen.queryByText(/working-engineer \(uid=1000\)/i)).not.toBeInTheDocument();
  });

  it('navigates command history with ArrowUp and ArrowDown and restores unsent draft', async () => {
    const user = userEvent.setup();
    const { input } = renderTerminal();

    await user.type(input, 'whoami{Enter}');
    await user.type(input, 'about{Enter}');
    // Consecutive duplicate should not add a duplicate history entry
    await user.type(input, 'about{Enter}');

    // Start typing a draft, then walk backward and forward through history
    await user.type(input, 'cat');
    expect(input).toHaveValue('cat');

    await user.keyboard('{ArrowUp}');
    expect(input).toHaveValue('about');

    await user.keyboard('{ArrowUp}');
    expect(input).toHaveValue('whoami');

    // Staying at oldest entry does not crash or overshoot
    await user.keyboard('{ArrowUp}');
    expect(input).toHaveValue('whoami');

    await user.keyboard('{ArrowDown}');
    expect(input).toHaveValue('about');

    await user.keyboard('{ArrowDown}');
    expect(input).toHaveValue('cat');
  });

  it('autocompletes commands, ambiguous command prefixes, and command arguments with Tab', async () => {
    const user = userEvent.setup();
    const { input } = renderTerminal();

    // Unique command with no arguments
    await user.type(input, 'who');
    await user.keyboard('{Tab}');
    expect(input).toHaveValue('whoami');

    // Unique command that accepts arguments gets a trailing space
    await user.clear(input);
    await user.type(input, 'the');
    await user.keyboard('{Tab}');
    expect(input).toHaveValue('theme ');

    // Argument completion (`theme li` -> `theme lime`)
    await user.type(input, 'li');
    await user.keyboard('{Tab}');
    expect(input).toHaveValue('theme lime');

    // Page argument completion (`cd pl` -> `cd playground`)
    await user.clear(input);
    await user.type(input, 'cd pl');
    await user.keyboard('{Tab}');
    expect(input).toHaveValue('cd playground');

    // Ambiguous command prefix (`c` -> prints `cat   cd   clear`)
    await user.clear(input);
    await user.type(input, 'c');
    await user.keyboard('{Tab}');
    expect(screen.getByText(/cat\s+cd\s+clear/)).toBeInTheDocument();
  });

  it('keeps typing sound off by default and lets the user toggle it on', async () => {
    const user = userEvent.setup();
    renderTerminal();

    const toggle = screen.getByRole('button', { name: /sound: off/i });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggle);
    expect(toggle).toHaveTextContent(/sound: on/i);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });
});
