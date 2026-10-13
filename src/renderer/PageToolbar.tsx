import { useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ToolbarHost, ToolbarVisible } from "./toolbar-context";

export function PageToolbar({ children }: { readonly children: ReactNode }) {
  const host = useContext(ToolbarHost);
  const visible = useContext(ToolbarVisible);
  return host && visible ? createPortal(<div className="page-toolbar-group">{children}</div>, host) : null;
}
