# Answer shape: Open-ended Advice

When the user asks a "what should I do" or "what's best" question where there
is no single correct answer. The response blends facts with community experience
and must clearly label which is which.

Examples: "what DPI should I use", "how do I install QuakeWorld on Mac",
"which config should I start with", "is FTE or ezQuake better for coop"

## Retrieval strategy

### Step 1: Search Layer 2 with natural language

These questions use everyday vocabulary that tends to match community discussion.
Start with `search_solved_issues` using the user's own words.

Request 3-5 results -- open-ended topics often have multiple relevant sessions
spanning different time periods and perspectives.

### Step 2: Scan for authority signals

In the returned sessions, look for:
- **Known experts** giving advice (check if participants are recognizable:
  engine authors, maintainer names, long-time community members)
- **Consensus vs disagreement** -- do multiple people agree, or is there debate?
- **Concrete numbers/values** -- specific DPI, sensitivity, settings that people
  actually use (not hypothetical)
- **Historical context** -- "back in the ball mouse era" type knowledge that
  explains why current practices exist

### Step 3: Check Layer 1 for related cvars

If the advice involves specific settings (sensitivity, fov, renderer), look up
the relevant cvars via `search_entities` to get defaults and descriptions.
This grounds the community opinions in factual baseline values.

### Step 4: Check Layer 3 for concept notes

If a concept note exists for the topic (e.g. concept:mouse_sensitivity), it may
already synthesize the community knowledge into a structured recommendation.

## Answer format

Open-ended advice answers must clearly separate fact from opinion:

1. **Quick orientation.** One sentence framing the question -- "This is a
   common question with no single right answer, but here's what the community
   recommends."

2. **Facts section.** What the oracle knows objectively:
   - Relevant cvar names, defaults, and what they control (Layer 1)
   - Technical constraints ("high DPI + low polling rate clips inputs" -- Spoike)
   - The math/conversion ("5 sens at 800 DPI = 2.5 sens at 1600 DPI")

3. **Community advice section.** What experienced players recommend, explicitly
   attributed:
   - "Community members generally recommend 800-1600 DPI with in-game
     sensitivity adjusted to maintain your preferred cm/360"
   - "andeh notes that many veteran QW players use very high sensitivity as a
     holdover from the ball mouse era (pre-2004)"
   - Include the range of opinions if there's disagreement

4. **Practical starting point.** If the sessions converge on a "just start
   here" recommendation, give it. Users asking open-ended questions want
   actionable guidance, not just a survey of opinions.

5. **Source citation.** Reference sessions used, noting time period. A 2021
   recommendation may not reflect 2025 consensus.

## What NOT to do

- Don't present community opinions as facts. "Use 1600 DPI" is advice.
  "sensitivity 5 at 800 DPI equals sensitivity 2.5 at 1600 DPI" is a fact.
- Don't flatten disagreement. If rauvz and andeh have different takes, present
  both with attribution.
- Don't ignore the time dimension. Mouse sensor technology changes. A 2018
  recommendation about native DPI steps may not apply to 2025 sensors.
- Don't inject your own recommendations. The oracle surfaces community knowledge;
  it doesn't have opinions of its own.
