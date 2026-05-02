// apps/qw-oracle/scripts/load-chat/classify.ts
//
// Deterministic message classifier. No LLM. Port of scripts/process-tier1.mjs
// classification rules (process-tier1.mjs:56-93) with two hygiene tightenings:
//
// 1. BOT_COMMAND_PATTERNS removed -- IRC-era artifact (process-tier1.mjs:26-30).
//    Discord exposes author_is_bot reliably; the pattern slice false-positives on
//    .zip / .tar.gz / !Voteban / numeric expressions from human authors.
//    See docs/superpowers/specs/2026-05-02-layer2-hygiene-design.md bot category audit.
//
// 2. Duplicate 'xd' removed from REACTION_WORDS (was at process-tier1.mjs:37 and :39).

const REACTION_WORDS: ReadonlySet<string> = new Set([
  ':)', ':(', ':D', ':P', ':p', ':/', ':\\', ':>', ':<', ';)', ';(',
  ':-)', ':-(', ':-D', ':-P', ':-/', ':-\\', ':o', ':O', ':x', ':X',
  'xD', 'XD', 'xd', ':3', '<3', '>:(',
  'lol', 'heh', 'hehe', 'rofl', 'lmao',
  'ah', 'oh', 'ha', 'haha', 'k', 'ok',
  'ya', 'ye', 'jo', 'yep', 'yea', 'nah', 'mhm', 'hmm',
  '+1', 'gg', 'gl', 'hf', 'ns', 'nt', 'wp', 'gj', 'thx', 'ty', 'np',
]);

const SINGLE_EMOJI = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]{1,3}$/u;
const LINK_ONLY = /^https?:\/\/\S+$/;

function isReaction(content: string): boolean {
  if (REACTION_WORDS.has(content)) return true;
  if (SINGLE_EMOJI.test(content)) return true;
  return false;
}

export type Category = 'chat' | 'bot' | 'reaction' | 'link' | 'system';

export interface ClassifyInput {
  message_type: string;
  author_is_bot: boolean;
  content: string;
  attachment_count: number;
}

export function classifyMessage(msg: ClassifyInput): Category {
  if (msg.message_type !== 'message' && msg.message_type !== 'action') return 'system';
  if (msg.author_is_bot) return 'bot';

  const content = (msg.content ?? '').trim();
  if (content.length === 0) return msg.attachment_count > 0 ? 'link' : 'reaction';

  if (content.length <= 5 && isReaction(content)) return 'reaction';
  if (LINK_ONLY.test(content)) return 'link';
  return 'chat';
}
