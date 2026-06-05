// The 12 Phase-8 anchor questions, copied verbatim from the shipped eval set
// (apps/qw-oracle/eval/eval-queries.json). These are real-user-shaped questions
// hand-curated from #helpdesk; here they serve as a neutral, arm-independent
// half of the calibration query set (the other half is reverse-generated).
//
// We keep id + category for traceability in the results doc. The out-of-corpus
// pair (11/12) deliberately has no good chat-session answer -- they test whether
// any arm hallucinates a hit on a question the corpus cannot answer.

export interface AnchorQuery {
  id: string;
  category: string;
  query: string;
}

export const PHASE8_ANCHORS: AnchorQuery[] = [
  { id: 'p8-1', category: 'concept-anchored', query: 'how do I change the lightning gun color, the white beam looks bad' },
  { id: 'p8-2', category: 'concept-anchored', query: 'how do I make a weapon script that picks the best weapon I have ammo for' },
  { id: 'p8-3', category: 'concept-anchored', query: 'what is the difference between teamskin, baseskin, and teamforceskins' },
  { id: 'p8-4', category: 'concept-anchored', query: 'why are %e and %E removed from teamplay messages, what should I use instead' },
  { id: 'p8-5', category: 'vague-natural-language', query: 'after I close ezquake on Windows the screen brightness keeps flickering between two states' },
  { id: 'p8-6', category: 'vague-natural-language', query: 'when I pick up quad I only see a white tint instead of the blue glow' },
  { id: 'p8-7', category: 'vague-natural-language', query: 'some walls show up flat-colored or wireframe-looking but only in certain places' },
  { id: 'p8-8', category: 'vague-natural-language', query: 'I get small stutters every few minutes on linux even with sys_highpriority and CPU affinity set' },
  { id: 'p8-9', category: 'vague-natural-language', query: 'how do I toggle and move the armor icon in the HUD' },
  { id: 'p8-10', category: 'exact-name', query: 'cl_portpingprobe_enable' },
  { id: 'p8-11', category: 'out-of-corpus', query: 'how do I set up a Minecraft server with custom plugins' },
  { id: 'p8-12', category: 'out-of-corpus', query: 'how do I set up automatic map rotation on my fteqw-sv64 server' },
];
