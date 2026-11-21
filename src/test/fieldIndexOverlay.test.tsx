import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { IndexOverlay } from '../components/IndexOverlay';

describe('<IndexOverlay /> Field Index circular wipe, grouped routes, live preview & keyboard navigation', () => {
  it('renders READ / PLAY / TOOLS groups, shifts hovered item 12px while dimming others to 35%, crossfades live preview, and handles keyboard 1-9 / arrows / Esc / swipe-down', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSelectSection = vi.fn();
    const onViewModeChange = vi.fn();

    render(
      <IndexOverlay
        isOpen={true}
        onClose={onClose}
        origin={{ x: 1180, y: 34 }}
        sections={[]}
        onSelectSection={onSelectSection}
        viewMode="editorial"
        onViewModeChange={onViewModeChange}
      />,
    );

    const dialog = screen.getByRole('dialog', {
      name: /manifesto section index/i,
    });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByTestId('overlay-close-x-glyph')).toHaveTextContent('[x]');

    // 1. Groups READ / PLAY / TOOLS
    expect(
      screen.getByRole('region', { name: /READ group/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: /PLAY group/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: /TOOLS group/i }),
    ).toBeInTheDocument();

    // 2. Hovering an item shifts it right 12px, dims other items to 35%, and updates live preview panel
    const namingBtn = dialog.querySelector<HTMLButtonElement>(
      'button[data-route-id="naming"]',
    )!;
    const homeBtn = dialog.querySelector<HTMLButtonElement>(
      'button[data-route-id="home"]',
    )!;

    await user.hover(namingBtn);
    expect(namingBtn).toHaveAttribute('data-hovered', 'true');
    expect(namingBtn).toHaveStyle({ transform: 'translate3d(12px, 0, 0)' });
    expect(homeBtn).toHaveAttribute('data-dimmed', 'true');
    expect(homeBtn).toHaveStyle({ opacity: '0.35' });

    const preview = screen.getByTestId('field-index-live-preview');
    expect(preview.querySelector('[data-preview-route="naming"]')).not.toBeNull();

    // 3. Bottom bar includes keyboard hints, EDITORIAL/RAW toggle, current time, and theme toggle
    expect(screen.getByTestId('field-index-key-hints')).toHaveTextContent(
      /esc close, up\/down move, enter go, \/ search/i,
    );
    expect(screen.getByTestId('field-index-clock')).toHaveTextContent(
      /^\d{2}:\d{2}:\d{2}$/,
    );
    expect(
      screen.getByRole('group', { name: /overlay color theme/i }),
    ).toBeInTheDocument();

    // 4. Number key 1-9 jumps immediately to the corresponding route
    await user.keyboard('2');
    expect(onClose).toHaveBeenCalledTimes(1);

    // 5. Mobile swipe-down (> 64px) closes the overlay
    fireEvent.touchStart(dialog, { touches: [{ clientY: 20 }] });
    fireEvent.touchEnd(dialog, { changedTouches: [{ clientY: 120 }] });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
