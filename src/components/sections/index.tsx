'use client';

import type { SectionId } from '@/data/portfolio';
import { Lobby } from './Lobby';
import { Missions } from './Missions';
import { Loadout } from './Loadout';
import { Career } from './Career';
import { Squad } from './Squad';

const MAP: Record<SectionId, () => JSX.Element> = {
  lobby: Lobby,
  missions: Missions,
  loadout: Loadout,
  career: Career,
  squad: Squad,
};

export function SectionView({ id }: { id: SectionId }) {
  const View = MAP[id];
  return <View />;
}
