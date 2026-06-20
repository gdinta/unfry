// Injected into the active tab; mounts the overlay when a break event fires.
import React from "react";
import { createRoot } from "react-dom/client";
import { OverlayApp } from "./OverlayApp";

const MOUNT_ID = "unfry-overlay-root";

function mount(detail: any) {
  if (document.getElementById(MOUNT_ID)) return;
  const host = document.createElement("div");
  host.id = MOUNT_ID;
  document.body.appendChild(host);
  const root = createRoot(host);
  const unmount = () => { root.unmount(); host.remove(); };
  root.render(<OverlayApp detail={detail} onClose={unmount} />);
}

window.addEventListener("UNFRY_BREAK", (e: any) => mount(e.detail));
