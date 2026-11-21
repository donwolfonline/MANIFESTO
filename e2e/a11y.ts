import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/**
 * Runs an axe-core WCAG 2.0/2.1 A+AA audit on the current route and fails
 * with a structured report if any serious or critical violation is detected.
 */
export async function expectNoSeriousA11yViolations(
  page: Page,
  routeLabel: string,
): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const seriousViolations = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );

  const formatted = seriousViolations
    .map((v) => {
      const nodes = v.nodes
        .map(
          (node) =>
            `    - selector: ${node.target.join(' ')}\n      summary: ${node.failureSummary ?? 'n/a'}`,
        )
        .join('\n');
      return `[${v.impact?.toUpperCase()}] ${v.id}: ${v.help}\n  route: ${routeLabel}\n  docs:  ${v.helpUrl}\n${nodes}`;
    })
    .join('\n\n');

  expect(
    seriousViolations,
    formatted
      ? `Serious accessibility violations found on ${routeLabel}:\n\n${formatted}`
      : undefined,
  ).toEqual([]);
}
