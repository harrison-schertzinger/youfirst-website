"use client";

import { createContext, useContext } from "react";

/**
 * True on /admin/preview/portal, where the athlete and the money are invented.
 *
 * Every component that can start a checkout or write a row reads this and
 * refuses. It lives in its own module because the components that need it are
 * spread across the dashboard's main column AND its rail, and hanging it off
 * whichever card happened to own it first meant the rail silently defaulted to
 * live — which is exactly the bug that shipped once already.
 */
const PreviewContext = createContext(false);

export function useIsPreview() {
  return useContext(PreviewContext);
}

export function PreviewProvider({
  value,
  children,
}: {
  value: boolean;
  children: React.ReactNode;
}) {
  return (
    <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>
  );
}
