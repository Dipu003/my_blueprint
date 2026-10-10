'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { loadStage } from './load';
import type { StageMode, StageView } from './stage';

/**
 * A box the 3D stage is parked in. While `active`, the shared canvas (one WebGL context for the whole
 * site) is moved in here and drawn; when this unmounts or goes inactive it moves out again, and
 * rendering stops if nothing else has taken it.
 */
export function CharacterSlot({
  mode,
  view,
  active = true,
  className,
  children,
}: {
  mode: StageMode;
  /** Where he stands in the canvas (see StageView). */
  view?: Partial<StageView>;
  active?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { ax, ay, fill } = view ?? {};

  useEffect(() => {
    const host = ref.current;
    if (!active || !host) return;
    let cancelled = false;
    let attached: Awaited<ReturnType<typeof loadStage>> = null;
    void loadStage().then((stage) => {
      if (cancelled || !stage) return;
      attached = stage;
      stage.attach(host, mode, { ax, ay, fill });
    });
    return () => {
      cancelled = true;
      attached?.detach(host);
    };
  }, [active, mode, ax, ay, fill]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
