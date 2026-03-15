"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

type PageHeaderContextValue = {
  headerContent: React.ReactNode;
  setHeaderContent: (content: React.ReactNode) => void;
};

const PageHeaderContext = createContext<PageHeaderContextValue | null>(null);

export function PageHeaderProvider({ children }: { children: React.ReactNode }) {
  const [headerContent, setHeaderContent] = useState<React.ReactNode>(null);
  const value = React.useMemo(
    () => ({ headerContent, setHeaderContent }),
    [headerContent]
  );
  return (
    <PageHeaderContext.Provider value={value}>
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeader() {
  const ctx = useContext(PageHeaderContext);
  return ctx;
}

export function PageHeaderSlot() {
  const ctx = usePageHeader();
  if (!ctx) return null;
  return <>{ctx.headerContent}</>;
}
