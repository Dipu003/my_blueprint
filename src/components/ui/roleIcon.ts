import type { IconName } from '@/components/ui/Icon';

const ROLE_ICON: Record<string, IconName> = {
  'Software Engineer (Node.js)': 'server',
  'AI/ML Engineer': 'chip',
  'Agentic AI Developer': 'bolt',
  'GenAI Engineer': 'star',
  'DevOps Engineer': 'gear',
};

export const roleIcon = (role: string): IconName => ROLE_ICON[role] ?? 'star';
