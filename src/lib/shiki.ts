import { useEffect, useState } from 'react';
import {
  createHighlighterCore,
  type HighlighterCore,
  type ThemedToken,
  type ThemeRegistrationRaw,
} from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import langTypeScript from '@shikijs/langs/typescript';

/**
 * Custom Shiki theme tuned directly to the site's warm near-black (#201e1f / #191718),
 * off-white (#f2eee8), warm vermilion accent (#f0642d), and WCAG AA palette.
 */
export const WORKING_COPY_SHIKI_THEME: ThemeRegistrationRaw = {
  name: 'working-copy-dark',
  type: 'dark',
  colors: {
    'editor.background': '#191718',
    'editor.foreground': '#f2eee8',
  },
  settings: [
    {
      settings: {
        foreground: '#f2eee8',
        background: '#191718',
      },
    },
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: {
        foreground: '#968f86',
        fontStyle: 'italic',
      },
    },
    {
      scope: [
        'keyword',
        'keyword.control',
        'keyword.operator.new',
        'keyword.operator.expression',
        'storage.type',
        'storage.modifier',
      ],
      settings: {
        foreground: '#f0642d',
      },
    },
    {
      scope: [
        'string',
        'string.quoted',
        'string.template',
        'punctuation.definition.string',
      ],
      settings: {
        foreground: '#6ec49c',
      },
    },
    {
      scope: [
        'constant.numeric',
        'constant.language.boolean',
        'constant.language.null',
        'constant.language.undefined',
      ],
      settings: {
        foreground: '#e9a83b',
      },
    },
    {
      scope: [
        'entity.name.function',
        'meta.function-call entity.name.function',
        'support.function',
      ],
      settings: {
        foreground: '#7cb8e8',
      },
    },
    {
      scope: [
        'entity.name.type',
        'entity.name.class',
        'entity.name.interface',
        'support.type',
        'support.type.primitive',
      ],
      settings: {
        foreground: '#e9a83b',
      },
    },
    {
      scope: [
        'variable',
        'variable.parameter',
        'variable.other.property',
        'meta.object-literal.key',
      ],
      settings: {
        foreground: '#f2eee8',
      },
    },
    {
      scope: ['punctuation', 'keyword.operator', 'meta.brace'],
      settings: {
        foreground: '#b8b1a7',
      },
    },
  ],
};

let highlighterPromise: Promise<HighlighterCore> | null = null;

export function getShikiHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [WORKING_COPY_SHIKI_THEME],
      langs: [langTypeScript],
      engine: createJavaScriptRegexEngine(),
    });
  }
  return highlighterPromise;
}

/**
 * Tokenizes TypeScript / JavaScript code into per-line Shiki ThemedTokens
 * without touching innerHTML. Returns null briefly while initializing.
 */
export function useShikiTokens(code: string): ThemedToken[][] | null {
  const [tokens, setTokens] = useState<ThemedToken[][] | null>(null);

  useEffect(() => {
    let cancelled = false;

    getShikiHighlighter()
      .then((highlighter) => {
        if (cancelled) return;
        const result = highlighter.codeToTokens(code, {
          lang: 'typescript',
          theme: 'working-copy-dark',
        });
        setTokens(result.tokens);
      })
      .catch(() => {
        if (!cancelled) setTokens(null);
      });

    return () => {
      cancelled = true;
    };
  }, [code]);

  return tokens;
}
