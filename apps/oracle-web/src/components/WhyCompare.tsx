// WhyCompare.tsx -- the "why do I need this?" comparison overlay content
// (Task 8). Port of the mockup's COMPARE constant, byte-identical (mockup
// 842-864; P1/P8).
//
// P6: this component SHIPS DARK. It is fully built and lands in the bundle,
// but Floor1Brain only renders a door to it (the herolinks "Why do I need
// this?" pill) when App.tsx's ?dev=why flag is set -- that wiring lives in
// Floor1Brain/App.tsx, not here. This component has no opinion about how
// it's reached; it only renders the overlay's content.
//
// The draftstamp below is load-bearing (cold review): while the four answer
// columns still hold placeholder copy, the stamp is what stops a leaked
// ?dev=why view from reading as a published claim. It must survive into the
// shipped bundle verbatim -- it only leaves once the eval arc's real
// captures replace the placeholder answers.
import type { JSX } from 'solid-js'

function Qa(props: { q: string; alone: JSX.Element; withOracle: JSX.Element }) {
  return (
    <div class="qa">
      <div class="q">“{props.q}”</div>
      <div class="cols">
        <div class="col alone">
          <div class="ch">agent alone</div>
          {props.alone}
        </div>
        <div class="col with">
          <div class="ch">agent + oracle</div>
          {props.withOracle}
        </div>
      </div>
    </div>
  )
}

export default function WhyCompare() {
  return (
    <>
      <h3>WHY DO I NEED THIS?</h3>
      <div class="headline">
        <span class="s">
          Because agents sound confident about QuakeWorld while being wrong. Same question, same agent
          — the only difference is the oracle connection.
        </span>
      </div>
      <span class="draftstamp">
        draft — final page shows verbatim captured answers, dated + model-labeled
      </span>

      <Qa
        q="Why does my rocket feel delayed on antilag servers?"
        alone="Rockets can feel delayed due to network latency or lag compensation. Try lowering your ping, or look for client-side prediction settings that might smooth out projectiles."
        withOracle={
          <>
            Antilag rewinds <b>hitscan</b>, not projectiles — rockets always fly in real time; what you
            feel is your own latency, which hitscan hides and rockets don't. See dust0r's in-client
            stopwatch test: antilag 1 vs 2 rocket travel times are identical.{' '}
            <code>search_solved_issues → #antilag, solved</code>
          </>
        }
      />
      <Qa
        q="What exactly does the antilag hitscan rewind cap do?"
        alone="It likely limits how far back the server rewinds player positions, commonly around one second in most engines, to prevent abuse by high-ping players."
        withOracle={
          <>
            The cap bounds hitscan rewind at 250ms — and per the maintainer discussion the exact value
            is arbitrary; it was questioned as 250 vs 150ms and clarified in-thread.{' '}
            <code>search_solved_issues → #antilag, solved</code>
          </>
        }
      />
      <Qa
        q="How do I set up weapon scripts in current ezQuake?"
        alone="Create an autoexec.cfg and bind keys with aliases that use the 'impulse' commands to switch weapons, like most Quake engines from that era."
        withOracle={
          <>
            Three practical methods — selection priorities, no-backpack-drop settings, and server-side{' '}
            <b>w_rank</b> for lossy/high-ping connections — with ruleset caveats.{' '}
            <code>get_concept_note("weapon-scripts")</code>
          </>
        }
      />
      <Qa
        q="How does hoonymode scoring work?"
        alone="Hoonymode appears to be a community mod; it probably modifies scoring, though details vary by server."
        withOracle={
          <>
            Every round ends on a single frag; players swap spawns each round-pair so both play both
            spawns; series is tennis-style — first to seven round-wins, must lead by two.{' '}
            <code>get_concept_note("hoonymode")</code>
          </>
        }
      />

      <div class="escnote">esc / click outside to close</div>
    </>
  )
}
