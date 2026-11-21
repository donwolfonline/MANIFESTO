import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const TYPE_MAP = {
  '1': 'principles',
  principle: 'principles',
  principles: 'principles',
  '2': 'bug-stories',
  bug: 'bug-stories',
  'bug-story': 'bug-stories',
  'bug-stories': 'bug-stories',
  '3': 'shelf-items',
  shelf: 'shelf-items',
  'shelf-item': 'shelf-items',
  'shelf-items': 'shelf-items',
  '4': 'commits',
  commit: 'commits',
  commits: 'commits',
};

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function parseCliArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--type' && argv[i + 1]) {
      args.type = argv[++i];
    } else if (token === '--title' && argv[i + 1]) {
      args.title = argv[++i];
    } else if (token === '--summary' && argv[i + 1]) {
      args.summary = argv[++i];
    } else if (token === '--item-type' && argv[i + 1]) {
      args.itemType = argv[++i];
    }
  }
  return args;
}

async function getNextNumber(dir) {
  try {
    const files = await fs.readdir(dir);
    let max = 0;
    for (const file of files) {
      const m = file.match(/^(\d+)-/);
      if (m) {
        const n = Number.parseInt(m[1], 10);
        if (n > max) max = n;
      }
    }
    return max + 1;
  } catch {
    return 1;
  }
}

function buildTemplate({ type, title, slug, date, nextNum, summary, itemType }) {
  const padded = String(nextNum).padStart(2, '0');
  const safeTitle = title.replace(/"/g, '\\"');
  const safeSummary = summary.replace(/"/g, '\\"');

  if (type === 'principles') {
    return `---
number: ${nextNum}
title: "${safeTitle}"
slug: "${slug}"
date: "${date}"
tags:
  - craft
summary: "${safeSummary}"
draft: true
---

Start inside a concrete engineering moment—a diff, an alert, or a review thread.

## Why this seam matters

Expand on the trade-off here. Entries with two or more headings automatically render a table of contents.

## What to try next Monday

- Keep one small, repeatable habit you can verify on your next branch.
`;
  }

  if (type === 'bug-stories') {
    return `---
exhibitNumber: "${padded}"
title: "${safeTitle}"
slug: "${slug}"
date: "${date}"
year: ${Number(date.slice(0, 4))}
category: "off-by-one"
tags:
  - postmortem
  - debugging
summary: "${safeSummary}"
draft: true
cause: "Describe the concrete root cause in one line."
cost: "Describe the human or operational cost in one line."
lesson: "State the sharp takeaway in one sentence."
snippet:
  filename: "example.ts"
  language: "ts"
  contextBefore:
    - "export function example(items: string[]) {"
  brokenLine: "  return items.slice(0, items.length - 1);"
  fixedLine: "  return items.slice(0, items.length);"
  contextAfter:
    - "}"
  brokenNote: "Explain why the broken line failed."
  fixedNote: "Explain why the fixed line resolves it."
---

Describe the anonymized scenario in two or three short paragraphs.

## What misled us first

Add the initial wrong theory before the real clue surfaced.

## How we prevented a repeat

Note the boundary test or invariant that closed the bug for good.
`;
  }

  if (type === 'shelf-items') {
    if (itemType === 'tool') {
      return `---
itemType: "tool"
order: ${nextNum}
title: "${safeTitle}"
slug: "${slug}"
date: "${date}"
kind: "editor"
tags:
  - toolbox
summary: "${safeSummary}"
draft: true
isPlaceholder: false
---

One or two honest paragraphs on why this tool stays open every weekday.
`;
    }

    return `---
itemType: "book"
order: ${nextNum}
title: "${safeTitle}"
slug: "${slug}"
date: "${date}"
author: "Author Name"
category: "craft"
color: "#343032"
inkColor: "#f2eee8"
widthPx: 48
heightPx: 244
yearRead: "${date.slice(0, 4)}"
tags:
  - reading
summary: "${safeSummary}"
draft: true
isPlaceholder: false
---

Write your personal reading notes here—the chapter you keep returning to and the habit it changed.
`;
  }

  // commits
  const pseudoHash = Math.floor(0x1000000 + Math.random() * 0xeffffff)
    .toString(16)
    .slice(0, 7);

  return `---
principleNumber: ${nextNum}
hash: "${pseudoHash}"
prefix: "chore"
title: "${safeTitle}"
slug: "${slug}"
author: "working-engineer"
date: "${date}"
relativeDate: "today"
filePath: "habits/${slug}.md"
tags:
  - habit
summary: "${safeSummary}"
draft: true
hunks:
  - removed:
      - "Describe the old habit being retired."
    added:
      - "Describe the clearer habit replacing it."
    blame:
      hash: "${pseudoHash}"
      author: "past-me"
      when: "${date} 09:00"
      note: "funny fake blame note explaining how this lesson was earned"
---

Optional longer context behind this commit.
`;
}

async function main() {
  const cli = parseCliArgs(process.argv.slice(2));
  const rl = !cli.type || !cli.title ? readline.createInterface({ input, output }) : null;

  try {
    let rawType = cli.type;
    if (!rawType && rl) {
      console.log('\nChoose content type:');
      console.log('  1. principles');
      console.log('  2. bug-stories');
      console.log('  3. shelf-items');
      console.log('  4. commits\n');
      rawType = (await rl.question('Type (1-4 or name): ')).trim().toLowerCase();
    }

    const type = TYPE_MAP[String(rawType).toLowerCase()];
    if (!type) {
      console.error(
        `Unknown type "${rawType}". Expected: principles, bug-stories, shelf-items, or commits.`,
      );
      process.exit(1);
    }

    let itemType = cli.itemType ?? 'book';
    if (type === 'shelf-items' && !cli.itemType && rl) {
      const answer = (await rl.question('Shelf item kind (book / tool) [book]: '))
        .trim()
        .toLowerCase();
      if (answer === 'tool') itemType = 'tool';
    }

    let title = cli.title;
    if (!title && rl) {
      title = (await rl.question('Title: ')).trim();
    }
    if (!title || title.length < 2) {
      console.error('Title must be at least 2 characters.');
      process.exit(1);
    }

    let summary = cli.summary;
    if (!summary && rl) {
      const answer = (
        await rl.question('One-line summary (press Enter for draft placeholder): ')
      ).trim();
      summary =
        answer.length >= 10
          ? answer
          : `Working draft notes on ${title.toLowerCase()}.`;
    }
    if (!summary || summary.length < 10) {
      summary = `Working draft notes on ${title.toLowerCase()}.`;
    }

    const slug = slugify(title);
    if (!slug) {
      console.error('Could not derive a valid slug from that title.');
      process.exit(1);
    }

    const targetDir = path.join(process.cwd(), 'content', type);
    await fs.mkdir(targetDir, { recursive: true });

    const nextNum = await getNextNumber(targetDir);
    const padded = String(nextNum).padStart(2, '0');
    const filename = `${padded}-${slug}.mdx`;
    const fullPath = path.join(targetDir, filename);

    const today = new Date().toISOString().slice(0, 10);
    const contents = buildTemplate({
      type,
      title,
      slug,
      date: today,
      nextNum,
      summary,
      itemType,
    });

    await fs.writeFile(fullPath, contents, { flag: 'wx' });
    console.log(`\n✓ Created ${path.relative(process.cwd(), fullPath)} (draft: true)`);
  } finally {
    rl?.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
