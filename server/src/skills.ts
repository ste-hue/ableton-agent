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
    prompt:
      "Focus: one musical improvement to the selected clip or Set. Serve the user's actual request — the user's words always override this focus.",
    creditMultiplier: 1,
  },
  {
    id: "beat_making",
    label: "Build a beat",
    shortLabel: "Beat making",
    description: "A playable groove with a pocket and a useful variation.",
    prompt:
      "Focus: groove. Build a beat with a real pocket in the style the user implies. When the user does not limit the scope, think full-track: the groove plus the variations and fills a complete arrangement needs. Verify the kit's actual pad mapping before writing a single note. The user's words override this focus.",
    creditMultiplier: 2,
  },
  {
    id: "harmony_melody",
    label: "Harmony + melody",
    shortLabel: "Harmony / melody",
    description: "Chords and a melodic idea that leave room for the track.",
    prompt:
      "Focus: harmony and melody that serve the track — voice-leading over block chords, a melody with space, in the key and mood the user implies. When the user does not limit the scope, write enough harmonic material to carry a complete arrangement, not a sketch. The user's words override this focus.",
    creditMultiplier: 2,
  },
  {
    id: "song_from_scratch",
    label: "Arrange the whole thing",
    shortLabel: "Full arrangement",
    description: "A complete structure, with real transitions and readback.",
    prompt:
      "Focus: a complete track that stands on its own — structure, energy curve, transitions that earn their place. Scale and genre come from the user's words, which always override this focus.",
    creditMultiplier: 4,
  },
];

export function isTembroSkill(value: unknown): value is TembroSkillId {
  return typeof value === "string" && TEMBRO_SKILL_IDS.some((id) => id === value);
}

/** The musical guidance the pressed skill button carries to the model. */
export function skillPromptFor(skill: TembroSkillId | null | undefined): string | undefined {
  if (!skill) return undefined;
  return TEMBRO_SKILLS.find((profile) => profile.id === skill)?.prompt;
}

export function estimateCreditMultiplier(
  message: string,
  requestedSkill?: TembroSkillId,
): number {
  const requested = TEMBRO_SKILLS.find((profile) => profile.id === requestedSkill);
  let inferred = 1;
  // Only the user's own words may raise the price above the pressed button.
  // The device pastes the skill's prompt into the message box, and that prompt
  // describes a full-track scope ("complete arrangement"): left in, it priced
  // every beat and harmony button at 4 credits.
  const text = (requested ? message.split(requested.prompt).join(" ") : message)
    .trim()
    .toLowerCase();

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
