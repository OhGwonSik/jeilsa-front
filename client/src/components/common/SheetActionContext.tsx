// components/common/SheetActionContext.tsx
import { createContext, useContext } from "react";
import type { ActionsDeps } from "@/pages/SheetActionBar.tsx";

export const ActionsCtx = createContext<Partial<ActionsDeps>>({});
export const useActionsDeps = () => useContext(ActionsCtx);
