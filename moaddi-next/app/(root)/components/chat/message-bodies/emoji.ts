/**
 * Detects whether a text message is "emoji-only" — nothing but emoji (and
 * surrounding whitespace) — so the bubble can render it large with no
 * background, WhatsApp/Messenger-style.
 *
 * A naive `/^\p{Extended_Pictographic}+$/u` test breaks on anything but the
 * simplest emoji: a skin-toned emoji, a ZWJ family sequence (👨‍👩‍👧), or a flag
 * (🇸🇦) is multiple Unicode codepoints that must count as ONE character for
 * this purpose. `Intl.Segmenter`'s grapheme granularity is what correctly
 * groups those codepoints back into the single visual unit a user typed.
 */

const MAX_EMOJI_COUNT = 3;

const EXTENDED_PICTOGRAPHIC = /\p{Extended_Pictographic}/u;
const REGIONAL_INDICATOR = /\p{Regional_Indicator}/u;
const ZERO_WIDTH_JOINER = /\u200d/g;
const VARIATION_SELECTOR = /\ufe0f/g;
const SKIN_TONE_MODIFIER = /[\u{1F3FB}-\u{1F3FF}]/gu;

function toGraphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), (entry) => entry.segment);
  }
  // Degraded fallback for a runtime without Intl.Segmenter: splits on
  // codepoints rather than full grapheme clusters, so a ZWJ sequence like
  // a family emoji is (harmlessly) treated as several graphemes instead of
  // one — it can undercount toward MAX_EMOJI_COUNT but never misclassifies
  // plain text as emoji-only.
  return Array.from(text);
}

function isEmojiGrapheme(grapheme: string): boolean {
  const stripped = grapheme
    .replace(ZERO_WIDTH_JOINER, "")
    .replace(VARIATION_SELECTOR, "")
    .replace(SKIN_TONE_MODIFIER, "");

  // Everything in the grapheme was a joiner/selector/skin-tone modifier
  // around a pictograph that got stripped alongside it — still an emoji.
  if (stripped.length === 0) return true;

  return Array.from(stripped).every(
    (char) => EXTENDED_PICTOGRAPHIC.test(char) || REGIONAL_INDICATOR.test(char),
  );
}

/**
 * @param maxCount caps how many emoji still count as "emoji-only" — beyond
 *   this a message reads as a string of emoji rather than a reaction-sized
 *   expression, so it falls back to a normal bubble.
 */
export function isEmojiOnlyText(
  text: string | undefined | null,
  maxCount: number = MAX_EMOJI_COUNT,
): boolean {
  const trimmed = text?.trim();
  if (!trimmed) return false;

  const graphemes = toGraphemes(trimmed);
  if (graphemes.length === 0 || graphemes.length > maxCount) return false;

  return graphemes.every(isEmojiGrapheme);
}
