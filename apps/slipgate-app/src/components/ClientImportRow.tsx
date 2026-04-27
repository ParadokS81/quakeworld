import { Show } from "solid-js";
import type { ClientFingerprint } from "../lib/quake-dir/clientFingerprint";
import { familyLabel } from "../lib/quake-dir/clientFingerprint";

export type Tier2Verdict =
  | { kind: "verified" }
  | { kind: "unrecognized" }
  | { kind: "stub" }; // ezQuake snapshot or FTE builds — no Tier-2 cache yet

export type CanonicalizePreview =
  | { kind: "already_canonical" }
  | { kind: "will_rename"; from: string; to: string }
  | { kind: "slot_occupied"; canonical: string };

export interface ClientImportRowState {
  selected: boolean;
  isPrimary: boolean;
  consent: "skip" | "rename" | "leave_as_is";
}

interface Props {
  path: string;
  fingerprint: ClientFingerprint;
  tier2: Tier2Verdict;
  preview: CanonicalizePreview;
  state: ClientImportRowState;
  onToggleSelected: () => void;
  onSetPrimary: () => void;
  onToggleConsent: () => void;
}

function basename(p: string): string {
  const idx = Math.max(p.lastIndexOf("\\"), p.lastIndexOf("/"));
  return idx >= 0 ? p.slice(idx + 1) : p;
}

function tier2Badge(verdict: Tier2Verdict) {
  if (verdict.kind === "stub") return null;
  if (verdict.kind === "verified") {
    return <span class="badge badge-sm badge-info">verified</span>;
  }
  return <span class="badge badge-sm badge-warning">unrecognized</span>;
}

function previewText(p: CanonicalizePreview, consent: "skip" | "rename" | "leave_as_is"): string {
  if (p.kind === "already_canonical") return "Already canonical";
  if (p.kind === "slot_occupied") {
    return `Will leave at non-canonical filename (${basename(p.canonical)} occupied)`;
  }
  // will_rename
  if (consent === "rename") return `Will rename ${basename(p.from)} -> ${basename(p.to)}`;
  return `Leaving at ${basename(p.from)} (rename declined)`;
}

export default function ClientImportRow(props: Props) {
  const filename = () => basename(props.path);
  return (
    <li class="flex flex-col gap-1 p-2 rounded border border-base-300">
      <div class="flex items-center gap-3 flex-wrap">
        <input
          type="checkbox"
          class="checkbox checkbox-sm"
          checked={props.state.selected}
          onChange={props.onToggleSelected}
        />
        <input
          type="radio"
          name="primary-row"
          class="radio radio-sm"
          checked={props.state.isPrimary}
          disabled={!props.state.selected}
          onChange={props.onSetPrimary}
          title="Set as primary version (will be active after import)"
        />
        <span class="text-sm text-base-content/70">{familyLabel(props.fingerprint.kind)}</span>
        <span class="font-mono text-sm">{props.fingerprint.version ?? "??"}</span>
        <Show when={props.fingerprint.variant}>
          {(v) => <span class="badge badge-sm badge-ghost">{v()}</span>}
        </Show>
        {tier2Badge(props.tier2)}
        <Show when={props.tier2.kind === "stub"}>
          <span
            class="badge badge-sm badge-ghost"
            title="No live release catalog in this phase"
          >
            stub
          </span>
        </Show>
        <span class="ml-auto text-xs font-mono text-base-content/60 truncate" title={props.path}>
          {filename()}
        </span>
      </div>
      <div class="flex items-center gap-2 ml-9 text-xs text-base-content/60">
        <Show
          when={props.preview.kind === "will_rename"}
          fallback={<span>{previewText(props.preview, props.state.consent)}</span>}
        >
          <span class="flex-1">{previewText(props.preview, props.state.consent)}</span>
          <button
            class="btn btn-xs btn-ghost"
            onClick={props.onToggleConsent}
            title="Toggle whether to rename to canonical filename on import"
          >
            {props.state.consent === "rename" ? "Don't rename" : "Rename"}
          </button>
        </Show>
      </div>
    </li>
  );
}
