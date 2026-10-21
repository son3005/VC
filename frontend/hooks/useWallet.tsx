'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BrowserProvider } from 'ethers';
import { CHAIN_ID, CHAIN_ID_HEX, CHAIN_NAME, RPC_URL, EXPLORER_URL } from '@/lib/constants';

export interface WalletContextType {
  address: string | null;
  chainId: number | null;
  isConnecting: boolean;
  error: string | null;
  isCorrectNetwork: boolean;
  connect: () => Promise<void>;
  switchToSepolia: () => Promise<void>;
  disconnect: () => Promise<void>;
  checkConnection: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCorrectNetwork = chainId === CHAIN_ID;

  const updateNetwork = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) return;
    try {
      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      setChainId(Number(network.chainId));
    } catch {
      setChainId(null);
    }
  }, []);

  const checkConnection = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) return;
    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_accounts', []);
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0]);
        await updateNetwork();
      } else {
        setAddress(null);
      }
    } catch {
      setAddress(null);
    }
  }, [updateNetwork]);

  useEffect(() => {
    checkConnection();

    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: unknown) => {
        const accs = accounts as string[];
        if (accs && accs.length > 0) {
          setAddress(accs[0]);
        } else {
          setAddress(null);
        }
      };

      const handleChainChanged = (newChainId: unknown) => {
        if (typeof newChainId === 'string') {
          setChainId(parseInt(newChainId, 16));
        } else if (typeof newChainId === 'number') {
          setChainId(newChainId);
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum?.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [checkConnection]);

  const connect = async () => {
    setError(null);
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('Vui lòng cài đặt ví MetaMask.');
      throw new Error('NO_METAMASK');
    }

    setIsConnecting(true);
    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0]);
      }
      await updateNetwork();
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string };
      if (e?.code === 4001) {
        setError('Bạn đã từ chối kết nối ví.');
      } else {
        setError(e?.message || 'Không thể kết nối ví MetaMask.');
      }
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  const switchToSepolia = async () => {
    setError(null);
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('Vui lòng cài đặt ví MetaMask.');
      throw new Error('NO_METAMASK');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CHAIN_ID_HEX }],
      });
      await updateNetwork();
    } catch (switchError: unknown) {
      const err = switchError as { code?: number };
      if (err.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: CHAIN_ID_HEX,
                chainName: CHAIN_NAME,
                nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: [RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com'],
                blockExplorerUrls: [EXPLORER_URL || 'https://sepolia.etherscan.io'],
              },
            ],
          });
          await updateNetwork();
        } catch (addError) {
          setError('Không thể thêm mạng Sepolia vào MetaMask.');
          throw addError;
        }
      } else if (err.code === 4001) {
        setError('Bạn đã từ chối chuyển mạng.');
        throw switchError;
      } else {
        setError('Lỗi khi chuyển sang mạng Sepolia.');
        throw switchError;
      }
    }
  };

  const disconnect = async () => {
    // MetaMask supports wallet_revokePermissions; other wallets may reject it.
    try {
      if (typeof window !== 'undefined' && window.ethereum?.request) {
        await window.ethereum.request({
          method: 'wallet_revokePermissions',
          params: [{ eth_accounts: {} }],
        });
      }
    } catch {
      // Ignore unsupported wallets. Local state is still cleared below.
    } finally {
      setAddress(null);
      setChainId(null);
      setError(null);
    }
  };

  const value: WalletContextType = {
    address,
    chainId,
    isConnecting,
    error,
    isCorrectNetwork,
    connect,
    switchToSepolia,
    disconnect,
    checkConnection,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextType {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
