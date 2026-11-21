import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FilmGrain } from '../components/FilmGrain';
import { Hero } from '../components/Hero';
import { SmoothScrollProvider } from '../lib/lenis';
import { parseManifesto } from '../lib/markdown';
import { resolveSiteAuthor, SITE_CONFIG } from '../site.config';

describe('Polished Hero & site.config.ts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      configurable: true,
      value: 0,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('replaces "YOUR NAME" with SITE_CONFIG.author from site.config.ts across markdown parsing and Hero', () => {
    expect(SITE_CONFIG.author).toBe('Frederick Dineen');
    expect(resolveSiteAuthor('YOUR NAME')).toBe('Frederick Dineen');
    expect(resolveSiteAuthor('Your Name')).toBe('Frederick Dineen');
    expect(resolveSiteAuthor('')).toBe('Frederick Dineen');

    const parsedPlaceholder = parseManifesto(
      [
        '---',
        'filename: working_copy.md',
        'title: WORKING_COPY.md',
        'author: YOUR NAME',
        'date: Nov 2026',
        '---',
        'Body text.',
      ].join('\n'),
    );
    expect(parsedPlaceholder.meta.author).toBe(SITE_CONFIG.author);

    render(
      <SmoothScrollProvider>
        <Hero
          meta={{
            ...parsedPlaceholder.meta,
            author: 'YOUR NAME',
          }}
        />
      </SmoothScrollProvider>,
    );

    expect(screen.getByTestId('hero-author-date')).toHaveTextContent(
      'Frederick Dineen',
    );
    expect(screen.getByTestId('hero-author-date')).not.toHaveTextContent(
      /your name/i,
    );
  });

  it('renders WORKING_COPY.md with 50ms masked letter stagger, last-popping orange dot with bounce, italic lighter .md, two-line mobile structure, and blinking underscore cursor', () => {
    const parsed = parseManifesto('');
    render(
      <SmoothScrollProvider>
        <Hero meta={parsed.meta} />
      </SmoothScrollProvider>,
    );

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('WORKING_COPY.md');
    expect(heading).toHaveClass('hero-display-title');

    // Two-line mobile split: "WORKING_" and "COPY.md"
    expect(screen.getByTestId('hero-title-line-1')).toHaveTextContent(
      'WORKING_',
    );
    expect(screen.getByTestId('hero-title-line-2')).toHaveTextContent(
      'COPY.md',
    );

    // 14 letters staggered by 50ms each (0ms -> 650ms)
    const charMasks = heading.querySelectorAll('.hero-char-mask');
    expect(charMasks).toHaveLength(14);
    expect(charMasks[0]).toHaveAttribute('data-stagger-delay', '0ms');
    expect(charMasks[1]).toHaveAttribute('data-stagger-delay', '50ms');
    expect(charMasks[13]).toHaveAttribute('data-stagger-delay', '650ms');

    // Orange dot pops in last (700ms > 650ms) with bounce animation
    const dot = screen.getByTestId('hero-title-dot');
    expect(dot).toHaveTextContent('.');
    expect(dot).toHaveAttribute('data-pop-delay', '700ms');

    // Italic lighter ".md" extension
    const ext = screen.getByTestId('hero-title-ext');
    expect(ext).toHaveTextContent('md');
    expect(ext).toHaveClass('italic', 'font-light');

    // Blinking underscore cursor sits below the title
    const titleCursor = screen.getByTestId('hero-title-cursor');
    expect(titleCursor).toHaveTextContent('_');
    expect(
      titleCursor.querySelector('.terminal-cursor-blink'),
    ).toBeInTheDocument();
  });

  it('types the three blockquote lines in sequence with orange ">" and blinking block cursor on the last line, plus mobile 20px side padding and stacked meta row with visible skip-link focus class', () => {
    const parsed = parseManifesto('');
    render(
      <SmoothScrollProvider>
        <Hero
          meta={{
            ...parsed.meta,
            subtitles: ['line one', 'line two', 'line three'],
          }}
        />
      </SmoothScrollProvider>,
    );

    // Meta row stacks on mobile (flex-col sm:flex-row) and skip link has hero-skip-link focus styling
    const metaRow = screen.getByTestId('hero-meta-row');
    expect(metaRow.className).toContain('flex-col');
    expect(metaRow.className).toContain('sm:flex-row');

    const skipLink = screen.getByTestId('hero-skip-link');
    expect(skipLink).toHaveClass('hero-skip-link');
    expect(skipLink).toHaveTextContent('Skip to the text');

    // Blockquote container has 20px mobile side padding (px-[20px] sm:px-0) and left alignment
    const blockquoteGroup = screen.getByTestId('hero-blockquote-group');
    expect(blockquoteGroup.className).toContain('px-[20px]');
    expect(blockquoteGroup.className).toContain('text-left');

    // Advance timers so all 3 lines finish typing sequentially
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Blinking block cursor sits on the final blockquote line
    const cursors = screen.getAllByTestId('typed-line-cursor');
    expect(cursors).toHaveLength(1);
    expect(cursors[0]).toHaveClass('terminal-cursor-blink');
  });

  it('hides the 1px looping scroll cue when scrolled, moves title 4% slower than scroll, and drifts the film grain overlay slowly', () => {
    const parsed = parseManifesto('');
    render(
      <SmoothScrollProvider>
        <FilmGrain />
        <Hero meta={parsed.meta} />
      </SmoothScrollProvider>,
    );

    const scrollCue = screen.getByTestId('hero-scroll-cue');
    const scrollLine = screen.getByTestId('hero-scroll-line');
    const parallaxBox = screen.getByTestId('hero-title-parallax');
    const grain = screen.getByTestId('film-grain-overlay');

    expect(scrollLine.className).toContain('w-px');
    expect(scrollCue).toHaveAttribute('data-scrolled', 'false');
    expect(grain).toHaveClass('film-grain', 'film-grain--drift');

    // Simulate scrolling down 250px -> scroll cue hides and title moves 4% slower (250 * 0.04 = 10.00px)
    act(() => {
      Object.defineProperty(window, 'scrollY', {
        writable: true,
        configurable: true,
        value: 250,
      });
      fireEvent.scroll(window);
    });

    expect(scrollCue).toHaveAttribute('data-scrolled', 'true');
    expect(scrollCue.className).toContain('opacity-0');
    expect(parallaxBox).toHaveAttribute('data-parallax-y', '10.00');
    expect(parallaxBox).toHaveStyle({
      transform: 'translate3d(0, 10.00px, 0)',
    });
  });
});
