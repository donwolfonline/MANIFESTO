import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { usePrefersReducedMotion } from '../lib/useViewportActivity';
import {
  COFFEE_FRAMES,
  getUnknownCommandMessage,
  type AccentChangeResult,
  type CommandRegistry,
  type TerminalLine,
  type TerminalLineInput,
} from '../lib/terminalCommands';
import { typingSound } from '../lib/typingSound';

export interface TerminalProps {
  /** Command registry object — adding a new command is one entry */
  commands: CommandRegistry;
  /** Shell prompt displayed before user input */
  prompt?: string;
  /** Initial banner lines shown on mount */
  welcomeLines?: TerminalLineInput[];
  /** Quick-tap command suggestions for mobile / mouse convenience */
  quickCommands?: string[];
  /** Handler invoked by `cd <page>` */
  onNavigate: (target: string) => void;
  /** Handler invoked by `theme <accent>` */
  onAccentChange: (accentName: string) => AccentChangeResult;
  /** Optional handler to exit terminal back to the editorial page */
  onExit?: () => void;
  /** Current accent name displayed in the terminal chrome */
  activeAccentName?: string;
}

let lineUid = 0;
function makeLine(input: TerminalLineInput): TerminalLine {
  lineUid += 1;
  return { id: `term-line-${lineUid}`, ...input };
}

function getLineStyle(kind: TerminalLine['kind']) {
  switch (kind) {
    case 'heading':
      return { color: 'var(--color-text)', fontWeight: 500 };
    case 'accent':
      return { color: 'var(--color-accent)' };
    case 'error':
      return { color: 'var(--color-accent)' };
    case 'muted':
      return { color: 'var(--color-text-muted)' };
    case 'ascii':
      return { color: 'var(--color-text)', whiteSpace: 'pre' as const };
    case 'input':
      return { color: 'var(--color-text)' };
    case 'output':
    default:
      return { color: 'var(--color-text-secondary)' };
  }
}

export function Terminal({
  commands,
  prompt = 'guest@working-copy:~$',
  welcomeLines = [],
  quickCommands = [
    'help',
    'manifesto',
    'random',
    'ls',
    'coffee',
    'theme lime',
    'cd naming',
    'cd today',
    'clear',
  ],
  onNavigate,
  onAccentChange,
  onExit,
  activeAccentName = 'orange',
}: TerminalProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const [lines, setLines] = useState<TerminalLine[]>(() =>
    welcomeLines.map(makeLine),
  );
  const [input, setInput] = useState('');
  const [caretPos, setCaretPos] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [historyCursor, setHistoryCursor] = useState<number>(-1);
  const [draftBeforeHistory, setDraftBeforeHistory] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const outputEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const streamTimerRef = useRef<number | null>(null);
  const coffeeTimerRef = useRef<number | null>(null);

  const visibleCommandNames = useMemo(
    () =>
      Object.entries(commands)
        .filter(([, def]) => !def.hidden)
        .map(([name]) => name)
        .sort(),
    [commands],
  );

  const stopActiveTimers = useCallback(() => {
    if (streamTimerRef.current !== null) {
      window.clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
      setIsStreaming(false);
    }
    if (coffeeTimerRef.current !== null) {
      window.clearInterval(coffeeTimerRef.current);
      coffeeTimerRef.current = null;
    }
  }, []);

  useEffect(() => stopActiveTimers, [stopActiveTimers]);

  // Auto-focus input on desktop mount for immediate typing
  useEffect(() => {
    const isFinePointer = window.matchMedia('(pointer: fine)').matches;
    if (isFinePointer) {
      inputRef.current?.focus();
    }
  }, []);

  // Keep output scrolled cleanly to the latest line
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [lines]);

  const appendLines = useCallback((...newLines: TerminalLineInput[]) => {
    setLines((prev) => [...prev, ...newLines.map(makeLine)]);
  }, []);

  const streamLines = useCallback(
    (queued: TerminalLineInput[], intervalMs = 220) => {
      stopActiveTimers();

      if (prefersReducedMotion || queued.length === 0) {
        setLines((prev) => [...prev, ...queued.map(makeLine)]);
        return;
      }

      let cursor = 0;
      setIsStreaming(true);

      // Print the first line immediately so the user gets instant feedback
      setLines((prev) => [...prev, makeLine(queued[0])]);
      cursor = 1;

      if (cursor >= queued.length) {
        setIsStreaming(false);
        return;
      }

      streamTimerRef.current = window.setInterval(() => {
        const nextLine = queued[cursor];
        cursor += 1;

        if (nextLine) {
          setLines((prev) => [...prev, makeLine(nextLine)]);
        }

        if (cursor >= queued.length) {
          if (streamTimerRef.current !== null) {
            window.clearInterval(streamTimerRef.current);
            streamTimerRef.current = null;
          }
          setIsStreaming(false);
        }
      }, intervalMs);
    },
    [prefersReducedMotion, stopActiveTimers],
  );

  const playCoffeeAnimation = useCallback(() => {
    stopActiveTimers();

    const frameIdPrefix = `coffee-${Date.now()}`;
    const frameIds = COFFEE_FRAMES[0].map((_, idx) => `${frameIdPrefix}-${idx}`);

    const initialCup: TerminalLine[] = [
      makeLine({
        kind: 'accent',
        text: 'brewing fresh pot (hold on to your 2am mug)...',
      }),
      ...COFFEE_FRAMES[0].map((line, idx) => ({
        id: frameIds[idx],
        kind: 'ascii' as const,
        text: line,
      })),
      makeLine({
        kind: 'muted',
        text: 'fresh coffee ready. close the laptop if it is past 8pm.',
      }),
    ];

    setLines((prev) => [...prev, ...initialCup]);

    if (prefersReducedMotion) return;

    let tick = 1;
    const totalTicks = 12;

    coffeeTimerRef.current = window.setInterval(() => {
      const frame = COFFEE_FRAMES[tick % COFFEE_FRAMES.length];
      setLines((prev) =>
        prev.map((line) => {
          const slotIdx = frameIds.indexOf(line.id);
          if (slotIdx === -1) return line;
          return { ...line, text: frame[slotIdx] };
        }),
      );

      tick += 1;
      if (tick >= totalTicks && coffeeTimerRef.current !== null) {
        window.clearInterval(coffeeTimerRef.current);
        coffeeTimerRef.current = null;
      }
    }, 340);
  }, [prefersReducedMotion, stopActiveTimers]);

  const executeCommand = useCallback(
    (rawInput: string) => {
      const trimmed = rawInput.trim();
      stopActiveTimers();

      // Always echo the prompt + command into the log
      appendLines({
        kind: 'input',
        text: `${prompt} ${trimmed}`,
      });

      if (!trimmed) return;

      setHistory((prev) =>
        prev[prev.length - 1] === trimmed ? prev : [...prev, trimmed],
      );
      setHistoryCursor(-1);
      setDraftBeforeHistory('');

      const parts = trimmed.split(/\s+/);
      const commandKey = parts[0].toLowerCase();
      const args = parts.slice(1);
      const rawArgs = trimmed.slice(parts[0].length).trim();

      const command = commands[commandKey];
      if (!command) {
        appendLines({
          kind: 'error',
          text: getUnknownCommandMessage(parts[0]),
        });
        return;
      }

      command.run({
        args,
        rawArgs,
        print: appendLines,
        stream: streamLines,
        clear: () => {
          stopActiveTimers();
          setLines([]);
        },
        navigate: onNavigate,
        setAccent: onAccentChange,
        playCoffeeAnimation,
        registry: commands,
      });
    },
    [
      appendLines,
      commands,
      onAccentChange,
      onNavigate,
      playCoffeeAnimation,
      prompt,
      stopActiveTimers,
      streamLines,
    ],
  );

  const updateInputValue = useCallback((nextValue: string) => {
    setInput(nextValue);
    setCaretPos(nextValue.length);
  }, []);

  const syncCaretFromInput = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    setCaretPos(el.selectionStart ?? el.value.length);
  }, []);

  const triggerCtrlC = useCallback(() => {
    if (isStreaming) {
      stopActiveTimers();
      appendLines({ kind: 'muted', text: '^C (stopped)' });
    } else if (input) {
      appendLines({ kind: 'input', text: `${prompt} ${input}^C` });
      updateInputValue('');
    }
    inputRef.current?.focus();
  }, [appendLines, input, isStreaming, prompt, stopActiveTimers, updateInputValue]);

  const stepHistoryUp = useCallback(() => {
    if (history.length === 0) return;
    if (historyCursor === -1) {
      setDraftBeforeHistory(input);
      const lastIdx = history.length - 1;
      setHistoryCursor(lastIdx);
      updateInputValue(history[lastIdx]);
    } else if (historyCursor > 0) {
      const nextIdx = historyCursor - 1;
      setHistoryCursor(nextIdx);
      updateInputValue(history[nextIdx]);
    }
    inputRef.current?.focus();
  }, [history, historyCursor, input, updateInputValue]);

  const stepHistoryDown = useCallback(() => {
    if (historyCursor === -1) return;
    if (historyCursor < history.length - 1) {
      const nextIdx = historyCursor + 1;
      setHistoryCursor(nextIdx);
      updateInputValue(history[nextIdx]);
    } else {
      setHistoryCursor(-1);
      updateInputValue(draftBeforeHistory);
    }
    inputRef.current?.focus();
  }, [draftBeforeHistory, history, historyCursor, updateInputValue]);

  const triggerAutocomplete = useCallback(() => {
    const trimmedStart = input.trimStart();
    if (!trimmedStart) return;

    const hasSpace = trimmedStart.includes(' ');
    if (!hasSpace) {
      const query = trimmedStart.toLowerCase();
      const matches = visibleCommandNames.filter((name) =>
        name.startsWith(query),
      );
      if (matches.length === 1) {
        const matchedCmd = commands[matches[0]];
        const needsArg = Boolean(matchedCmd?.completeArgs);
        updateInputValue(needsArg ? `${matches[0]} ` : matches[0]);
      } else if (matches.length > 1) {
        appendLines(
          { kind: 'input', text: `${prompt} ${trimmedStart}` },
          { kind: 'muted', text: matches.join('   ') },
        );
      }
      inputRef.current?.focus();
      return;
    }

    const firstSpace = trimmedStart.indexOf(' ');
    const cmdName = trimmedStart.slice(0, firstSpace).toLowerCase();
    const argPrefix = trimmedStart.slice(firstSpace + 1).toLowerCase();
    const cmdDef = commands[cmdName];
    const candidates = cmdDef?.completeArgs?.() ?? [];
    const argMatches = candidates.filter((c) =>
      c.toLowerCase().startsWith(argPrefix),
    );

    if (argMatches.length === 1) {
      updateInputValue(`${cmdName} ${argMatches[0]}`);
    } else if (argMatches.length > 1) {
      appendLines(
        { kind: 'input', text: `${prompt} ${trimmedStart}` },
        { kind: 'muted', text: argMatches.join('   ') },
      );
    }
    inputRef.current?.focus();
  }, [appendLines, commands, input, prompt, updateInputValue, visibleCommandNames]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (soundEnabled) typingSound.playKey('enter');
    const toRun = input;
    updateInputValue('');
    executeCommand(toRun);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Ctrl+L clears terminal cleanly
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
      event.preventDefault();
      stopActiveTimers();
      setLines([]);
      return;
    }

    // Ctrl+C cancels active streaming output or clears current input line
    if (event.ctrlKey && event.key.toLowerCase() === 'c') {
      event.preventDefault();
      triggerCtrlC();
      return;
    }

    // Up arrow: previous command in history
    if (event.key === 'ArrowUp') {
      if (history.length === 0) return;
      event.preventDefault();
      stepHistoryUp();
      return;
    }

    // Down arrow: next command in history or back to saved draft
    if (event.key === 'ArrowDown') {
      if (historyCursor === -1) return;
      event.preventDefault();
      stepHistoryDown();
      return;
    }

    // Tab autocomplete for commands and arguments
    if (event.key === 'Tab') {
      event.preventDefault();
      triggerAutocomplete();
      return;
    }

    // Optional subtle typing audio (off by default)
    if (soundEnabled && !event.ctrlKey && !event.metaKey && !event.altKey) {
      if (event.key === 'Backspace') {
        typingSound.playKey('backspace');
      } else if (event.key.length === 1) {
        typingSound.playKey('key');
      }
    }
  };

  const handleViewportClick = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;
    inputRef.current?.focus();
  };

  return (
    <div
      className="cq-terminal w-full max-w-[92ch] mx-auto border flex flex-col overflow-hidden"
      style={{
        borderColor: 'var(--color-border-strong)',
        backgroundColor: 'var(--color-bg-deep)',
        borderRadius: 'var(--radius-sm)',
        minHeight: 'min(76dvh, 44rem)',
        maxHeight: 'min(82dvh, 52rem)',
      }}
    >
      {/* Terminal window top bar */}
      <div
        className="shrink-0 px-4 sm:px-5 py-3 border-b flex flex-wrap items-center justify-between gap-3 font-mono"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg)',
          fontSize: 'var(--text-micro)',
        }}
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5" aria-hidden="true">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: 'var(--color-accent)' }}
            />
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: 'var(--color-border-strong)' }}
            />
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: 'var(--color-border)' }}
            />
          </span>

          <span
            className="uppercase tracking-[var(--tracking-micro)]"
            style={{ color: 'var(--color-text)' }}
          >
            /terminal
          </span>

          <span
            className="hidden sm:inline uppercase tracking-[var(--tracking-micro)]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            · accent: {activeAccentName}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            aria-pressed={soundEnabled}
            className="font-mono uppercase tracking-[var(--tracking-micro)] px-2 py-0.5 border transition-colors cursor-pointer"
            style={{
              fontSize: 'var(--text-micro)',
              borderRadius: 'var(--radius-xs)',
              borderColor: soundEnabled
                ? 'var(--color-accent)'
                : 'var(--color-border)',
              color: soundEnabled
                ? 'var(--color-accent)'
                : 'var(--color-text-muted)',
              backgroundColor: soundEnabled
                ? 'var(--color-accent-soft)'
                : 'transparent',
            }}
          >
            sound: {soundEnabled ? 'on' : 'off'}
          </button>

          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="link-draw font-mono uppercase tracking-[var(--tracking-micro)] cursor-pointer"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              exit →
            </button>
          )}
        </div>
      </div>

      {/* Scrollable terminal log + live inline prompt */}
      <div
        ref={scrollContainerRef}
        onClick={handleViewportClick}
        data-lenis-prevent
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 font-mono cursor-text"
        style={{
          fontSize: 'var(--text-meta)',
          lineHeight: 1.65,
        }}
      >
        <div
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label="Terminal output"
          className="space-y-1.5"
        >
          {lines.map((line) => (
            <div
              key={line.id}
              className="break-words whitespace-pre-wrap"
              style={getLineStyle(line.kind)}
            >
              {line.kind === 'input' ? (
                <>
                  <span style={{ color: 'var(--color-accent)' }}>
                    {line.text.slice(0, prompt.length)}
                  </span>
                  <span>{line.text.slice(prompt.length)}</span>
                </>
              ) : line.text === '' ? (
                '\u00A0'
              ) : (
                line.text
              )}
            </div>
          ))}
        </div>

        {/* Interactive prompt & keyboard/mobile-accessible text input */}
        <form
          onSubmit={handleSubmit}
          className="mt-3 flex flex-wrap sm:flex-nowrap items-center gap-2"
        >
          <label
            htmlFor="terminal-command-input"
            className="shrink-0 select-none"
            style={{ color: 'var(--color-accent)' }}
          >
            {prompt}
          </label>

          <div className="relative flex-1 min-w-[12rem] flex items-center">
            {/* Mirror span positions the blinking block cursor at the exact caret index on desktop */}
            <span
              aria-hidden="true"
              className="hidden sm:inline-flex items-center whitespace-pre pointer-events-none select-none"
              style={{ color: 'var(--color-text)' }}
            >
              <span>{input.slice(0, caretPos)}</span>
              <span
                className={`inline-block min-w-[0.65ch] text-center ${
                  isFocused && !prefersReducedMotion
                    ? 'terminal-cursor-blink'
                    : ''
                }`}
                style={{
                  backgroundColor: isFocused
                    ? 'var(--color-accent)'
                    : 'var(--color-border-strong)',
                  color: isFocused
                    ? 'var(--color-accent-ink)'
                    : 'var(--color-text)',
                  opacity: isFocused ? 1 : 0.65,
                }}
              >
                {input[caretPos] ?? '\u00A0'}
              </span>
              <span>{input.slice(caretPos + 1)}</span>
            </span>

            {/* Visible text input on mobile; transparent overlaid real input on sm+ so keyboard, screen readers, paste & selection all work natively */}
            <input
              ref={inputRef}
              id="terminal-command-input"
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setCaretPos(e.target.selectionStart ?? e.target.value.length);
                setHistoryCursor(-1);
              }}
              onKeyDown={handleKeyDown}
              onKeyUp={syncCaretFromInput}
              onClick={syncCaretFromInput}
              onSelect={syncCaretFromInput}
              onFocus={() => {
                setIsFocused(true);
                syncCaretFromInput();
              }}
              onBlur={() => setIsFocused(false)}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="send"
              placeholder='type "help" and press enter'
              aria-label="Terminal command input"
              className="w-full bg-transparent border-b sm:border-none py-1 sm:py-0 font-mono text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none sm:absolute sm:inset-0 sm:text-transparent sm:caret-transparent sm:placeholder:text-transparent"
              style={{
                borderColor: 'var(--color-border-strong)',
                fontSize: 'inherit',
                lineHeight: 'inherit',
              }}
            />
          </div>

          <button
            type="submit"
            className="sm:hidden shrink-0 px-3 py-1 font-mono uppercase tracking-[var(--tracking-micro)] border cursor-pointer"
            style={{
              fontSize: 'var(--text-micro)',
              borderColor: 'var(--color-accent)',
              color: 'var(--color-accent)',
              borderRadius: 'var(--radius-xs)',
            }}
          >
            run ↵
          </button>
        </form>

        <div ref={outputEndRef} />
      </div>

      {/* Mobile / coarse-pointer on-screen virtual key row: Tab, ↑/↓ arrows, Ctrl-C (min 44x44px, 8px gap) */}
      <div
        role="toolbar"
        aria-label="Terminal virtual keys"
        data-testid="terminal-mobile-key-row"
        className="terminal-mobile-key-row shrink-0 px-4 py-2 border-t items-center gap-2 overflow-x-auto font-mono"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg-elevated)',
          fontSize: 'var(--text-micro)',
        }}
      >
        <button
          type="button"
          onClick={triggerAutocomplete}
          aria-label="Tab autocomplete"
          className="touch-target shrink-0 min-w-[44px] min-h-[44px] px-3 border uppercase tracking-[var(--tracking-micro)] cursor-pointer"
          style={{
            borderColor: 'var(--color-border-strong)',
            backgroundColor: 'var(--color-bg)',
            color: 'var(--color-text)',
            borderRadius: 'var(--radius-xs)',
          }}
        >
          Tab
        </button>

        <button
          type="button"
          onClick={stepHistoryUp}
          aria-label="Previous command in history"
          className="touch-target shrink-0 min-w-[44px] min-h-[44px] px-3 border cursor-pointer"
          style={{
            borderColor: 'var(--color-border-strong)',
            backgroundColor: 'var(--color-bg)',
            color: 'var(--color-text)',
            borderRadius: 'var(--radius-xs)',
          }}
        >
          ↑
        </button>

        <button
          type="button"
          onClick={stepHistoryDown}
          aria-label="Next command in history"
          className="touch-target shrink-0 min-w-[44px] min-h-[44px] px-3 border cursor-pointer"
          style={{
            borderColor: 'var(--color-border-strong)',
            backgroundColor: 'var(--color-bg)',
            color: 'var(--color-text)',
            borderRadius: 'var(--radius-xs)',
          }}
        >
          ↓
        </button>

        <button
          type="button"
          onClick={triggerCtrlC}
          aria-label="Ctrl-C interrupt command"
          className="touch-target shrink-0 min-w-[44px] min-h-[44px] px-3 border uppercase tracking-[var(--tracking-micro)] cursor-pointer"
          style={{
            borderColor: 'var(--color-accent)',
            backgroundColor: 'var(--color-accent-soft)',
            color: 'var(--color-accent)',
            borderRadius: 'var(--radius-xs)',
          }}
        >
          Ctrl-C
        </button>
      </div>

      {/* Bottom quick-command strip (helpful on mobile & touch devices) */}
      <div
        className="shrink-0 px-4 sm:px-6 py-2.5 border-t flex flex-wrap items-center justify-between gap-3 font-mono"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg)',
          fontSize: 'var(--text-micro)',
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="uppercase tracking-[var(--tracking-micro)] mr-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            try:
          </span>
          {quickCommands.map((cmd) => (
            <button
              key={cmd}
              type="button"
              onClick={() => {
                if (soundEnabled) typingSound.playKey('enter');
                executeCommand(cmd);
                inputRef.current?.focus();
              }}
              className="px-2 py-0.5 border transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              {cmd}
            </button>
          ))}
        </div>

        <span
          className="hidden md:inline tracking-[var(--tracking-mono)]"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {isStreaming ? 'streaming… ctrl+c to stop' : 'tab autocomplete · ↑/↓ history'}
        </span>
      </div>
    </div>
  );
}
