// Mission 02: Nexus, the shared-expense app. Written from the project brief (Nov 2026) and the
// project's own docs (nexus_backend/docs, nexus_frontend/DESIGN.md). Keep every number and claim
// true to those; nothing here is invented to fill the layout.

import type { IconName } from '@/components/ui/Icon';

export const NEXUS = {
  code: 'Mission 02',
  name: 'Nexus',
  kind: 'Full-stack build',
  tagline: 'Split bills with friends, see exact balances and settle up in the fewest payments.',
  summary:
    'A full-stack shared-expense app: friends create groups, split bills four ways, see exact balances and settle up in the fewest payments. A NestJS + MongoDB API and a Next.js 15 web app, deployed for ₹0 on Oracle Cloud with HTTPS and push-to-deploy CI/CD.',
  role: 'Full-stack · designed, built and deployed',
  url: 'https://nexus-split.duckdns.org',
  host: 'nexus-split.duckdns.org',
  stats: [
    { value: '361', label: 'Automated tests' },
    { value: '4', label: 'Ways to split a bill' },
    { value: '₹0', label: 'Hosting a month' },
    { value: '~3 min', label: 'Push to live (API)' },
  ],
  stack: ['Next.js 15', 'React 19', 'NestJS 11', 'MongoDB Atlas', 'TypeScript', 'Tailwind CSS 4', 'Three.js', 'GitHub Actions'],
};

/** The four views inside the Nexus mission. The id is also the last part of the address (#missions/nexus/hld). */
export const NEXUS_VIEWS = [
  { id: 'overview', label: 'Overview', icon: 'star' },
  { id: 'hld', label: 'HLD', icon: 'layers' },
  { id: 'lld', label: 'LLD', icon: 'code' },
  { id: 'cicd', label: 'CI/CD', icon: 'branch' },
] as const satisfies readonly { id: string; label: string; icon: IconName }[];

export type NexusView = (typeof NEXUS_VIEWS)[number]['id'];

export const NEXUS_FEATURES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'squad',
    title: 'Groups',
    text: 'For trips, homes and events. Invite people by email, with owner, admin and member roles.',
  },
  {
    icon: 'split',
    title: 'Four ways to split',
    text: 'Equally, by exact amounts, by percentage or by shares, with a live preview of who owes what.',
  },
  {
    icon: 'scale',
    title: 'Exact balances',
    text: 'Per group and overall: net balance, what you are owed and what you owe, per currency.',
  },
  {
    icon: 'transfer',
    title: 'Settle up',
    text: 'Suggested payments clear every debt in few transfers. The receiver confirms: pending, then completed.',
  },
  {
    icon: 'history',
    title: 'Full history',
    text: 'Edits keep earlier versions, expenses are voided rather than deleted, and a searchable feed shows every change.',
  },
  {
    icon: 'chart',
    title: 'Dashboard insights',
    text: 'Spending target gauge, month-on-month comparison, spending by category and alerts for pending payments.',
  },
  {
    icon: 'window',
    title: 'Any screen',
    text: 'Phone to large monitor, dark and light themes, 3D and motion with reduced-motion fallbacks, full keyboard use.',
  },
  {
    icon: 'loadout',
    title: 'Server-side money',
    text: 'Every money value comes from the server, calculated exactly. The browser never computes a balance.',
  },
];

export const NEXUS_STACK: { layer: string; tech: string[]; why: string }[] = [
  { layer: 'Web app', tech: ['Next.js 15 (App Router)', 'React 19'], why: 'Pages switch in the browser; the server only serves the first load.' },
  { layer: 'UI and motion', tech: ['Tailwind CSS 4', 'Motion', 'Three.js', 'Lucide'], why: 'Glass design, a 3D scene with an SVG fallback.' },
  { layer: 'Data and forms', tech: ['TanStack Query 5', 'React Hook Form', 'Zod'], why: 'Cached, de-duplicated, prefetched requests; typed form validation.' },
  { layer: 'API', tech: ['NestJS 11', 'class-validator', 'Swagger'], why: 'Feature modules, whitelisted inputs, live API docs.' },
  { layer: 'Database', tech: ['MongoDB Atlas', 'Node.js driver 6'], why: 'Multi-document transactions; validators and indexes defined in code, no ODM.' },
  { layer: 'Security', tech: ['Argon2id', 'JWT session cookie', 'Helmet', 'Rate limits'], why: 'Revocable sessions, no tokens in JavaScript.' },
  { layer: 'Testing', tech: ['Jest', 'Supertest', 'Vitest', 'Testing Library'], why: 'Unit, end-to-end and component tests.' },
  { layer: 'Hosting', tech: ['Oracle Cloud', 'Ubuntu 24.04', 'Caddy 2', 'systemd'], why: '₹0 a month, automatic HTTPS, restarts on its own.' },
  { layer: 'CI/CD', tech: ['GitHub Actions'], why: 'Type check and tests, then deploy over SSH.' },
];

export const NEXUS_HIGHLIGHTS: { title: string; text: string; tags: string[] }[] = [
  {
    title: 'Exact money',
    text: 'Amounts are integers in minor units (paise), never floats. Splits use BigInt and largest-remainder rounding, so the shares always add up to the total; this is checked before every write.',
    tags: ['BigInt', 'Paise', 'Largest remainder'],
  },
  {
    title: 'Consistent writes',
    text: 'Multi-document MongoDB transactions, a per-group lock version that serialises concurrent edits, and an Idempotency-Key with a unique index, so a double click never creates two expenses.',
    tags: ['Transactions', 'lockVersion', 'Idempotency'],
  },
  {
    title: 'Settlement suggestions',
    text: 'A deterministic greedy optimiser (exact matches first) proposes the payments, then replays them to prove every balance reaches zero.',
    tags: ['Greedy', 'Verified', '≤ n − 1 transfers'],
  },
  {
    title: 'Security',
    text: 'A signed JWT in an HttpOnly, SameSite=Lax cookie points to a server-side session, so logout and password changes revoke it at once. A CSRF header check, Argon2id passwords, three rate limits and 404s for non-members back it up.',
    tags: ['HttpOnly', 'CSRF', 'Argon2id'],
  },
  {
    title: 'Built to scale out',
    text: 'One codebase deploys as one process or three services (dashboard, group, activity). Lists use cursor pagination with infinite scroll, each page read straight off an index.',
    tags: ['3 services', 'Keyset paging'],
  },
  {
    title: 'Fast interface',
    text: 'Clicks switch pages in the browser without asking the server; request de-duplication cut the dashboard from 30 requests to 10, and each card draws as soon as its data arrives.',
    tags: ['30 → 10 requests', 'Client routing'],
  },
  {
    title: 'Tested',
    text: '153 backend unit tests, 67 end-to-end API tests against a real MongoDB that clean up after themselves, and 141 frontend tests.',
    tags: ['153 unit', '67 e2e', '141 web'],
  },
];

/* ---------------- HLD: the animated architecture map ---------------- */

/** Boxes on the map. Where they sit is decided by the map itself (HldMap.tsx), per screen shape. */
export const HLD_NODES: Record<string, { title: string; sub: string; icon: IconName }> = {
  user: { title: 'Browser', sub: 'React · TanStack Query', icon: 'user' },
  dns: { title: 'DuckDNS', sub: 'nexus-split.duckdns.org', icon: 'globe' },
  caddy: { title: 'Caddy 2', sub: "HTTPS · Let's Encrypt", icon: 'lock' },
  web: { title: 'Next.js 15', sub: 'Web app · first load', icon: 'window' },
  api: { title: 'NestJS 11', sub: 'API · /api/v1', icon: 'server' },
  db: { title: 'MongoDB', sub: 'Transactions · Mumbai', icon: 'database' },
  gh: { title: 'GitHub', sub: 'Push to main', icon: 'branch' },
  ci: { title: 'GitHub Actions', sub: 'Type check · tests', icon: 'gear' },
  deploy: { title: 'deploy.sh', sub: 'Build beside · restart', icon: 'terminal' },
};

/** One hop of a request: the edge it travels along, and whether it goes back the other way (a reply). */
export type HldHop = readonly [edge: string, reply?: boolean];

export interface HldStep {
  say: string;
  /** Edges the request travels, one after another. */
  hops: HldHop[];
  /** Boxes lit during the step. */
  lit: string[];
  /** Small labels that pop up under the caption. */
  chips?: string[];
}

export interface HldScenario {
  id: string;
  label: string;
  steps: HldStep[];
}

export const HLD_SCENARIOS: HldScenario[] = [
  {
    id: 'open',
    label: 'Open the app',
    steps: [
      { hops: [['dns']], lit: ['user', 'dns'], say: 'The browser finds the server through a free DuckDNS name: nexus-split.duckdns.org.' },
      {
        hops: [['https']],
        lit: ['user', 'caddy'],
        say: "HTTPS to Caddy on the Oracle Cloud VM. Caddy gets and renews the Let's Encrypt certificate by itself.",
        chips: ['TLS', "Let's Encrypt", 'One origin'],
      },
      { hops: [['web']], lit: ['caddy', 'web'], say: 'Caddy hands page requests to Next.js, which renders only the first load.' },
      {
        hops: [['web', true], ['https', true]],
        lit: ['web', 'caddy', 'user'],
        say: 'From then on, clicks switch pages in the browser without asking the server again.',
        chips: ['Client routing', 'Cached queries'],
      },
    ],
  },
  {
    id: 'expense',
    label: 'Add an expense',
    steps: [
      {
        hops: [['https']],
        lit: ['user', 'caddy'],
        say: 'POST /api/v1/groups/:id/expenses with the session cookie, a CSRF header and an Idempotency-Key.',
        chips: ['HttpOnly cookie', 'x-nexus-csrf', 'Idempotency-Key'],
      },
      {
        hops: [['api']],
        lit: ['caddy', 'api'],
        say: 'The web app and the API share one HTTPS address, so the SameSite cookie needs no cross-site setup.',
      },
      {
        hops: [],
        lit: ['api'],
        say: 'Guards run first: rate limit, CSRF header, then the session. The input is whitelisted and the split is worked out in BigInt.',
        chips: ['Rate limit', 'CSRF', 'Session', 'DTO', 'Split engine'],
      },
      {
        hops: [['db']],
        lit: ['api', 'db'],
        say: "One MongoDB transaction: bump the group's lockVersion, re-check the members, insert the expense.",
        chips: ['Transaction', 'lockVersion', 'Unique index'],
      },
      {
        hops: [['db', true], ['api', true], ['https', true]],
        lit: ['db', 'api', 'caddy', 'user'],
        say: '201 Created. A double click sends the same key and gets the same expense back, never a second one.',
      },
    ],
  },
  {
    id: 'settle',
    label: 'Settle up',
    steps: [
      {
        hops: [['https'], ['api']],
        lit: ['user', 'caddy', 'api'],
        say: 'The settle-up screen asks the API for suggested payments.',
      },
      {
        hops: [['db'], ['db', true]],
        lit: ['api', 'db'],
        say: 'Balances are never stored: the API recomputes them from expenses and settlements, so they cannot drift.',
      },
      {
        hops: [],
        lit: ['api'],
        say: 'A greedy optimiser pays exact matches first, then replays the transfers to prove every balance reaches zero.',
        chips: ['Exact matches', 'Greedy', 'Verified'],
      },
      {
        hops: [['api', true], ['https', true]],
        lit: ['api', 'caddy', 'user'],
        say: 'The suggestions come back. A payment counts once the receiver confirms it: pending, then completed.',
        chips: ['Pending', 'Completed'],
      },
    ],
  },
  {
    id: 'ship',
    label: 'Ship a change',
    steps: [
      { hops: [['push']], lit: ['gh', 'ci'], say: 'A push to main starts the GitHub Actions workflow in that repository.' },
      {
        hops: [],
        lit: ['ci'],
        say: 'Actions installs the packages, runs the type check and the unit tests. A failure stops here.',
        chips: ['npm ci', 'Type check', 'Unit tests'],
      },
      {
        hops: [['ssh']],
        lit: ['ci', 'deploy'],
        say: 'It connects over SSH with a key the server accepts for one command only: deploy that app.',
      },
      {
        hops: [['restart']],
        lit: ['deploy', 'web', 'api'],
        say: 'The server pulls main, builds beside the running version and restarts it through systemd. A failed build keeps the old one running.',
      },
      {
        hops: [['health'], ['health', true]],
        lit: ['ci', 'caddy', 'web', 'api'],
        say: 'The run turns green only once the API health check and the sign-in page both answer.',
        chips: ['/health ✓', '/login ✓'],
      },
    ],
  },
];

/** Design decisions shown under the map. */
export const HLD_DECISIONS: { title: string; text: string }[] = [
  {
    title: 'One HTTPS origin',
    text: 'Caddy serves the web app and the API from one address, so the session cookie stays SameSite=Lax with no cross-site setup.',
  },
  {
    title: 'Only the API touches the database',
    text: 'The browser and Next.js never talk to MongoDB. Every money value is calculated on the server.',
  },
  {
    title: 'Balances are derived, not stored',
    text: 'They are recomputed from the records on every read, so they cannot drift out of step with the expenses.',
  },
  {
    title: 'Close to the data',
    text: 'The VM sits in Mumbai next to the Atlas cluster, so most API calls take about 10 to 100 ms on the server.',
  },
  {
    title: 'One process or three',
    text: 'The same build runs as one process today and splits into dashboard, group and activity services when one part needs to scale.',
  },
  {
    title: '₹0 a month',
    text: 'Oracle Cloud Always Free VM (1 GB RAM plus 4 GB swap), a free Atlas cluster, a free DuckDNS name and Let’s Encrypt.',
  },
];

/* ---------------- LLD ---------------- */

export const LLD_CHAPTERS = [
  { id: 'write', label: 'Write path', icon: 'transfer' },
  { id: 'data', label: 'Data model', icon: 'database' },
  { id: 'modules', label: 'Services & modules', icon: 'layers' },
  { id: 'algo', label: 'Algorithms', icon: 'split' },
  { id: 'security', label: 'Security', icon: 'key' },
] as const satisfies readonly { id: string; label: string; icon: IconName }[];

export type LldChapter = (typeof LLD_CHAPTERS)[number]['id'];

/** Lifelines of the write-path sequence diagram. */
export const SEQ_ACTORS: { title: string; sub: string; icon: IconName }[] = [
  { title: 'Browser', sub: 'React form', icon: 'user' },
  { title: 'NestJS', sub: 'API', icon: 'server' },
  { title: 'MongoDB', sub: 'Atlas', icon: 'database' },
];

/** Creating an expense, message by message (from → to are lifeline indexes). `tx` marks the transaction. */
export const SEQ_MESSAGES: { from: number; to: number; text: string; tx?: boolean; reply?: boolean }[] = [
  { from: 0, to: 1, text: 'POST /groups/:id/expenses + Idempotency-Key + x-nexus-csrf' },
  { from: 1, to: 1, text: 'Guards: rate limit → CSRF header → session cookie → userId' },
  { from: 1, to: 1, text: 'ValidationPipe: whitelisted DTO, integer money, enums, ids' },
  { from: 1, to: 2, text: 'Is the caller an active member? (404 if not)' },
  { from: 1, to: 2, text: 'Expense with this Idempotency-Key already? Return it' },
  { from: 1, to: 1, text: 'Split engine: allocations in BigInt (400 on an invalid split)' },
  { from: 1, to: 2, text: 'Re-check the caller’s membership', tx: true },
  { from: 1, to: 2, text: 'groups.findOneAndUpdate($inc lockVersion): serialises writers', tx: true },
  { from: 1, to: 2, text: 'Payer and participants are active members?', tx: true },
  { from: 1, to: 2, text: 'Insert expense (unique index on the idempotency key)', tx: true },
  { from: 2, to: 1, text: 'Commit (the driver retries the callback on a write conflict)', reply: true },
  { from: 1, to: 0, text: '201 expense, or the original one on a replayed key', reply: true },
];

export type FieldMark = 'pk' | 'fk' | 'uq' | 'idx' | 'ttl';

export interface CollectionDef {
  name: string;
  note: string;
  fields: { name: string; type: string; mark?: FieldMark; ref?: string }[];
}

/** The seven collections, trimmed to the fields that carry the design. */
export const NEXUS_COLLECTIONS: CollectionDef[] = [
  {
    name: 'users',
    note: 'Passwords are Argon2id hashes and never leave the server.',
    fields: [
      { name: '_id', type: 'ObjectId', mark: 'pk' },
      { name: 'name', type: 'string 1–100' },
      { name: 'normalizedEmail', type: 'string', mark: 'uq' },
      { name: 'passwordHash', type: 'Argon2id' },
      { name: 'defaultCurrency', type: 'INR · USD · EUR …' },
    ],
  },
  {
    name: 'sessions',
    note: 'Logout and password changes set revokedAt; a TTL index removes expired ones.',
    fields: [
      { name: '_id', type: 'ObjectId = JWT sid', mark: 'pk' },
      { name: 'userId', type: 'ObjectId', mark: 'fk', ref: 'users' },
      { name: 'expiresAt', type: 'date', mark: 'ttl' },
      { name: 'revokedAt', type: 'date | null' },
    ],
  },
  {
    name: 'groups',
    note: 'Every money write bumps lockVersion first, which serialises concurrent writers.',
    fields: [
      { name: '_id', type: 'ObjectId', mark: 'pk' },
      { name: 'groupType', type: 'TRIP · HOUSEHOLD · …' },
      { name: 'currency', type: 'locked once money is in' },
      { name: 'ownerId', type: 'ObjectId', mark: 'fk', ref: 'users' },
      { name: 'lockVersion', type: 'int ≥ 0' },
    ],
  },
  {
    name: 'group_memberships',
    note: 'Rows are never deleted: leaving or removal ends them, so history keeps its names.',
    fields: [
      { name: 'groupId', type: 'ObjectId', mark: 'fk', ref: 'groups' },
      { name: 'userId', type: 'ObjectId', mark: 'fk', ref: 'users' },
      { name: '(groupId, userId)', type: 'unique pair', mark: 'uq' },
      { name: 'role', type: 'OWNER · ADMIN · MEMBER' },
      { name: 'status', type: 'ACTIVE · REMOVED · LEFT' },
    ],
  },
  {
    name: 'expenses',
    note: 'Allocations always add up to amountMinor. Edits keep revisions; deletes are voids.',
    fields: [
      { name: 'groupId', type: 'ObjectId', mark: 'fk', ref: 'groups' },
      { name: 'amountMinor', type: 'integer paise' },
      { name: 'paidByUserId', type: 'ObjectId', mark: 'fk', ref: 'users' },
      { name: 'splitMethod', type: 'EQUAL · EXACT · % · SHARES' },
      { name: 'allocations[]', type: '{ userId, amountMinor }' },
      { name: 'status', type: 'ACTIVE · VOIDED' },
      { name: 'version · revisions[]', type: 'every past version' },
      { name: 'idempotencyKey', type: 'unique per group + creator', mark: 'uq' },
    ],
  },
  {
    name: 'settlements',
    note: 'The ledger of transfers that happened. Only recorded entries count towards balances.',
    fields: [
      { name: 'groupId', type: 'ObjectId', mark: 'fk', ref: 'groups' },
      { name: 'payerUserId', type: 'ObjectId', mark: 'fk', ref: 'users' },
      { name: 'receiverUserId', type: 'ObjectId ≠ payer', mark: 'fk', ref: 'users' },
      { name: 'amountMinor', type: 'integer paise' },
      { name: 'status', type: 'RECORDED · VOIDED' },
      { name: 'idempotencyKey', type: 'unique', mark: 'uq' },
    ],
  },
  {
    name: 'settlement_requests',
    note: 'Pending payments. Never affect balances; on completion the ledger entry reuses this _id.',
    fields: [
      { name: '_id', type: 'becomes the ledger _id', mark: 'pk' },
      { name: 'groupId', type: 'ObjectId', mark: 'fk', ref: 'groups' },
      { name: 'status', type: 'PENDING · COMPLETED · CANCELLED' },
      { name: 'idempotencyKey', type: 'unique', mark: 'uq' },
    ],
  },
];

export const NEXUS_INVARIANTS: string[] = [
  'Allocations add up to the expense amount exactly',
  'Net balances in a group sum to zero',
  'A settlement is completed at most once',
  'A retried submission never creates a duplicate',
  'History is never deleted',
  'A member leaves only with a zero balance',
];

/** One codebase, three deployables; NEXUS_SERVICE picks one (production runs `all` in one process). */
export const NEXUS_SERVICES: { id: string; icon: IconName; routes: string[]; holds: string }[] = [
  { id: 'dashboard', icon: 'chart', routes: ['/auth', '/users', '/statistics', '/capabilities'], holds: 'Sign-in, profile, people search and the overview numbers.' },
  { id: 'group', icon: 'squad', routes: ['/groups', '/expenses', '/settlements'], holds: 'Groups, members, balances, expenses and settlements: every money write.' },
  { id: 'activity', icon: 'history', routes: ['/activity'], holds: 'Read-only feeds: the activity history and transaction search.' },
];

/** What every request passes through, in order. */
export const NEXUS_PIPELINE: { name: string; does: string }[] = [
  { name: 'Rate limit guard', does: 'Per account, or per IP when signed out' },
  { name: 'CSRF guard', does: 'Writes must send x-nexus-csrf' },
  { name: 'Session guard', does: 'Cookie → JWT → live session → userId' },
  { name: 'ValidationPipe', does: 'Whitelisted DTOs, unknown fields rejected' },
  { name: 'Controller', does: 'Thin: DTO in, response out' },
  { name: 'Service', does: 'Authorization, transactions' },
  { name: 'Pure engines', does: 'Split · balances · optimizer' },
  { name: 'MongoDB driver', does: '$jsonSchema validators as a second layer' },
];

export const NEXUS_MODULES: { name: string; does: string; uses: string[] }[] = [
  { name: 'Database', does: 'MongoClient, transactions, schema sync (global)', uses: [] },
  { name: 'Memberships', does: 'Access checks and permission rules', uses: [] },
  { name: 'Auth', does: 'Register, login, logout, session guard', uses: ['Users', 'Sessions'] },
  { name: 'Users', does: 'Profile, password change, people search', uses: ['Sessions', 'Memberships'] },
  { name: 'Groups', does: 'Groups and member management', uses: ['Memberships', 'Balances', 'Users'] },
  { name: 'Balances', does: 'Balances endpoint over the pure calculator', uses: ['Memberships', 'Users'] },
  { name: 'Expenses', does: 'Expenses, split preview, search, history, void', uses: ['Groups', 'Memberships'] },
  { name: 'Settlements', does: 'Suggestions and the settlement lifecycle', uses: ['Groups', 'Balances', 'Memberships'] },
  { name: 'Statistics', does: 'Overview, trend, categories', uses: ['Balances', 'Memberships'] },
  { name: 'Activity', does: 'History derived from the records', uses: ['Memberships'] },
];

export const NEXUS_SECURITY: { icon: IconName; title: string; points: string[] }[] = [
  {
    icon: 'key',
    title: 'Identity',
    points: [
      'The nexus_session cookie holds a signed JWT (HS256, issuer and audience checked) carrying a session id.',
      'The server checks that session on every request, so logout and a password change revoke it at once.',
      'The user id never comes from a request body.',
    ],
  },
  {
    icon: 'lock',
    title: 'Cookie and CSRF',
    points: [
      'HttpOnly, SameSite=Lax and Secure: never readable by JavaScript, never in localStorage.',
      'Every POST, PATCH and DELETE must send x-nexus-csrf: 1, which a cross-site page cannot add without a CORS preflight.',
    ],
  },
  {
    icon: 'loadout',
    title: 'Passwords',
    points: [
      'Argon2id with 19 MiB, 2 iterations and 1 lane (the OWASP minimum).',
      'Unknown emails take a comparable time to check, so accounts cannot be found by timing.',
    ],
  },
  {
    icon: 'bolt',
    title: 'Three rate limits',
    points: [
      '120 requests a minute per route, 150 in 10 seconds across routes, 60 changes a minute.',
      'Sign-in and registration 10 a minute, people search 30, password change 5. Over a limit: 429 with Retry-After.',
    ],
  },
  {
    icon: 'squad',
    title: 'Authorization',
    points: [
      'Membership is checked on every read, roles for management, creator-or-admin for edits.',
      'Non-members get 404, so group ids cannot be probed.',
    ],
  },
  {
    icon: 'code',
    title: 'Input and output',
    points: [
      'Whitelisted DTOs (unknown fields rejected), integer money, ObjectId route params.',
      'One error shape; stack traces are logged, never returned. Helmet sets the headers.',
    ],
  },
];

/* ---------------- CI/CD ---------------- */

export const NEXUS_DEPLOY_STEPS: { title: string; text: string; icon: IconName }[] = [
  { icon: 'branch', title: 'Push to main', text: 'A push to main starts the GitHub Actions workflow in that repository.' },
  { icon: 'check', title: 'Check', text: 'Actions installs the packages, runs the type check and unit tests. A failure stops here.' },
  { icon: 'key', title: 'SSH, one command', text: 'Actions connects over SSH with a key the server accepts for one command only: deploy that app.' },
  { icon: 'terminal', title: 'Build beside, restart', text: 'The server pulls main, builds beside the running version and restarts through systemd. A failed build keeps the old version running.' },
  { icon: 'globe', title: 'Health check', text: 'The run turns green only once the API health check and the sign-in page both answer.' },
];

export const NEXUS_DEPLOY_FACTS: { value: string; label: string }[] = [
  { value: '~3 min', label: 'Push to live, API' },
  { value: '~12 min', label: 'Push to live, web app' },
  { value: '₹0', label: 'Hosting a month' },
  { value: '1 GB', label: 'RAM + 4 GB swap' },
];

export const NEXUS_HOSTING: string[] = [
  'Oracle Cloud Always Free VM in Mumbai, Ubuntu 24.04, next to the MongoDB Atlas cluster.',
  "Caddy serves the web app and the API on one HTTPS address with a Let's Encrypt certificate.",
  'systemd keeps both apps running and restarts them on their own.',
  'A free DuckDNS subdomain gives it a name. One run at a time: a newer push waits instead of cancelling a deploy halfway.',
];
