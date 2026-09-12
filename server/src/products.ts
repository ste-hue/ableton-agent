/** Public product metadata. Never put store credentials or license keys here. */
export const CHORDARIUM = {
  id: 'chordarium',
  name: 'Chordarium',
  path: '/chordarium',
  category: 'Piano house composer',
  description: 'Find the chords. Shape the groove. Take a new idea into your next track.',
  platforms: 'macOS 11+ · Apple Silicon & Intel · Browser demo',
  status: '0.3.0 · Launch offer €59',
  action: 'Explore Chordarium',
  webUrl: 'https://chordarium.com',
  checkoutUrl: 'https://tembro.lemonsqueezy.com/checkout/buy/17e4b1a7-187d-4700-adba-cb07b41fb9ed?checkout[discount_code]=LAUNCH59',
  version: '0.3.0',
  downloadUrl: 'https://github.com/ste-hue/tembro-releases/releases/download/chordarium-v0.3.0/Chordarium-0.3.0-macOS-download.zip',
  downloadSha256: '90d82f0c1a8749112a82d9e726e419c3baad0b8f8f7493f34536c6d3e22c7a60',
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
