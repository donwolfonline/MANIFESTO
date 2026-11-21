import { isValidElement, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { slugify, splitChapterHeading } from '../lib/markdown';
import { Reveal } from './Reveal';

interface ManifestoRendererProps {
  markdown: string;
}

function extractText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractText).join('');
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractText(node.props.children);
  }
  return '';
}

const markdownComponents: Components = {
  h2({ children }) {
    const rawText = extractText(children);
    const id = slugify(rawText);
    const { index, label } = splitChapterHeading(rawText);

    return (
      <Reveal className="mt-[var(--space-section)] first:mt-0 mb-8 sm:mb-10">
        <div
          id={id}
          className="scroll-mt-28 flex items-center gap-3 mb-4 font-mono uppercase tracking-[var(--tracking-micro)]"
          style={{
            fontSize: 'var(--text-micro)',
            color: 'var(--color-text-muted)',
          }}
        >
          {index && (
            <span style={{ color: 'var(--color-accent)' }}>{index}</span>
          )}
          <span
            aria-hidden="true"
            className="h-px w-8 inline-block"
            style={{ backgroundColor: 'var(--color-border-strong)' }}
          />
          <span aria-hidden="true" className="opacity-60">
            ##
          </span>
        </div>

        <h2
          className="font-display font-normal m-0 max-w-[18ch]"
          style={{
            fontSize: 'var(--text-section)',
            lineHeight: 'var(--leading-section)',
            letterSpacing: 'var(--tracking-section)',
            color: 'var(--color-text)',
          }}
        >
          {label}
        </h2>
      </Reveal>
    );
  },

  h3({ children }) {
    const id = slugify(extractText(children));
    return (
      <Reveal>
        <h3
          id={id}
          className="scroll-mt-28 mt-12 mb-5 flex items-center gap-2.5 font-mono uppercase tracking-[var(--tracking-mono)] font-medium"
          style={{
            fontSize: 'var(--text-heading-mono)',
            color: 'var(--color-text)',
          }}
        >
          <span aria-hidden="true" style={{ color: 'var(--color-accent)' }}>
            ###
          </span>
          <span>{children}</span>
        </h3>
      </Reveal>
    );
  },

  p({ children }) {
    return (
      <p
        className="mb-6 last:mb-0 font-body"
        style={{
          maxWidth: 'var(--measure)',
          fontSize: 'var(--text-body)',
          lineHeight: 'var(--leading-body)',
          color: 'var(--color-text-secondary)',
        }}
      >
        {children}
      </p>
    );
  },

  blockquote({ children }) {
    return (
      <Reveal className="my-12 sm:my-16">
        <blockquote
          className="m-0 pl-6 sm:pl-8 py-1 border-l-2 font-display italic [&>p]:m-0 [&>p]:max-w-[34ch] [&>p]:font-display [&>p]:text-[length:var(--text-quote)] [&>p]:leading-[var(--leading-quote)] [&>p]:tracking-[var(--tracking-quote)] [&>p]:text-[var(--color-text)]"
          style={{
            borderColor: 'var(--color-accent)',
          }}
        >
          {children}
        </blockquote>
      </Reveal>
    );
  },

  ul({ children }) {
    return (
      <ul
        className="manifesto-ul my-8 space-y-4 list-none p-0"
        style={{ maxWidth: 'var(--measure)' }}
      >
        {children}
      </ul>
    );
  },

  ol({ children }) {
    return (
      <ol
        className="manifesto-ol my-8 space-y-4 list-none p-0"
        style={{ maxWidth: 'var(--measure)' }}
      >
        {children}
      </ol>
    );
  },

  li({ children }) {
    return (
      <li
        className="relative pl-8 font-body"
        style={{
          fontSize: 'var(--text-body)',
          lineHeight: 'var(--leading-body)',
          color: 'var(--color-text-secondary)',
        }}
      >
        {children}
      </li>
    );
  },

  hr() {
    return (
      <div
        role="separator"
        className="my-16 sm:my-24 flex items-center gap-4"
        style={{ maxWidth: 'var(--measure)' }}
      >
        <span
          className="h-px flex-1"
          style={{ backgroundColor: 'var(--color-border)' }}
        />
        <span
          aria-hidden="true"
          className="font-mono"
          style={{
            fontSize: 'var(--text-micro)',
            color: 'var(--color-text-muted)',
          }}
        >
          §
        </span>
        <span
          className="h-px flex-1"
          style={{ backgroundColor: 'var(--color-border)' }}
        />
      </div>
    );
  },

  strong({ children }) {
    return (
      <strong className="font-medium" style={{ color: 'var(--color-text)' }}>
        {children}
      </strong>
    );
  },

  em({ children }) {
    return (
      <em className="italic" style={{ color: 'var(--color-text)' }}>
        {children}
      </em>
    );
  },

  a({ href, children }) {
    return (
      <a
        href={href}
        target={href?.startsWith('http') ? '_blank' : undefined}
        rel={href?.startsWith('http') ? 'noreferrer noopener' : undefined}
        className="link-draw link-draw--resting transition-colors hover:text-[var(--color-accent)]"
        style={{
          color: 'var(--color-text)',
        }}
      >
        {children}
      </a>
    );
  },

  pre({ children }) {
    return (
      <Reveal className="my-10">
        <div
          className="relative overflow-x-auto border p-5 sm:p-6"
          style={{
            maxWidth: 'var(--measure)',
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-bg-elevated)',
            borderRadius: 'var(--radius-xs)',
          }}
        >
          <span
            aria-hidden="true"
            className="block mb-3 font-mono uppercase tracking-[var(--tracking-micro)]"
            style={{
              fontSize: 'var(--text-micro)',
              color: 'var(--color-text-muted)',
            }}
          >
            Plain Text
          </span>
          <pre
            className="m-0 font-mono leading-[var(--leading-mono)] overflow-x-auto"
            style={{
              fontSize: 'var(--text-meta)',
              color: 'var(--color-text)',
            }}
          >
            {children}
          </pre>
        </div>
      </Reveal>
    );
  },

  code({ className, children, ...props }) {
    const isCodeBlock = Boolean(className?.includes('language-'));
    if (isCodeBlock) {
      return (
        <code className="font-mono" {...props}>
          {children}
        </code>
      );
    }

    return (
      <code
        className="font-mono px-1.5 py-0.5 border"
        style={{
          fontSize: '0.84em',
          color: 'var(--color-text)',
          backgroundColor: 'var(--color-bg-elevated)',
          borderColor: 'var(--color-border)',
          borderRadius: 'var(--radius-xs)',
        }}
        {...props}
      >
        {children}
      </code>
    );
  },
};

export function ManifestoRenderer({ markdown }: ManifestoRendererProps) {
  return (
    <article
      id="manifesto-body"
      className="manifesto-article scroll-mt-28 min-w-0"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
