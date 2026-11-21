import content from 'virtual:content';
import { DEFAULT_STATEMENTS } from '../components/StatementSequence';
import { BUG_CATEGORY_LABELS, BUG_EXHIBITS } from '../data/bugExhibits';
import { MANIFESTO_COMMITS } from '../data/commitLog';
import {
  DELETE_COMPARISONS,
  DELETE_GAME_LINES,
} from '../data/deleteExamples';
import {
  CLOSING_SIGN_OFF,
  DO_MORE_ITEMS,
  MANIFESTO_ITEMS,
  STOP_DOING_ITEMS,
} from '../data/manifestoItems';
import { NAMING_ROUNDS } from '../data/namingGame';
import { SHELF_DATA } from '../data/shelfData';
import { parseManifesto, type ManifestoMeta, type ManifestoStats } from './markdown';
import { getPrincipleOfTheDay } from './principleOfTheDay';

export interface PageMarkdownDocument {
  filename: string;
  raw: string;
  stats: ManifestoStats;
}

function computeMarkdownStats(raw: string): ManifestoStats {
  return parseManifesto(raw).stats;
}

export function serializeHomePageMarkdown(meta: ManifestoMeta): string {
  const lines: string[] = [
    `# ${meta.title}`,
    '',
    ...meta.subtitles.map((line) => `> ${line}`),
    '',
    `- Author: ${meta.author}`,
    `- Date: ${meta.date}`,
    `- Location: ${meta.location}`,
    '',
    '## Opening Statements',
    '',
    ...DEFAULT_STATEMENTS.map(
      (s) =>
        `> ${(s.lead ?? '') + s.emphasis + (s.tail ?? '') + (s.punctuation ?? '')}`,
    ),
    '',
    '## the actual (human) job',
    '',
  ];

  MANIFESTO_ITEMS.forEach((item) => {
    lines.push(`### ${item.number}. ${item.title}`);
    lines.push('');
    lines.push(`> ${item.summary}`);
    lines.push('');

    item.body.forEach((block) => {
      if (block.type === 'paragraph') {
        lines.push(block.text);
        lines.push('');
      } else if (block.type === 'bullets') {
        block.items.forEach((bullet) => {
          lines.push(`- ${bullet}`);
        });
        lines.push('');
      } else if (block.type === 'lines') {
        block.lines.forEach((line) => {
          lines.push(`> ${line}`);
        });
        lines.push('');
      }
    });
  });

  lines.push('## things I am trying to stop doing');
  lines.push('');
  STOP_DOING_ITEMS.forEach((item) => {
    lines.push(`- ~~${item}~~`);
  });
  lines.push('');

  lines.push('## things I am trying to do more');
  lines.push('');
  DO_MORE_ITEMS.forEach((item) => {
    lines.push(`- [x] ${item}`);
  });
  lines.push('');

  lines.push(`> ${CLOSING_SIGN_OFF.disclaimer}`);
  lines.push('');
  lines.push(`- Signed: ${CLOSING_SIGN_OFF.signature}`);
  lines.push(`- Last touched: ${CLOSING_SIGN_OFF.lastTouched}`);
  lines.push(`- Contact: ${CLOSING_SIGN_OFF.email}`);

  return lines.join('\n').trimEnd() + '\n';
}

/**
 * Builds the plain Markdown source for ANY route on the site directly from
 * that route's underlying content source so there is never duplicated text.
 */
export function buildPageMarkdown(
  routePath: string,
  meta: ManifestoMeta,
  rawOverride?: string,
): PageMarkdownDocument {
  const cleanPath = (routePath || '/').split('?')[0].split('#')[0] || '/';

  if (cleanPath === '/' || cleanPath === '/home') {
    const raw = rawOverride || serializeHomePageMarkdown(meta);
    return {
      filename: meta.filename || 'working_copy.md',
      raw,
      stats: computeMarkdownStats(raw),
    };
  }

  if (cleanPath === '/today') {
    const selection = getPrincipleOfTheDay(MANIFESTO_ITEMS);
    const p = selection.item;
    const lines: string[] = [
      `# /today — Principle ${String(p.number).padStart(2, '0')}: ${p.title}`,
      '',
      `> ${p.summary}`,
      '',
      `- Date: ${selection.displayDate} (${selection.dateKey})`,
      `- Reading time: ${p.readingTimeMinutes} min`,
      `- Tags: ${p.tags.join(', ')}`,
      '',
      `## ${p.number}. ${p.title}`,
      '',
      p.rawBody.trim(),
    ];
    const raw = lines.join('\n').trimEnd() + '\n';
    return {
      filename: 'today.md',
      raw,
      stats: computeMarkdownStats(raw),
    };
  }

  if (cleanPath === '/commit-log') {
    const lines: string[] = [
      '# /commit-log — Evolution of the Ten Principles',
      '',
      '> Every principle started as an outage, a review comment, or a messy diff.',
      '',
    ];
    MANIFESTO_COMMITS.forEach((c) => {
      lines.push(`## ${c.hash} — ${c.prefix}: ${c.subject}`);
      lines.push('');
      lines.push(`> File: ${c.filePath} (${c.date} · ${c.relativeDate})`);
      lines.push('');
      lines.push(`- Author: ${c.author}`);
      lines.push(`- Principle: #${String(c.principleNumber).padStart(2, '0')}`);
      lines.push(`- Tags: ${c.tags.join(', ')}`);
      c.hunks.forEach((h) => {
        lines.push(`- Diff (${h.blame.hash}): ${h.blame.note}`);
      });
      lines.push('');
    });
    const raw = lines.join('\n').trimEnd() + '\n';
    return {
      filename: 'commit-log.md',
      raw,
      stats: computeMarkdownStats(raw),
    };
  }

  if (cleanPath === '/bug-museum') {
    const lines: string[] = [
      '# /bug-museum — Field Incidents & Post-Mortems',
      '',
      '> A curated hall of real production bugs and the habits they forced us to change.',
      '',
    ];
    BUG_EXHIBITS.forEach((ex) => {
      lines.push(`## Exhibit ${ex.number}: ${ex.title}`);
      lines.push('');
      lines.push(`> ${ex.lesson}`);
      lines.push('');
      lines.push(
        `- Category: ${BUG_CATEGORY_LABELS[ex.category]} (${ex.date})`,
      );
      lines.push(`- Root cause: ${ex.cause}`);
      lines.push(`- Operational cost: ${ex.cost}`);
      lines.push('');
      ex.story.forEach((paragraph) => {
        lines.push(paragraph);
        lines.push('');
      });
    });
    const raw = lines.join('\n').trimEnd() + '\n';
    return {
      filename: 'bug-museum.md',
      raw,
      stats: computeMarkdownStats(raw),
    };
  }

  if (cleanPath === '/shelf') {
    const lines: string[] = [
      '# /shelf — Books, Essays & Working Tools',
      '',
      '> Books and quiet tools that shaped these ten working principles.',
      '',
      '## Bookshelf',
      '',
    ];
    SHELF_DATA.books.forEach((b) => {
      lines.push(`### ${b.title} — ${b.author}`);
      lines.push('');
      lines.push(`> ${b.oneLineReason}`);
      lines.push('');
      lines.push(`- Category: ${b.category}`);
      lines.push(`- Notes: ${b.notes}`);
      lines.push('');
    });
    lines.push('## Working Tools');
    lines.push('');
    SHELF_DATA.tools.forEach((t) => {
      lines.push(`- ${t.name} (${t.kind}): ${t.why}`);
    });
    const raw = lines.join('\n').trimEnd() + '\n';
    return {
      filename: 'shelf.md',
      raw,
      stats: computeMarkdownStats(raw),
    };
  }

  if (cleanPath === '/naming') {
    const lines: string[] = [
      '# /naming — The Hardest Problem in Programming',
      '',
      '> Ten rounds of real code snippets with vague identifiers and one-sentence review reasoning.',
      '',
    ];
    NAMING_ROUNDS.forEach((r) => {
      const bestOpt = r.options.find((o) => o.isBest) ?? r.options[0];
      lines.push(`## Round ${String(r.number).padStart(2, '0')}: ${r.title}`);
      lines.push('');
      lines.push(`> ${bestOpt.reasoning}`);
      lines.push('');
      lines.push(
        `- Bad identifier: \`${r.badName}\` (${r.kind} in ${r.filename})`,
      );
      r.options.forEach((opt) => {
        lines.push(
          `- Option \`${opt.name}\` (readability ${opt.readability}/100)${opt.isBest ? ' [best]' : ''}`,
        );
      });
      lines.push('');
    });
    const raw = lines.join('\n').trimEnd() + '\n';
    return {
      filename: 'naming.md',
      raw,
      stats: computeMarkdownStats(raw),
    };
  }

  if (cleanPath === '/delete') {
    const lines: string[] = [
      '# /delete — The Art of Subtracting Code',
      '',
      '> The safest line of code is the one you never had to maintain.',
      '',
      '## Before & After Comparisons',
      '',
    ];
    DELETE_COMPARISONS.forEach((ex) => {
      lines.push(`### ${ex.number}. ${ex.title} (${ex.filename})`);
      lines.push('');
      lines.push(`> ${ex.lesson}`);
      lines.push('');
    });
    lines.push('## Deletable Lines Exercise');
    lines.push('');
    DELETE_GAME_LINES.forEach((l) => {
      lines.push(
        `- Line ${l.lineNumber} (${l.safeToDelete ? 'deletable' : 'keep'}): ${l.reason}`,
      );
    });
    const raw = lines.join('\n').trimEnd() + '\n';
    return {
      filename: 'delete.md',
      raw,
      stats: computeMarkdownStats(raw),
    };
  }

  if (cleanPath === '/playground') {
    const lines: string[] = [
      '# /playground — Systems & Complexity Sandbox',
      '',
      '> Interactive simulation of coupling, abstraction layers, and incident recovery.',
      '',
      '## Simulation Axioms',
      '',
      '- Every extra indirection layer multiplies debugging latency under incident load.',
      '- Small, boring modules recover faster than clever pipelines.',
      '- Deleting speculative configuration reduces failure surface nonlinearly.',
    ];
    const raw = lines.join('\n').trimEnd() + '\n';
    return {
      filename: 'playground.md',
      raw,
      stats: computeMarkdownStats(raw),
    };
  }

  if (cleanPath === '/focus') {
    const lines: string[] = [
      '# /focus — Quiet Deep-Work Room',
      '',
      '> Uninterrupted blocks of maker time are where simple designs actually happen.',
      '',
      '## Presets & Habits',
      '',
      '- 25m single-issue sprint: isolate one failing test or one unclear function.',
      '- 50m deep implementation block: notifications muted, one clear exit criterion.',
      '- 90m architecture & writing session: read the whole diff before committing.',
    ];
    const raw = lines.join('\n').trimEnd() + '\n';
    return {
      filename: 'focus.md',
      raw,
      stats: computeMarkdownStats(raw),
    };
  }

  if (cleanPath === '/terminal') {
    const lines: string[] = [
      '# /terminal — Interactive Manifesto Shell',
      '',
      `> ${meta.title} command-line interface (${meta.date})`,
      '',
      '## Core Commands',
      '',
      '- help: list all shell commands and keyboard shortcuts',
      '- manifesto: stream all 10 working principles in plain text',
      '- principle <1-10>: print a single principle by number',
      '- random: pick a random principle for code review',
      '- theme <ember|moss|amber|ice>: switch accent palette',
    ];
    const raw = lines.join('\n').trimEnd() + '\n';
    return {
      filename: 'terminal.md',
      raw,
      stats: computeMarkdownStats(raw),
    };
  }

  if (cleanPath === '/wall') {
    const lines: string[] = [
      '# /wall — Reader Margins & Field Notes',
      '',
      '> Margin notes, war stories, and quiet agreements left by working engineers.',
      '',
      '## Submission Guidelines',
      '',
      '- Keep notes concrete: share the diff, outage, or habit that changed your mind.',
      '- Signed or anonymous, stored locally and rate-limited with zero trackers.',
    ];
    const raw = lines.join('\n').trimEnd() + '\n';
    return {
      filename: 'wall.md',
      raw,
      stats: computeMarkdownStats(raw),
    };
  }

  if (cleanPath === '/privacy') {
    const lines: string[] = [
      '# /privacy — Local-First Privacy & Storage',
      '',
      '> Zero third-party analytics cookies, zero behavioral ad pixels, and full local control.',
      '',
      '## Local Storage Keys',
      '',
      '- manifesto_reading_prefs_v1: reading mode, theme (Night/Paper/Sepia), and font size',
      '- manifesto_view_mode_v1: EDITORIAL | RAW .MD toggle preference',
      '- manifesto_focus_sessions_v1: local focus timer session history',
    ];
    const raw = lines.join('\n').trimEnd() + '\n';
    return {
      filename: 'privacy.md',
      raw,
      stats: computeMarkdownStats(raw),
    };
  }

  if (cleanPath.startsWith('/notes/')) {
    const parts = cleanPath.replace(/^\/notes\//, '').split('/');
    const collection = parts[0];
    const slug = parts[1];

    if (collection === 'principles') {
      const found = content.principles.find((p) => p.slug === slug);
      if (found) {
        const raw = `# ${found.number}. ${found.title}\n\n> ${found.summary}\n\n- Date: ${found.date}\n- Tags: ${found.tags.join(', ')}\n\n${found.body.trim()}\n`;
        return {
          filename: `${found.slug}.md`,
          raw,
          stats: computeMarkdownStats(raw),
        };
      }
    } else if (collection === 'bug-stories') {
      const found = content.bugStories.find((b) => b.slug === slug);
      if (found) {
        const raw = `# Exhibit ${found.exhibitNumber}: ${found.title}\n\n> ${found.lesson}\n\n- Cause: ${found.cause}\n- Cost: ${found.cost}\n\n${found.body.trim()}\n`;
        return {
          filename: `${found.slug}.md`,
          raw,
          stats: computeMarkdownStats(raw),
        };
      }
    }
  }

  const fallbackRaw = rawOverride || serializeHomePageMarkdown(meta);
  return {
    filename: meta.filename || 'working_copy.md',
    raw: fallbackRaw,
    stats: computeMarkdownStats(fallbackRaw),
  };
}
