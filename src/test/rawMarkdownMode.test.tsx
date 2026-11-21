import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildStaggeredMarkdownBlocks,
  RawMarkdownView,
} from '../components/RawMarkdownView';
import { BUG_EXHIBITS } from '../data/bugExhibits';
import { MANIFESTO_ITEMS } from '../data/manifestoItems';
import { parseManifesto } from '../lib/markdown';
import { buildPageMarkdown } from '../lib/pageMarkdown';
import {
  loadViewMode,
  saveViewMode,
  VIEW_MODE_STORAGE_KEY,
} from '../lib/viewMode';

describe('EDITORIAL | RAW .MD functional view mode, syntax coloring, dissolve stagger, copy/download, and persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('persists EDITORIAL | RAW .MD choice in localStorage inside try/catch, defaults to editorial, and supports optional #raw deep-link hash without polluting URL on normal toggle', () => {
    expect(loadViewMode()).toBe('editorial');

    saveViewMode('raw');
    expect(window.localStorage.getItem(VIEW_MODE_STORAGE_KEY)).toBe('raw');
    expect(loadViewMode()).toBe('raw');
    expect(window.location.hash).toBe('');

    // Honors #raw deep link even if localStorage says editorial
    saveViewMode('editorial');
    expect(loadViewMode('#raw')).toBe('raw');

    // Survives localStorage throwing inside try/catch
    const getItemSpy = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
    expect(loadViewMode()).toBe('editorial');
    getItemSpy.mockRestore();
  });

  it('builds RAW Markdown from the same content source across pages (/, /bug-museum, /commit-log, /naming) with "# " headings, "> " quotes, and "- " lists', () => {
    const { meta } = parseManifesto('');

    const homeDoc = buildPageMarkdown('/', meta);
    expect(homeDoc.raw).toContain(`# ${meta.title}`);
    expect(homeDoc.raw).toContain(`> ${meta.subtitles[0]}`);
    expect(homeDoc.raw).toContain(`### 1. ${MANIFESTO_ITEMS[0].title}`);
    expect(homeDoc.raw).toContain(`- Author: ${meta.author}`);

    const museumDoc = buildPageMarkdown('/bug-museum', meta);
    expect(museumDoc.raw).toContain('# /bug-museum');
    expect(museumDoc.raw).toContain(
      `## Exhibit ${BUG_EXHIBITS[0].number}: ${BUG_EXHIBITS[0].title}`,
    );
    expect(museumDoc.raw).toContain(`> ${BUG_EXHIBITS[0].lesson}`);
    expect(museumDoc.raw).toContain(`- Root cause: ${BUG_EXHIBITS[0].cause}`);
  });

  it('renders line numbers in the gutter, syntax-style coloring (dim hashes, accent quote marks, accent list markers), and staggers blocks within 800ms max total (instant under reduced motion)', () => {
    const { meta } = parseManifesto('');
    render(<RawMarkdownView meta={meta} routePath="/" />);

    // Gutter line numbers
    const lineNumbers = screen.getAllByTestId('raw-line-number');
    expect(lineNumbers.length).toBeGreaterThan(20);
    expect(lineNumbers[0]).toHaveTextContent('1');
    expect(lineNumbers[1]).toHaveTextContent('2');

    // Syntax-style coloring elements
    const pre = screen.getByTestId('raw-markdown-pre');
    const headingHashes = pre.querySelectorAll('[data-syntax="heading-hash"]');
    const quoteMarks = pre.querySelectorAll('[data-syntax="quote-mark"]');
    const listMarkers = pre.querySelectorAll('[data-syntax="list-marker"]');

    expect(headingHashes.length).toBeGreaterThan(0);
    expect(headingHashes[0]).toHaveTextContent('#');
    expect(quoteMarks.length).toBeGreaterThan(0);
    expect(quoteMarks[0]).toHaveTextContent('>');
    expect(listMarkers.length).toBeGreaterThan(0);
    expect(listMarkers[0]).toHaveTextContent('-');

    // Block stagger: every block completes within <= 800ms total
    const blocks = screen.getAllByTestId('raw-markdown-block');
    expect(blocks.length).toBeGreaterThan(5);
    for (const block of blocks) {
      const totalMs = Number(block.getAttribute('data-block-total-ms'));
      expect(totalMs).toBeLessThanOrEqual(800);
    }

    // Instant under reduced motion
    const reducedBlocks = buildStaggeredMarkdownBlocks(
      '# Title\n\n> Quote\n\n- Item',
      true,
    );
    expect(reducedBlocks.every((b) => b.delayMs === 0 && b.totalMs === 0)).toBe(
      true,
    );
  });

  it('provides working "Copy markdown" and "Download .md" buttons in RAW mode', async () => {
    const user = userEvent.setup();
    const { meta } = parseManifesto('');

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      configurable: true,
      value: { writeText: writeTextMock },
    });

    const createObjectUrlMock = vi.fn().mockReturnValue('blob:mock-markdown-url');
    const revokeObjectUrlMock = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      configurable: true,
      value: createObjectUrlMock,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      configurable: true,
      value: revokeObjectUrlMock,
    });

    render(<RawMarkdownView meta={meta} routePath="/bug-museum" />);

    const copyBtn = screen.getByTestId('raw-copy-markdown');
    expect(copyBtn).toHaveTextContent(/copy markdown/i);
    await user.click(copyBtn);
    expect(writeTextMock).toHaveBeenCalledTimes(1);
    expect(writeTextMock.mock.calls[0][0]).toContain('# /bug-museum');
    expect(copyBtn).toHaveTextContent(/copied/i);

    const downloadBtn = screen.getByTestId('raw-download-markdown');
    expect(downloadBtn).toHaveTextContent(/download \.md/i);
    await user.click(downloadBtn);
    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:mock-markdown-url');
    expect(downloadBtn).toHaveTextContent(/downloaded/i);
  });
});
