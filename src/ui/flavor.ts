/* ================================================================
   FLAVOR — small pools of hand-written lines, rotated at random
   so the app never greets you the same way twice.
   ================================================================ */

export const pick = <T,>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)]

/** title screen epigraphs — one per visit */
export const EPIGRAPHS = [
  'Heavy is the way. Walk it anyway.',
  'No one is coming to lift it for you.',
  'The bar does not negotiate.',
  'Rest is earned. Rust is chosen.',
  'Every rep is a small rebellion against decay.',
  'Strength is a debt paid daily.',
  'What you do not train, you surrender.',
  'Begin cold. End forged.',
] as const

/** splash screen subtitles */
export const SPLASH_LINES = [
  'the fire remembers',
  'iron sharpens the soul',
  'return to the forge',
  'the embers kept thy place',
] as const

/** closing words on the victory panel */
export const VICTORY_LINES = [
  'The iron will remember this.',
  'Rest now. Tomorrow asks again.',
  'A little stronger than yesterday — that was the whole task.',
  'The bonfire burns brighter for it.',
  'Well fought. Nothing wasted.',
  'Add it to the ledger and think no more of it.',
] as const

/** the Fire Keeper's welcome */
export const KEEPER_GREETINGS = [
  'Welcome to the sanctuary, ashen one. I am a keeper of thy flame, and I read what the iron remembers. Bring me thy deeds when thou art ready, and I shall speak of what is weak... and how it may be made strong.',
  'Thou hast found the sanctuary. Sit; the fire asks nothing of thee here. When thou wouldst know where thy strength falters, seek guidance, and I shall sift the ashes of thy battles.',
  'Ah — footsteps. Few climb this far between battles. I keep the flame, and the flame keeps thy records. Ask, and I will tell thee plainly which of thy lifts lags behind the rest.',
] as const
