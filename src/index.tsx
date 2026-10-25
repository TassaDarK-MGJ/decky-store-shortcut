import {
  PanelSection,
  PanelSectionRow,
  quickAccessMenuClasses,
} from "@decky/ui";
import { definePlugin } from "@decky/api";
import { FaStore } from "react-icons/fa";

// H0 skeleton: loads in Decky and does nothing else.
// Feature A (context menu entry) is implemented in H1.

function Content() {
  return (
    <PanelSection title="Store Shortcut">
      <PanelSectionRow>
        <div>H0: skeleton build, no features yet.</div>
      </PanelSectionRow>
    </PanelSection>
  );
}

export default definePlugin(() => {
  console.log("[StoreShortcut] frontend loaded (H0 skeleton)");

  return {
    name: "Store Shortcut",
    titleView: <div className={quickAccessMenuClasses.Title}>Store Shortcut</div>,
    content: <Content />,
    icon: <FaStore />,
    onDismount() {
      console.log("[StoreShortcut] frontend unloaded");
    },
  };
});
