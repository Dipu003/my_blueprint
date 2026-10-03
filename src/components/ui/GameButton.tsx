'use client';

import { play } from '@/lib/sound';
import { Icon, type IconName } from '@/components/ui/Icon';

interface Props {
  label: string;
  sub?: string;
  variant?: 'primary' | 'ghost';
  icon?: IconName;
  onClick?: () => void;
  href?: string;
  newTab?: boolean;
}

/** Slanted CoD-style button. `primary` is the glowing orange "Start" button with a moving shine. */
export function GameButton({ label, sub, variant = 'primary', icon, onClick, href, newTab }: Props) {
  const cls = variant === 'primary' ? 'btn-start' : 'btn-ghost';
  const inner = (
    <>
      {icon && <Icon name={icon} className="h-6 w-6 shrink-0" />}
      <span className="flex flex-col items-start">
        <span className="btn-label">{label}</span>
        {sub && <span className="btn-sub uppercase">{sub}</span>}
      </span>
      <Icon name="arrow" className="h-5 w-5 shrink-0 opacity-80" />
    </>
  );
  const common = { className: cls, onMouseEnter: () => play('hover') };

  return (
    <span className={`inline-block ${variant === 'primary' ? 'btn-glow' : ''}`}>
      {href ? (
        <a
          {...common}
          href={href}
          onClick={() => play('click')}
          {...(newTab ? { target: '_blank', rel: 'noreferrer' } : {})}
        >
          {inner}
        </a>
      ) : (
        <button {...common} type="button" onClick={onClick}>
          {inner}
        </button>
      )}
    </span>
  );
}
