import type { ProfileData } from "../store";
import { getPrimarySetup } from "../store";
import UpdatesPanel from "./UpdatesPanel";

interface FeedTabProps {
  profile: ProfileData | null;
  onAfterUpdate?: () => void;
}

export default function FeedTab(props: FeedTabProps) {
  const exePath = () => {
    const p = props.profile;
    if (!p) return null;
    return getPrimarySetup(p).client.exe_path ?? null;
  };
  const currentVersion = () => {
    const p = props.profile;
    if (!p) return null;
    return getPrimarySetup(p).client.version ?? null;
  };

  return (
    <UpdatesPanel
      exePath={exePath()}
      currentVersion={currentVersion()}
      onAfterUpdate={props.onAfterUpdate}
    />
  );
}
