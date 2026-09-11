/** Public product metadata. Never put store credentials or license keys here. */
export const CHORDARIUM = {
  id: 'chordarium',
  name: 'Chordarium',
  path: '/chordarium',
  category: 'Piano house composer',
  description: 'Find the chords. Shape the groove. Take a new idea into your next track.',
  platforms: 'Browser · macOS',
  status: 'Available',
  action: 'Explore Chordarium',
  webUrl: 'https://chordarium.com',
  checkoutUrl: 'https://tembro.lemonsqueezy.com/checkout/buy/17e4b1a7-187d-4700-adba-cb07b41fb9ed',
} as const;

export const PRODUCTS = [
  {
    id: 'atlas', name: 'VST Atlas', path: '/atlas', category: 'Visual plug-in browser',
    description: 'Your collection, in view. Find the right plug-in and get back to the track.',
    platforms: 'macOS · Linux beta', status: 'Free beta', action: 'Explore Atlas',
  },
  CHORDARIUM,
  {
    id: 'rudiment', name: 'Rudiment', path: null, category: 'In development',
    description: 'A new instrument is taking shape. More when it is ready.',
    platforms: 'Details to come', status: 'Coming soon', action: 'Coming soon',
  },
] as const;
