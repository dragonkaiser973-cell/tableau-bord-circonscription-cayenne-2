export interface EmojiDef {
  emoji: string;
  label: string;
  group: 'neg' | 'neu' | 'pos';
}

export const EMOJIS: EmojiDef[] = [
  { emoji: '😴', label: 'épuisé', group: 'neg' },
  { emoji: '😰', label: 'stressé', group: 'neg' },
  { emoji: '😤', label: 'frustré', group: 'neg' },
  { emoji: '😟', label: 'inquiet', group: 'neg' },
  { emoji: '😵\u200d💫', label: 'dépassé', group: 'neg' },
  { emoji: '😒', label: 'sceptique', group: 'neg' },
  { emoji: '❓', label: 'perdu', group: 'neu' },
  { emoji: '😐', label: 'neutre', group: 'neu' },
  { emoji: '🤔', label: 'perplexe', group: 'neu' },
  { emoji: '🧠', label: 'réflexion', group: 'neu' },
  { emoji: '👀', label: 'curieux', group: 'pos' },
  { emoji: '🙂', label: 'serein', group: 'pos' },
  { emoji: '💡', label: 'éclairé', group: 'pos' },
  { emoji: '💪', label: 'motivé', group: 'pos' },
  { emoji: '✨', label: 'inspiré', group: 'pos' },
  { emoji: '🔥', label: 'enthousiaste', group: 'pos' },
];

export const EMOJI_LABELS: Record<string, string> = Object.fromEntries(
  EMOJIS.map(e => [e.emoji, e.label])
);
