// Game pointers: five angular, faceted designs with recessed windows, bright faces and accent shards
// (the artwork is in pointer-shapes.ts). Each is coloured for both themes:
//   light: the reference colours, a blue body with cyan faces, with orchid shards (the reference's yellow
//          did not suit the violet site);
//   dark:  the same artwork in the dark theme's palette: a violet body with ice-blue faces and orchid shards.
// The same design is used everywhere on the page, the tabs included; over buttons, links, tiles and
// tabs ("hot") it only lights up, with the same colours a little brighter and a stronger glow.
// PointerRotator publishes one design at a time as the --ptr-* custom properties used in globals.css.

import { NODE_RING, SHAPES } from './pointer-shapes';

export type PointerTheme = 'dark' | 'light';
export type PointerRole = 'idle' | 'hot';

interface Pal {
  hi: string; // body, top-left
  mid: string;
  lo: string; // body, bottom-right
  deep: [string, string]; // recessed windows, top to bottom
  bright: [string, string]; // faces and frames
  acc: [string, string]; // shards and small windows
  line: string; // outline, and the dark channels between the parts
  glow: string;
}

// Over buttons, links, tiles and tabs the same pointer lights up: the same colours, lifted a little.
const PALETTES: Record<PointerTheme, Record<PointerRole, Pal>> = {
  light: {
    idle: {
      hi: '#63cefd',
      mid: '#2e9bec',
      lo: '#0f6fdc',
      deep: ['#0b66ea', '#0a4fc8'],
      bright: ['#8afff3', '#14f4ff'],
      acc: ['#ecc8ff', '#b65cf0'],
      line: '#0a1a3d',
      glow: '#38bdf8',
    },
    hot: {
      hi: '#a9e8ff',
      mid: '#58b6f8',
      lo: '#2a80ee',
      deep: ['#2f7ff2', '#1f62d4'],
      bright: ['#c4fff9', '#4cf6ff'],
      acc: ['#f5dcff', '#c97cf7'],
      line: '#0a1a3d',
      glow: '#67d4ff',
    },
  },
  dark: {
    idle: {
      hi: '#d9ccff',
      mid: '#9b7bff',
      lo: '#6a45e8',
      deep: ['#5a38d6', '#43279f'],
      bright: ['#d6f7ff', '#7fdcff'],
      acc: ['#f3d6ff', '#d98bff'],
      line: '#0a0718',
      glow: '#9b7bff',
    },
    hot: {
      hi: '#efe8ff',
      mid: '#b9a2ff',
      lo: '#8463f5',
      deep: ['#7756ee', '#5a3fcf'],
      bright: ['#e9fbff', '#a6e9ff'],
      acc: ['#f9e6ff', '#e6a8ff'],
      line: '#0a0718',
      glow: '#c7b5ff',
    },
  },
};

export const POINTER_COUNT = SHAPES.length;
export const POINTER_NAMES = SHAPES.map((s) => s.name);

// Chrome hides custom cursors bigger than 32px near the right and bottom edges of the window, so the
// pointer stays inside a 32px cell, with its tip 3px in from the top-left corner. The drawing is
// scaled to be FIT tall, which leaves room around it for the outline and the glow.
const CELL = 32;
const TIP_IN_CELL = 3;
const FIT = 26;

export interface BuiltPointer {
  /** The raw SVG markup. */
  svg: string;
  /** The image as a data: URL. */
  url: string;
  /** A CSS `cursor` image: url("data:...") followed by the hot-spot, without a fallback keyword. */
  css: string;
  name: string;
  size: number;
  hotspot: [number, number];
}

/** Percent-encodes the characters that would break a data: URL (the SVG uses single quotes only). */
const encode = (svg: string) => svg.replace(/</g, '%3C').replace(/>/g, '%3E').replace(/#/g, '%23');
const round = (n: number, places = 2) => Math.round(n * 10 ** places) / 10 ** places;

export function buildPointer(index: number, theme: PointerTheme, role: PointerRole): BuiltPointer {
  const shape = SHAPES[((index % POINTER_COUNT) + POINTER_COUNT) % POINTER_COUNT];
  const hot = role === 'hot';
  const p = PALETTES[theme][role];
  const [w, h] = shape.size;

  const s = FIT / h; // cell units per drawing unit
  const u = (cell: number) => round(cell / s); // a length in cell units, as drawing units
  const stops = (a: string, b: string) => `<stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/>`;
  const vertical = (id: string, [a, b]: [string, string]) =>
    `<linearGradient id='${id}' gradientUnits='userSpaceOnUse' x1='0' y1='0' x2='0' y2='${h}'>${stops(a, b)}</linearGradient>`;

  const nodeParts =
    shape.name === 'Node'
      ? `<circle cx='${NODE_RING.ring[0]}' cy='${NODE_RING.ring[1]}' r='10.2' fill='none' stroke='${p.line}' stroke-width='2.4'/>` +
        `<circle cx='${NODE_RING.ring[0]}' cy='${NODE_RING.ring[1]}' r='7.4' fill='none' stroke='url(#c)' stroke-width='3.9'/>` +
        `<circle cx='${NODE_RING.ring[0]}' cy='${NODE_RING.ring[1]}' r='5.4' fill='url(#d)'/>` +
        `<circle cx='${NODE_RING.node[0] - 0.3}' cy='${NODE_RING.node[1] - 0.8}' r='4.3' fill='url(#y)'/>`
      : '';

  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${CELL}' height='${CELL}' viewBox='0 0 ${CELL} ${CELL}'>` +
    `<defs>` +
    `<linearGradient id='b' gradientUnits='userSpaceOnUse' x1='0' y1='0' x2='${round(w * 0.3)}' y2='${h}'>` +
    `<stop offset='0' stop-color='${p.hi}'/><stop offset='0.45' stop-color='${p.mid}'/><stop offset='1' stop-color='${p.lo}'/></linearGradient>` +
    vertical('d', p.deep) +
    vertical('c', p.bright) +
    vertical('y', p.acc) +
    `<filter id='g' x='-40%' y='-40%' width='180%' height='180%'><feGaussianBlur stdDeviation='${u(hot ? 1.5 : 1)}'/></filter>` +
    `</defs>` +
    `<g transform='translate(${TIP_IN_CELL} ${TIP_IN_CELL}) scale(${round(s, 4)})'>` +
    // glow, then a dark outline that also fills the channels, then the parts on top
    `<g filter='url(#g)'><path d='${shape.sil}' fill='${p.glow}' stroke='${p.glow}' stroke-width='${u(hot ? 3 : 2)}' stroke-linejoin='round' opacity='${hot ? 1 : 0.7}'/></g>` +
    `<path d='${shape.sil}' fill='${p.line}' stroke='${p.line}' stroke-width='${u(1.5)}' stroke-linejoin='round'/>` +
    `<path d='${shape.body}' fill='url(#b)' fill-rule='evenodd'/>` +
    (shape.deep ? `<path d='${shape.deep}' fill='url(#d)'/>` : '') +
    (shape.bright ? `<path d='${shape.bright}' fill='url(#c)' fill-rule='evenodd'/>` : '') +
    (shape.acc ? `<path d='${shape.acc}' fill='url(#y)' fill-rule='evenodd'/>` : '') +
    nodeParts +
    `</g></svg>`;

  const url = `data:image/svg+xml,${encode(svg)}`;
  return { svg, url, css: `url("${url}") ${TIP_IN_CELL} ${TIP_IN_CELL}`, name: shape.name, size: CELL, hotspot: [TIP_IN_CELL, TIP_IN_CELL] };
}

const THEMES: PointerTheme[] = ['dark', 'light'];
const ROLES: PointerRole[] = ['idle', 'hot'];

/** Every image of one design (both themes, both roles), for loading ahead of time. */
export function pointerUrls(index: number): string[] {
  return THEMES.flatMap((theme) => ROLES.map((role) => buildPointer(index, theme, role).url));
}

/** The custom properties (--ptr-<role>-<theme>) for one design: a full `cursor` value for every theme and role. */
export function pointerVars(index: number): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const theme of THEMES) {
    for (const role of ROLES) {
      vars[`--ptr-${role}-${theme}`] = `${buildPointer(index, theme, role).css}, ${role === 'idle' ? 'auto' : 'pointer'}`;
    }
  }
  return vars;
}
