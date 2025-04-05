import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { ethers } from 'ethers';
import { PSAGA_CHAINLET_CONFIG, getFormattedChainId } from '@/lib/chainConfig';

interface MetaMaskContextProps {
  isConnected: boolean;
  isConnecting: boolean;
  account: string | null;
  chainId: string | null;
  error: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  copyToClipboard: (text: string) => Promise<boolean>;
}

const MetaMaskContext = createContext<MetaMaskContextProps>({
  isConnected: false,
  isConnecting: false,
  account: null,
  chainId: null,
  error: null,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  copyToClipboard: async () => false,
});

export const useMetaMask = () => useContext(MetaMaskContext);

export const MetaMaskProvider = ({ children }: { children: ReactNode }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);

  // Initialize provider when window.ethereum is available
  useEffect(() => {
    const initProvider = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const ethersProvider = new ethers.BrowserProvider(window.ethereum);
          setProvider(ethersProvider);
          
          // Check if already connected
          const accounts = await ethersProvider.listAccounts();
          if (accounts.length > 0) {
            setAccount(accounts[0].address);
            setIsConnected(true);
            
            const network = await ethersProvider.getNetwork();
            setChainId(network.chainId.toString());
          }
        } catch (err) {
          console.error("Failed to initialize provider:", err);
        }
      }
    };
    
    initProvider();
  }, []);

  // Setup listeners for account and chain changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected
          setIsConnected(false);
          setAccount(null);
        } else {
          setAccount(accounts[0]);
          setIsConnected(true);
        }
      };

      const handleChainChanged = (chainIdHex: string) => {
        setChainId(chainIdHex);
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []);

  // Add pSAGA chainlet to MetaMask
  const addChainToMetaMask = useCallback(async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed');
      return false;
    }

    const formattedChainId = getFormattedChainId();
    if (!formattedChainId) {
      setError('Invalid chain configuration');
      return false;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: formattedChainId,
            chainName: PSAGA_CHAINLET_CONFIG.chainName,
            nativeCurrency: {
              name: PSAGA_CHAINLET_CONFIG.stakeCurrency.coinDenom,
              symbol: PSAGA_CHAINLET_CONFIG.stakeCurrency.coinDenom,
              decimals: PSAGA_CHAINLET_CONFIG.stakeCurrency.coinDecimals
            },
            rpcUrls: [PSAGA_CHAINLET_CONFIG.rpcEndpoint],
            blockExplorerUrls: [PSAGA_CHAINLET_CONFIG.explorerUrl]
          }
        ]
      });
      return true;
    } catch (err: any) {
      console.error('Error adding chain to MetaMask:', err);
      setError(err.message || 'Failed to add pSAGA Chainlet to MetaMask');
      return false;
    }
  }, []);

  // Connect to MetaMask
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed. Please install MetaMask to connect.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }
      
      setAccount(accounts[0]);
      
      // Try to switch to pSAGA chain
      const formattedChainId = getFormattedChainId();
      if (!formattedChainId) {
        throw new Error('Invalid chain configuration');
      }
      
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: formattedChainId }]
        });
      } catch (switchError: any) {
        // Chain doesn't exist - add it
        if (switchError.code === 4902) {
          const added = await addChainToMetaMask();
          if (!added) {
            throw new Error('Failed to add pSAGA Chainlet to MetaMask');
          }
        } else {
          throw switchError;
        }
      }
      
      setIsConnected(true);
      
    } catch (err: any) {
      console.error('Error connecting to MetaMask:', err);
      setError(err.message || 'Failed to connect to MetaMask');
    } finally {
      setIsConnecting(false);
    }
  }, [addChainToMetaMask]);

  // Disconnect wallet (for UI purposes only)
  const disconnectWallet = useCallback(() => {
    setIsConnected(false);
    setAccount(null);
    setChainId(null);
  }, []);

  // Copy to clipboard utility
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Failed to copy text:', err);
      return false;
    }
  }, []);

  const contextValue: MetaMaskContextProps = {
    isConnected,
    isConnecting,
    account,
    chainId,
    error,
    connectWallet,
    disconnectWallet,
    copyToClipboard
  };

  return (
    <MetaMaskContext.Provider value={contextValue}>
      {children}
    </MetaMaskContext.Provider>
  );
};
