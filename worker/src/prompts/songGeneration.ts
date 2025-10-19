/**
 * Song Prompt Generation
 * Creates detailed prompts for ElevenLabs music generation
 */

import type {
  SongType,
  SongTheme,
  MusicalStyle,
} from '../schemas/song';
import type { MoralFocus } from '../schemas/story';

export function buildSongPromptGenerationPrompt(
  childName: string,
  songType: SongType,
  theme: SongTheme,
  moralFocus: MoralFocus,
  musicalStyle: MusicalStyle,
  lengthSeconds: number
): string {
  const typeDescription = {
    song: 'a complete song with verses and chorus',
    rhyme: 'a playful nursery rhyme with repetitive, catchy verses',
    instrumental: 'an instrumental piece without lyrics',
  }[songType];

  const themeDescription = {
    bedtime: 'calming and soothing, perfect for bedtime',
    adventure: 'exciting and energetic, inspiring exploration',
    learning: 'educational and engaging, making learning fun',
    celebration: 'joyful and uplifting, celebrating achievements',
    friendship: 'warm and heartfelt, about friendship and kindness',
  }[theme];

  const styleDescription = {
    lullaby: 'soft, gentle lullaby with slow tempo',
    pop: 'upbeat, catchy pop song with memorable melody',
    folk: 'acoustic folk style with simple, natural instrumentation',
    classical: 'orchestral classical music with elegant arrangements',
    jazz: 'playful jazz with swinging rhythm and improvisation',
  }[musicalStyle];

  const instrumentalNote = songType === 'instrumental'
    ? '\n\nIMPORTANT: This is an INSTRUMENTAL piece. Do NOT include any lyrics in the song_prompt. Focus only on musical elements, instrumentation, and mood.'
    : `\n\nThe song should include lyrics appropriate for children, incorporating the name "${childName}" naturally.`;

  return `You are a children's music composer. Create a ${typeDescription} for a child named ${childName}.

SONG REQUIREMENTS:
- Theme: ${themeDescription}
- Musical Style: ${styleDescription}
- Moral Focus: ${moralFocus} - subtly incorporate lessons about ${moralFocus}
- Duration: approximately ${lengthSeconds} seconds
- Age-appropriate content for children ages 4-12${instrumentalNote}

Create a detailed music prompt that includes:
1. A catchy, child-friendly title
2. A comprehensive song_prompt describing:
   - Musical style and instrumentation
   - Mood and tempo
   - ${songType !== 'instrumental' ? 'Lyrical themes and structure (verse/chorus)' : 'Musical structure and progression'}
   - Key emotional elements
3. ${songType !== 'instrumental' ? 'A lyrics_preview showing the first verse or main hook' : 'Skip lyrics_preview field'}

Return STRICT JSON only:
${songType !== 'instrumental' ? `{
  "title": "song title here",
  "song_prompt": "detailed prompt for music generation (3-5 sentences)",
  "lyrics_preview": "first verse or chorus of the song"
}` : `{
  "title": "instrumental piece title here",
  "song_prompt": "detailed prompt for instrumental music generation (3-5 sentences)"
}`}`;
}

/**
 * Build a Gemini prompt that asks for a full ElevenLabs-compatible composition plan
 * with explicit sections and lyric lines, so vocals align to provided text.
 */
export function buildSongCompositionPlanPrompt(
  childName: string,
  songType: SongType,
  theme: SongTheme,
  moralFocus: MoralFocus,
  musicalStyle: MusicalStyle,
  lengthSeconds: number,
  vocalStyleDescriptor?: string,
  vocalStyleTags?: string[]
): string {
  const typeNote = songType === 'rhyme'
    ? 'Favor short, repetitive rhyme lines and a memorable refrain.'
    : 'Include clear verses and a catchy chorus.';

  // Guidance for sections; Gemini must output strict JSON matching MusicPrompt
  const tagsLine = vocalStyleTags && vocalStyleTags.length
    ? `\nSeed singer tags (must include ALL of these in positive_global_styles): [${vocalStyleTags.join(', ')}]`
    : '';

  // Tempo guidance based on theme and style
  const tempo = getTempoGuidance(theme, musicalStyle);
  const tempoLines = `Tempo guidance: ${tempo.label} (${tempo.bpm}).\n` +
    `Phrasing: ${tempo.phrasing}. Keep note density low with ${tempo.wordsPerLine} words per line; avoid rapid syllables.\n` +
    `Add to negative_global_styles: ${tempo.negative.join(', ')}.`;

  return `You are a children's songwriter. Create a full COMPOSITION PLAN for ElevenLabs Music.

Requirements:
- Audience: children ages 4-10
- Child's name to include naturally in the chorus: "${childName}"
- Theme: ${theme}
- Moral focus: ${moralFocus} (teach gently through lyrics)
- Musical style: ${musicalStyle}
${vocalStyleDescriptor ? `- Vocal style (singer characteristics): ${vocalStyleDescriptor}
  Include tags that reflect this in positive_global_styles and in positive_local_styles for sections with singing.` : ''}
${tagsLine}
- ${tempoLines}
- Duration target: ~${lengthSeconds} seconds (use section durations in milliseconds that approximately sum to this)
- ${typeNote}
- Keep language simple and singable; 4–8 words per line works well.

Return STRICT JSON ONLY with this exact schema (no extra fields). Ensure that the sum of all section duration_ms is within ±5% of ${lengthSeconds * 1000} ms. Prefer 3–5 sections total. Keep 2–3 lines per section and ${tempo.wordsPerLine} words per line. Schema:
{
  "positive_global_styles": ["string"],
  "negative_global_styles": ["string"],
  "sections": [
    {
      "section_name": "intro|verse|chorus|bridge|outro",
      "positive_local_styles": ["string"],
      "negative_local_styles": ["string"],
      "duration_ms": 12000,
      "lines": ["lyric line 1", "lyric line 2"]
    }
  ]
}

Notes:
- Use 3-6 total sections.
- Ensure at least one 'chorus' section; repeat the chorus exactly in each chorus occurrence.
- Include the child's name "${childName}" in the chorus lines.
- For 'instrumental' you would leave lines empty, BUT for this request the song is with lyrics.
`;
}

/** Tempo guidance helper to slow down over-eager generations */
function getTempoGuidance(theme: SongTheme, style: MusicalStyle): {
  bpm: string;
  label: string;
  phrasing: string;
  wordsPerLine: string;
  negative: string[];
} {
  // Defaults
  let bpm = '75–95 BPM';
  let label = 'moderate tempo';
  let phrasing = 'legato, gentle phrasing with sustained vowels';
  let wordsPerLine = '4–6';

  // Theme-based overrides
  if (theme === 'bedtime') {
    bpm = '55–70 BPM';
    label = 'slow, lullaby tempo';
    phrasing = 'very legato, soft dynamics, long held vowels';
    wordsPerLine = '3–5';
  } else if (theme === 'learning' || theme === 'friendship') {
    bpm = '65–85 BPM';
    label = 'calm, steady tempo';
  } else if (theme === 'adventure' || theme === 'celebration') {
    bpm = '80–100 BPM';
    label = 'moderate, uplifting tempo';
  }

  // Style nudges
  if (style === 'lullaby' || style === 'classical') {
    bpm = theme === 'bedtime' ? '55–68 BPM' : '60–80 BPM';
    phrasing = 'legato, smooth lines, minimal consonant attack';
    wordsPerLine = theme === 'bedtime' ? '3–5' : '4–6';
  } else if (style === 'folk') {
    bpm = '65–85 BPM';
    phrasing = 'gentle, flowing phrasing';
  } else if (style === 'jazz') {
    bpm = '70–90 BPM';
    phrasing = 'laid-back swing, smooth delivery';
  } else if (style === 'pop') {
    bpm = theme === 'bedtime' ? '65–80 BPM' : '75–95 BPM';
  }

  const negative = ['fast', 'uptempo', 'aggressive', 'busy', 'dense_lyrics', 'rap', 'shout'];
  return { bpm, label, phrasing, wordsPerLine, negative };
}

/** Exported utility to reuse tempo lines elsewhere */
export function getTempoGuidanceLines(theme: SongTheme, style: MusicalStyle, lengthSeconds: number): string {
  const t = getTempoGuidance(theme, style);
  return [
    `Tempo guidance: ${t.label} (${t.bpm}).`,
    `Phrasing: ${t.phrasing}. Keep note density low with ${t.wordsPerLine} words per line; avoid rapid syllables.`,
    `Add to negative styles: ${t.negative.join(', ')}.`,
    `Ensure section duration_ms sums within ±5% of ${lengthSeconds * 1000} ms and limit lines per section to 2–3.`,
  ].join('\n');
}
