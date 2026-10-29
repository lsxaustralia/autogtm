export type TreeColourId = 'green' | 'white' | 'red' | 'gold';
export type LetterColourId = 'white' | 'gold' | 'red';

export interface MaterialSpec {
  color: string;
  roughness: number;
  metalness: number;
}

export interface TreeColourOption {
  id: TreeColourId;
  label: string;
  swatch: string;
  body: MaterialSpec;
  /** Banner plate colour used when the lettering is light (white or gold). */
  bannerDark: string;
  /** Ornament colours that sit well against this body colour. */
  baubles: [string, string];
}

export interface LetterColourOption {
  id: LetterColourId;
  label: string;
  swatch: string;
  material: MaterialSpec;
}

export const MAX_NAME_LENGTH = 12;

export const DEFAULT_NAMES: [string, string, string] = ['Emma', 'Noah', 'Oliver'];
export const DEFAULT_TREE_COLOUR: TreeColourId = 'green';
export const DEFAULT_LETTER_COLOUR: LetterColourId = 'white';

const MATTE = { roughness: 0.78, metalness: 0 };
const SILK_GOLD = { roughness: 0.38, metalness: 0.72 };

export const TREE_COLOURS: TreeColourOption[] = [
  {
    id: 'green',
    label: 'Traditional green',
    swatch: '#1f6b4f',
    body: { color: '#1d684c', ...MATTE },
    bannerDark: '#124532',
    baubles: ['#b3262f', '#d6ab4b'],
  },
  {
    id: 'white',
    label: 'Snow white',
    swatch: '#f1ede4',
    body: { color: '#eeebe3', ...MATTE },
    bannerDark: '#1a4a37',
    baubles: ['#b3262f', '#d6ab4b'],
  },
  {
    id: 'red',
    label: 'Berry red',
    swatch: '#a8262f',
    body: { color: '#a1222b', ...MATTE },
    bannerDark: '#5a0f17',
    baubles: ['#f1ede4', '#d6ab4b'],
  },
  {
    id: 'gold',
    label: 'Silk gold',
    swatch: '#c79a3c',
    body: { color: '#c4963d', ...SILK_GOLD },
    bannerDark: '#3a2a10',
    baubles: ['#b3262f', '#1d684c'],
  },
];

export const LETTER_COLOURS: LetterColourOption[] = [
  { id: 'white', label: 'White', swatch: '#f7f4ee', material: { color: '#f5f2ea', roughness: 0.7, metalness: 0 } },
  { id: 'gold', label: 'Gold', swatch: '#d4a73a', material: { color: '#d8ac48', ...SILK_GOLD, roughness: 0.32 } },
  { id: 'red', label: 'Red', swatch: '#b3262f', material: { color: '#b3232d', ...MATTE } },
];

/** Ivory plate used behind red lettering so it always reads clearly. */
export const BANNER_LIGHT = '#efe7d7';

export function getTreeColour(id: TreeColourId) {
  return TREE_COLOURS.find((c) => c.id === id) ?? TREE_COLOURS[0];
}

export function getLetterColour(id: LetterColourId) {
  return LETTER_COLOURS.find((c) => c.id === id) ?? LETTER_COLOURS[0];
}

export function bannerColourFor(tree: TreeColourId, letters: LetterColourId) {
  return letters === 'red' ? BANNER_LIGHT : getTreeColour(tree).bannerDark;
}

export const PRODUCT_PRICE = 'A$49.00';
