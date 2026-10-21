'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/hooks/useAuth';
import { WalletProvider } from '@/hooks/useWallet';
import { GlobalLoading } from '@/components/ui/GlobalLoading';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WalletProvider>
          {children}
          <GlobalLoading />
          <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#FFFDF7',
            color: '#010E1C',
            border: '1px solid #E3D5B8',
            fontFamily: 'var(--font-sans)',
            boxShadow: '0 4px 12px rgba(1, 14, 28, 0.08)',
          },
          success: {
            iconTheme: {
              primary: '#E6AB42',
              secondary: '#010E1C',
            },
          },
          error: {
            iconTheme: {
              primary: '#B23F4A',
              secondary: '#FFFDF7',
            },
          },
        }}
      />
        </WalletProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
