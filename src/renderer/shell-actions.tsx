import { createContext, useCallback, useContext, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";

export interface ShellAction {
  readonly id: string;
  readonly label: string;
  readonly onClick: () => void;
  readonly disabled?: boolean;
  readonly primary?: boolean;
}

export interface ShellActions {
  readonly title: string;
  readonly actions: readonly ShellAction[];
  readonly moreActions?: readonly ShellAction[];
}

interface Registration {
  readonly id: string;
  readonly priority: number;
  readonly value: ShellActions;
}

const ShellActionContext = createContext<((registration: Registration) => () => void) | null>(null);

/** Each mounted work area has its own toolbar; only App's visible area is displayed. */
export function ShellActionsProvider({
  children,
  onChange,
}: {
  readonly children: ReactNode;
  readonly onChange: (actions: ShellActions | null) => void;
}) {
  const [registrations, setRegistrations] = useState<readonly Registration[]>([]);
  const register = useCallback((registration: Registration) => {
    setRegistrations((current) => [...current.filter((entry) => entry.id !== registration.id), registration]);
    return () => setRegistrations((current) => current.filter((entry) => entry.id !== registration.id));
  }, []);
  const selected = useMemo(
    () => registrations.reduce<Registration | null>(
      (current, entry) => !current || entry.priority >= current.priority ? entry : current,
      null,
    )?.value ?? null,
    [registrations],
  );
  useLayoutEffect(() => {
    onChange(selected);
    return () => onChange(null);
  }, [onChange, selected]);
  return <ShellActionContext.Provider value={register}>{children}</ShellActionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useShellActions(value: ShellActions, priority = 0): void {
  const register = useContext(ShellActionContext);
  const id = useId();
  const latest = useRef(value);
  useLayoutEffect(() => { latest.current = value; }, [value]);
  const signature = JSON.stringify({
    title: value.title,
    actions: value.actions.map(({ id: actionId, label, disabled, primary }) => ({ id: actionId, label, disabled, primary })),
    moreActions: value.moreActions?.map(({ id: actionId, label, disabled, primary }) => ({ id: actionId, label, disabled, primary })),
  });
  useLayoutEffect(() => {
    if (!register) return;
    const bind = (action: ShellAction, more: boolean): ShellAction => ({
      ...action,
      onClick: () => {
        const current = (more ? latest.current.moreActions : latest.current.actions)?.find((candidate) => candidate.id === action.id);
        if (current && !current.disabled) current.onClick();
      },
    });
    return register({
      id,
      priority,
      value: {
        title: latest.current.title,
        actions: latest.current.actions.map((action) => bind(action, false)),
        moreActions: latest.current.moreActions?.map((action) => bind(action, true)),
      },
    });
  }, [id, priority, register, signature]);
}
