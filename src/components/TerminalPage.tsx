import { useMemo } from 'react';
import {
  MANIFESTO_ITEMS,
  type ManifestoItem,
} from '../data/manifestoItems';
import type { ManifestoMeta } from '../lib/markdown';
import { getPreloadHandlers } from '../lib/routePreload';
import type { AccentChangeResult } from '../lib/terminalCommands';
import { createManifestoCommands } from '../lib/terminalCommands';
import { FilmGrain } from './FilmGrain';
import { HoverLink } from './HoverLink';
import { Terminal } from './Terminal';

export interface TerminalPageProps {
  meta: ManifestoMeta;
  items?: ManifestoItem[];
  activeAccentName: string;
  onAccentChange: (accentName: string) => AccentChangeResult;
  onNavigateFromTerminal: (target: string) => void;
}

export function TerminalPage({
  meta,
  items = MANIFESTO_ITEMS,
  activeAccentName,
  onAccentChange,
  onNavigateFromTerminal,
}: TerminalPageProps) {
  const commands = useMemo(
    () => createManifestoCommands(meta, items),
    [meta, items],
  );

  const welcomeLines = useMemo(
    () => [
      {
        kind: 'heading' as const,
        text: `${meta.title} — interactive shell (${meta.date})`,
      },
      {
        kind: 'muted' as const,
        text: 'type "help" to list commands, "manifesto" to stream all 10 principles, or "cd read" to return to the page.',
      },
      { kind: 'muted' as const, text: '' },
    ],
    [meta.date, meta.title],
  );

  return (
    <div
      className="relative min-h-dvh flex flex-col"
      style={{
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
      }}
    >
      <FilmGrain />

      {/* Minimal top navigation bar back to editorial view */}
      <header
        className="shrink-0 border-b"
        style={{
          height: 'var(--header-height)',
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg)',
        }}
      >
        <div className="editorial-shell h-full flex items-center justify-between gap-4 font-mono">
          <HoverLink
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigateFromTerminal('home');
            }}
            className="inline-flex items-center gap-2.5 uppercase tracking-[var(--tracking-mono)]"
            style={{
              fontSize: 'var(--text-meta)',
              color: 'var(--color-text)',
            }}
          >
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: 'var(--color-accent)' }}
            />
            <span>~/{meta.filename}</span>
          </HoverLink>

          <div className="flex items-center gap-4 sm:gap-6">
            <HoverLink
              href="/today"
              {...getPreloadHandlers('today')}
              onClick={(e) => {
                e.preventDefault();
                onNavigateFromTerminal('today');
              }}
              className="hidden md:inline-flex uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              /today
            </HoverLink>

            <HoverLink
              href="/naming"
              {...getPreloadHandlers('naming')}
              onClick={(e) => {
                e.preventDefault();
                onNavigateFromTerminal('naming');
              }}
              className="inline-flex uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              /naming
            </HoverLink>

            <HoverLink
              href="/focus"
              {...getPreloadHandlers('focus')}
              onClick={(e) => {
                e.preventDefault();
                onNavigateFromTerminal('focus');
              }}
              className="hidden lg:inline-flex uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              /focus
            </HoverLink>

            <HoverLink
              href="/commit-log"
              {...getPreloadHandlers('commit-log')}
              onClick={(e) => {
                e.preventDefault();
                onNavigateFromTerminal('commit-log');
              }}
              className="hidden sm:inline-flex uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              /commit-log
            </HoverLink>

            <HoverLink
              href="/bug-museum"
              {...getPreloadHandlers('bug-museum')}
              onClick={(e) => {
                e.preventDefault();
                onNavigateFromTerminal('bug-museum');
              }}
              className="hidden sm:inline-flex uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              /bug-museum
            </HoverLink>

            <HoverLink
              href="/#read"
              restingRule
              onClick={(e) => {
                e.preventDefault();
                onNavigateFromTerminal('read');
              }}
              className="uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              ← back to editorial
            </HoverLink>
          </div>
        </div>
      </header>

      <main
        aria-label="Interactive manifesto terminal"
        className="flex-1 editorial-shell py-6 sm:py-10 flex flex-col justify-center"
      >
        <h1 className="sr-only">{meta.title} interactive terminal</h1>
        <Terminal
          commands={commands}
          prompt="guest@working-copy:~$"
          welcomeLines={welcomeLines}
          onNavigate={onNavigateFromTerminal}
          onAccentChange={onAccentChange}
          onExit={() => onNavigateFromTerminal('home')}
          activeAccentName={activeAccentName}
        />
      </main>
    </div>
  );
}
