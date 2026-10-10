'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CONTACT, OPEN_TO } from '@/data/portfolio';
import { play } from '@/lib/sound';
import { Panel } from '@/components/ui/Panel';
import { Heading } from '@/components/ui/Heading';
import { Icon, type IconName } from '@/components/ui/Icon';
import { GameButton } from '@/components/ui/GameButton';
import { roleIcon } from '@/components/ui/roleIcon';
import { item, stagger } from './motion';

const ROWS: { key: string; icon: IconName; label: string; value: string; copy?: string }[] = [
  { key: 'email', icon: 'mail', label: 'Email', value: CONTACT.email, copy: CONTACT.email },
  { key: 'phone', icon: 'phone', label: 'Phone', value: CONTACT.phone, copy: CONTACT.phone },
  { key: 'loc', icon: 'pin', label: 'Base', value: CONTACT.location },
];

export function Squad() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      play('confirm');
      setTimeout(() => setCopied(null), 1600);
    } catch {
      // Clipboard blocked (e.g. insecure context): fall back to the mail client for email.
      if (key === 'email') window.location.href = `mailto:${text}`;
    }
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <Heading kicker="Friends list" title="Squad up" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <motion.div variants={item}>
          <Panel title="Squad request" tag="Contact">
            <ul className="space-y-1.5">
              {ROWS.map((r) => (
                <li key={r.key} className="cut tile flex min-h-16 items-center gap-3 bg-white/[0.05] px-3 py-2">
                  <Icon name={r.icon} className="h-5 w-5 shrink-0 text-gold" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[0.625rem] font-semibold uppercase tracking-[0.25em] text-zinc-500">{r.label}</div>
                    <div className="selectable break-words text-sm font-semibold sm:text-base">{r.value}</div>
                  </div>
                  {r.copy && (
                    <button
                      type="button"
                      onClick={() => copy(r.key, r.copy!)}
                      className="para w-24 shrink-0 bg-white/10 py-1 text-center text-[0.6875rem] font-bold uppercase tracking-widest text-zinc-200 transition-colors hover:bg-flame hover:text-on-gold"
                    >
                      {copied === r.key ? 'Copied' : 'Copy'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <GameButton icon="mail" label="Send request" sub="Opens your mail app" href={`mailto:${CONTACT.email}`} />
              <GameButton variant="ghost" icon="phone" label="Call" sub={CONTACT.phone} href={`tel:${CONTACT.tel}`} />
            </div>
          </Panel>
        </motion.div>

        <div className="space-y-4">
          <motion.div variants={item}>
            <Panel title="Network" tag="Links">
              <a
                href={CONTACT.linkedin.href}
                target="_blank"
                rel="noreferrer"
                onClick={() => play('click')}
                className="cut tile flex min-h-14 items-center gap-3 bg-white/[0.05] px-3 py-2"
              >
                <Icon name="linkedin" className="h-6 w-6 shrink-0 text-gold" />
                <span className="min-w-0 flex-1 break-words text-sm font-semibold sm:text-base">{CONTACT.linkedin.label}</span>
                <Icon name="arrow" className="h-5 w-5 shrink-0 text-zinc-400" />
              </a>
            </Panel>
          </motion.div>

          <motion.div variants={item}>
            <Panel title="Looking for squad as" tag="Open to">
              <ul className="space-y-1.5">
                {OPEN_TO.map((o) => (
                  <li key={o.role} className="cut tile flex h-11 items-center gap-3 bg-white/[0.05] px-3 text-sm">
                    <Icon name={roleIcon(o.role)} className="h-4 w-4 shrink-0 text-gold" />
                    <span className="font-semibold">{o.role}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
