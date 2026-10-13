import { createContext } from "react";

export const ToolbarHost = createContext<HTMLElement | null>(null);
export const ToolbarVisible = createContext(true);
