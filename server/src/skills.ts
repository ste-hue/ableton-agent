export const TEMBRO_SKILL_IDS = [
  "clip_edit",
  "beat_making",
  "harmony_melody",
  "song_from_scratch",
] as const;

export type TembroSkillId = (typeof TEMBRO_SKILL_IDS)[number];

export interface TembroSkillProfile {
  id: TembroSkillId;
  label: string;
  shortLabel: string;
  description: string;
  prompt: string;
  creditMultiplier: number;
}

export const TEMBRO_SKILLS: readonly TembroSkillProfile[] = [
  {
    id: "clip_edit",
    label: "Tweak this clip",
    shortLabel: "Clip tweak",
    description: "One focused change to the selected clip or the Live Set.",
    prompt: "Make the selected clip breathe a little more. Keep its role and length.",
    creditMultiplier: 1,
  },
  {
    id: "beat_making",
    label: "Build a beat",
    shortLabel: "Beat making",
    description: "A playable groove with a pocket and a useful variation.",
    prompt: "Build an eight-bar beat with a clear pocket and one variation.",
    creditMultiplier: 2,
  },
  {
    id: "harmony_melody",
    label: "Harmony + melody",
    shortLabel: "Harmony / melody",
    description: "Chords and a melodic idea that leave room for the track.",
    prompt: "Write an eight-bar chord progression and a melody that leaves room.",
    creditMultiplier: 2,
  },
  {
    id: "song_from_scratch",
    label: "Arrange the whole thing",
    shortLabel: "Full arrangement",
    description: "A complete structure, with real transitions and readback.",
    prompt:
      "Build a full 128-bar arrangement with proper drum suspensions and fills only where they earn it.",
    creditMultiplier: 4,
  },
];

export function isTembroSkill(value: unknown): value is TembroSkillId {
  return typeof value === "string" && TEMBRO_SKILL_IDS.some((id) => id === value);
}

export function estimateCreditMultiplier(
  message: string,
  requestedSkill?: TembroSkillId,
): number {
  const requested = TEMBRO_SKILLS.find((profile) => profile.id === requestedSkill);
  let inferred = 1;
  const text = message.trim().toLowerCase();

  if (
    /\b(full|complete|whole)\s+(track|song|arrangement)\b/.test(text) ||
    /\b(song|track)\s+from\s+scratch\b/.test(text) ||
    /\b(arrangiamento|brano)\s+(completo|intero)\b/.test(text) ||
    /\b(?:64|96|128|160|192|256)\s*[-–—]?\s*(?:bars?|barre|battute)\b/.test(text)
  ) {
    inferred = 4;
  } else if (
    /\b(chords?|harmony|harmonies|melod(?:y|ies|ia|ie)|accordi?|armonia)\b/.test(text) ||
    /\b(beat|drums?|groove|batteria|ritmo|808)\b/.test(text)
  ) {
    inferred = 2;
  }

  return Math.max(inferred, requested?.creditMultiplier ?? 1);
}

export function estimateCreditCost(
  baseCreditCost: number,
  message: string,
  requestedSkill?: TembroSkillId,
): number {
  return baseCreditCost * estimateCreditMultiplier(message, requestedSkill);
}

export function publicSkillProfiles(baseCreditCost: number) {
  return TEMBRO_SKILLS.map(({ creditMultiplier, ...profile }) => ({
    ...profile,
    estimated_credits: baseCreditCost * creditMultiplier,
  }));
}
