"use client";

import { MidlProvider } from "@midl/react";
import { WagmiMidlProvider } from "@midl/executor-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { midlConfig } from "@/config/midl";
import { ToastProvider } from "@/components/Toast";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <MidlProvider config={midlConfig}>
      <QueryClientProvider client={queryClient}>
        <WagmiMidlProvider>
          <ToastProvider>{children}</ToastProvider>
        </WagmiMidlProvider>
      </QueryClientProvider>
    </MidlProvider>
  );
}
