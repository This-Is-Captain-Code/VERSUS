import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { ethers } from 'ethers';
import { PSAGA_CHAINLET_CONFIG, getFormattedChainId } from '@/lib/chainConfig';

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface TokenBalance {
  symbol: string;
  balance: string;
  formatted: string;
  decimals: number;
}

interface MetaMaskContextProps {
  isConnected: boolean;
  isConnecting: boolean;
  account: string | null;
  chainId: string | null;
  error: string | null;
  tokenBalances: TokenBalance[];
  isLoadingBalances: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  refreshBalances: () => Promise<void>;
  copyToClipboard: (text: string) => Promise<boolean>;
}

const MetaMaskContext = createContext<MetaMaskContextProps>({
  isConnected: false,
  isConnecting: false,
  account: null,
  chainId: null,
  error: null,
  tokenBalances: [],
  isLoadingBalances: false,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  refreshBalances: async () => {},
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
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

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
            
            // Fetch balances if connected
            await fetchNativeBalance(accounts[0].address, ethersProvider);
          }
        } catch (err) {
          console.error("Failed to initialize provider:", err);
        }
      }
    };
    
    initProvider();
  }, []);

  // Fetch native token balance
  const fetchNativeBalance = async (address: string, ethProvider: ethers.BrowserProvider) => {
    if (!address) return;
    
    setIsLoadingBalances(true);
    
    try {
      // Fetch native token balance (VERSUS)
      const balance = await ethProvider.getBalance(address);
      
      // Format the balance with the correct number of decimals from the chain config
      const decimals = PSAGA_CHAINLET_CONFIG.stakeCurrency.coinDecimals;
      const formatted = ethers.formatUnits(balance, decimals);
      
      setTokenBalances([
        {
          symbol: PSAGA_CHAINLET_CONFIG.stakeCurrency.coinDenom,
          balance: balance.toString(),
          formatted: formatted,
          decimals: decimals
        }
      ]);
      
      console.log("Fetched balance:", formatted, PSAGA_CHAINLET_CONFIG.stakeCurrency.coinDenom);
    } catch (err) {
      console.error("Failed to fetch balances:", err);
      setError("Failed to fetch token balances");
    } finally {
      setIsLoadingBalances(false);
    }
  };

  // Refresh token balances
  const refreshBalances = useCallback(async () => {
    if (!account || !provider) {
      console.log("Cannot refresh balances: no account or provider");
      return;
    }
    
    await fetchNativeBalance(account, provider);
  }, [account, provider]);

  // Setup listeners for account and chain changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected
          setIsConnected(false);
          setAccount(null);
          setTokenBalances([]);
        } else {
          setAccount(accounts[0]);
          setIsConnected(true);
          
          // Refresh balances when account changes
          if (provider) {
            await fetchNativeBalance(accounts[0], provider);
          }
        }
      };

      const handleChainChanged = (chainIdHex: string) => {
        setChainId(chainIdHex);
        // Refresh the page to ensure we get the right chain context
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
  }, [provider]);

  // Add VERSUS chainlet to MetaMask
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
      setError(err.message || 'Failed to add VERSUS Chainlet to MetaMask');
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
      
      // Try to switch to VERSUS chain
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
            throw new Error('Failed to add VERSUS Chainlet to MetaMask');
          }
        } else {
          throw switchError;
        }
      }
      
      setIsConnected(true);
      
      // Set up provider and fetch balances
      const ethersProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(ethersProvider);
      await fetchNativeBalance(accounts[0], ethersProvider);
      
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
    setTokenBalances([]);
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
    tokenBalances,
    isLoadingBalances,
    connectWallet,
    disconnectWallet,
    refreshBalances,
    copyToClipboard
  };

  return (
    <MetaMaskContext.Provider value={contextValue}>
      {children}
    </MetaMaskContext.Provider>
  );
};
