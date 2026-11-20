import { type AnchorHTMLAttributes, type ReactNode } from 'react';

export interface HoverLinkProps
  extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode;
  /** Show a subtle muted baseline underline at rest before the accent line draws in */
  restingRule?: boolean;
  /** Override the hover underline color (defaults to --color-accent) */
  underlineColor?: string;
}

/**
 * Editorial link with a 1px underline that draws smoothly in from the left on hover.
 */
export function HoverLink({
  children,
  restingRule = false,
  underlineColor = 'var(--color-accent)',
  className = '',
  style,
  ...props
}: HoverLinkProps) {
  return (
    <a
      className={`link-draw ${restingRule ? 'link-draw--resting' : ''} ${className}`}
      style={{
        ['--link-draw-color' as string]: underlineColor,
        ...style,
      }}
      {...props}
    >
      {children}
    </a>
  );
}
