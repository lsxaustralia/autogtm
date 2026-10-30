export type TreeColourId = 'green' | 'white' | 'red' | 'gold';
export type LetterColourId = 'white' | 'gold' | 'red' | 'green';

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
  },
  {
    id: 'white',
    label: 'Snow white',
    swatch: '#f1ede4',
    body: { color: '#eeebe3', ...MATTE },
  },
  {
    id: 'red',
    label: 'Berry red',
    swatch: '#a8262f',
    body: { color: '#a1222b', ...MATTE },
  },
  {
    id: 'gold',
    label: 'Silk gold',
    swatch: '#c79a3c',
    body: { color: '#c4963d', ...SILK_GOLD },
  },
];

export const LETTER_COLOURS: LetterColourOption[] = [
  { id: 'white', label: 'White', swatch: '#f7f4ee', material: { color: '#f5f2ea', roughness: 0.7, metalness: 0 } },
  { id: 'gold', label: 'Gold', swatch: '#d4a73a', material: { color: '#d8ac48', ...SILK_GOLD, roughness: 0.32 } },
  { id: 'red', label: 'Red', swatch: '#b3262f', material: { color: '#b3232d', ...MATTE } },
  { id: 'green', label: 'Green', swatch: '#1f6b4f', material: { color: '#1d684c', ...MATTE } },
];

/** The accent colour that matches each main colour, which would make the names disappear. */
export const CLASHING_ACCENT: Record<TreeColourId, LetterColourId> = {
  green: 'green',
  white: 'white',
  red: 'red',
  gold: 'gold',
};

/** A good accent to fall back to when the chosen main colour clashes with the current accent. */
export const FALLBACK_ACCENT: Record<TreeColourId, LetterColourId> = {
  green: 'white',
  white: 'red',
  red: 'white',
  gold: 'red',
};

export function getTreeColour(id: TreeColourId) {
  return TREE_COLOURS.find((c) => c.id === id) ?? TREE_COLOURS[0];
}

export function getLetterColour(id: LetterColourId) {
  return LETTER_COLOURS.find((c) => c.id === id) ?? LETTER_COLOURS[0];
}

export const PRODUCT_PRICE = 'A$49.00';
