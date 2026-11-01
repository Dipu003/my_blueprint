// The two money algorithms of Nexus, ported from its backend (split-rules/split-calculator.ts and
// settlements/settlement-optimizer.ts) so the LLD demos run the very same maths. Integer minor units
// (paise) only.

export interface Share {
  id: string;
  /** floor(total × weight / Σweights) */
  floor: number;
  /** The fractional part, as a numerator over Σweights (BigInt keeps it exact). */
  remainder: bigint;
  /** True when this person got one of the leftover paise. */
  extra: boolean;
  amount: number;
}

/**
 * Largest-remainder allocation of `total` in proportion to positive integer weights: everyone gets
 * the floor of their exact share, then the few leftover units go one each to the largest remainders,
 * ties to the lowest id. The shares always add up to `total`.
 */
export function allocate(total: number, people: { id: string; weight: number }[]): Share[] {
  const T = BigInt(total);
  const sum = people.reduce((s, p) => s + BigInt(p.weight), 0n);
  const shares: Share[] = people.map((p) => {
    const num = T * BigInt(p.weight);
    return { id: p.id, floor: Number(num / sum), remainder: num % sum, extra: false, amount: 0 };
  });
  const leftover = total - shares.reduce((s, x) => s + x.floor, 0);
  const order = shares
    .map((_, i) => i)
    .sort((a, b) =>
      shares[a].remainder !== shares[b].remainder
        ? shares[a].remainder > shares[b].remainder
          ? -1
          : 1
        : shares[a].id < shares[b].id
          ? -1
          : 1,
    );
  order.slice(0, leftover).forEach((i) => (shares[i].extra = true));
  shares.forEach((s) => (s.amount = s.floor + (s.extra ? 1 : 0)));
  return shares;
}

export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

/**
 * Deterministic greedy settlement: exact matches first, then debtors and creditors (largest first,
 * ties by id) are matched in order, each transfer being the smaller outstanding amount.
 */
export function settle(balances: { id: string; net: number }[]): Transfer[] {
  const largestFirst = (a: { id: string; left: number }, b: { id: string; left: number }) =>
    b.left - a.left || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const debtors = balances.filter((b) => b.net < 0).map((b) => ({ id: b.id, left: -b.net })).sort(largestFirst);
  const creditors = balances.filter((b) => b.net > 0).map((b) => ({ id: b.id, left: b.net })).sort(largestFirst);
  const out: Transfer[] = [];

  for (const d of debtors) {
    const match = creditors.find((c) => c.left > 0 && c.left === d.left);
    if (match) {
      out.push({ from: d.id, to: match.id, amount: d.left });
      match.left = 0;
      d.left = 0;
    }
  }

  const ds = debtors.filter((d) => d.left > 0);
  const cs = creditors.filter((c) => c.left > 0);
  let i = 0;
  let j = 0;
  while (i < ds.length && j < cs.length) {
    const amount = Math.min(ds[i].left, cs[j].left);
    out.push({ from: ds[i].id, to: cs[j].id, amount });
    ds[i].left -= amount;
    cs[j].left -= amount;
    if (ds[i].left === 0) i += 1;
    if (cs[j].left === 0) j += 1;
  }
  return out;
}

/** Replays the transfers against the balances, as Nexus does before answering: true when everyone ends at zero. */
export function settles(balances: { id: string; net: number }[], transfers: Transfer[]): boolean {
  const left = new Map(balances.map((b) => [b.id, b.net]));
  for (const t of transfers) {
    const from = left.get(t.from);
    const to = left.get(t.to);
    if (from === undefined || to === undefined || t.from === t.to || t.amount <= 0) return false;
    if (t.amount > -from || t.amount > to) return false;
    left.set(t.from, from + t.amount);
    left.set(t.to, to - t.amount);
  }
  return [...left.values()].every((v) => v === 0);
}

/** "₹1,234.56" from paise. */
export const rupees = (paise: number) =>
  `${paise < 0 ? '−' : ''}₹${(Math.abs(paise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** "250.5" or "₹1,000" typed in a box, to paise; null when it is not a usable amount. */
export function parseRupees(text: string): number | null {
  const clean = text.replace(/[₹,\s]/g, '');
  if (!/^\d{1,9}(\.\d{0,2})?$/.test(clean)) return null;
  const [whole, frac = ''] = clean.split('.');
  const paise = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  return paise >= 1 ? paise : null;
}
