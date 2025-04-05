import { useState, useEffect } from 'react';
import { useMetaMask } from '@/hooks/useMetaMask';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PSAGA_CHAINLET_CONFIG } from '@/lib/chainConfig';
import { 
  AlertCircle, 
  Check, 
  Copy, 
  ExternalLink, 
  Loader2, 
  RefreshCw, 
  Wallet 
} from 'lucide-react';

export function MetaMaskConnection() {
  const { 
    isConnected, 
    isConnecting, 
    account, 
    error,
    tokenBalances,
    isLoadingBalances,
    refreshBalances,
    connectWallet, 
    copyToClipboard 
  } = useMetaMask();
  
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleCopyAddress = async () => {
    if (account) {
      const success = await copyToClipboard(account);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleRefreshBalances = async () => {
    setRefreshing(true);
    await refreshBalances();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const shortenAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Format token balance for display
  const formatBalance = (balance: string) => {
    // If the balance is less than 0.0001, display scientific notation
    const num = parseFloat(balance);
    if (num < 0.0001 && num > 0) {
      return num.toExponential(4);
    }
    
    // Format with 6 decimal places max and trim trailing zeros
    return parseFloat(num.toFixed(6)).toString();
  };

  return (
    <div className="max-w-md w-full cyberpunk-card backdrop-blur-sm overflow-hidden">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary/40 to-purple-700/40 p-6 border-b border-primary/30">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold neon-text">pSAGA <span className="gradient-text font-bold">CHAINLET</span></h1>
          <div className="flex items-center text-sm bg-black/30 px-3 py-1 rounded-full">
            <span className={`h-2.5 w-2.5 rounded-full mr-2 ${
              isConnected ? 'bg-primary animate-pulse' : error ? 'bg-red-500' : 'bg-neutral-500'
            }`}></span>
            <span className="text-primary/90">{isConnected ? 'CONNECTED' : error ? 'ERROR' : 'DISCONNECTED'}</span>
          </div>
        </div>
        <p className="mt-2 text-sm text-primary/80">Interface with the meta-blockchain network</p>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Connection Button */}
        <div className="mb-6 flex flex-col items-center">
          <Button
            variant={isConnected ? "outline" : "default"}
            className={`w-full py-6 ${
              isConnected 
                ? 'border-primary text-primary hover:bg-primary/10 neon-border' 
                : 'bg-gradient-to-r from-primary to-purple-600 text-black font-bold neon-glow'
            }`}
            onClick={connectWallet}
            disabled={isConnecting || isConnected}
          >
            {isConnecting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="mr-2 h-4 w-4" />
            )}
            {isConnecting ? 'CONNECTING...' : isConnected ? 'CONNECTED' : 'CONNECT METAMASK'}
          </Button>
          
          {isConnecting && (
            <div className="mt-4 flex flex-col items-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-primary/70 mt-2">Establishing secure connection...</p>
            </div>
          )}
        </div>

        {/* Connected Account Info */}
        {isConnected && account && (
          <div className="border border-primary/30 rounded-lg p-4 mb-6 bg-black/60 neon-border">
            <h2 className="text-sm font-medium text-primary/90 mb-2">CONNECTED ACCOUNT</h2>
            <div className="flex items-center justify-between">
              <div className="text-xs bg-black/80 px-3 py-2 rounded border border-primary/20 truncate flex-1 font-mono text-primary/80">
                {account}
              </div>
              <Button
                variant="outline" 
                size="icon"
                className="ml-2 border-primary/50 text-primary hover:bg-primary/10"
                onClick={handleCopyAddress}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        {/* Token Balances */}
        {isConnected && (
          <div className="border border-primary/30 rounded-lg p-4 mb-6 bg-black/60 neon-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-primary/90">TOKEN BALANCES</h2>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 border-primary/50 text-primary hover:bg-primary/10"
                onClick={handleRefreshBalances}
                disabled={isLoadingBalances || refreshing}
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${(isLoadingBalances || refreshing) ? 'animate-spin' : ''}`} />
                <span className="text-xs">REFRESH</span>
              </Button>
            </div>
            
            {isLoadingBalances ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : tokenBalances.length > 0 ? (
              <div className="space-y-2">
                {tokenBalances.map((token, index) => (
                  <div key={index} className="bg-black/80 p-3 rounded-lg border border-primary/20">
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-medium text-primary">{token.symbol}</div>
                      <div className="text-sm font-bold text-white">{formatBalance(token.formatted)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-primary/60">
                No token balances detected
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
            <div className="flex">
              <AlertCircle className="text-red-400 mr-2 h-5 w-5" />
              <div>
                <h3 className="text-sm font-medium text-red-400">CONNECTION ERROR</h3>
                <p className="text-xs text-red-300/80 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Chain Information */}
        <Card className="cyberpunk-card border-primary/30">
          <CardHeader className="py-3 px-4 bg-black/40 border-b border-primary/30">
            <h2 className="text-sm font-medium text-primary/90">CHAIN INFORMATION</h2>
          </CardHeader>
          <CardContent className="p-4 bg-black/60">
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between">
                <span className="text-primary/70">Chain ID:</span>
                <span className="font-medium text-white">{PSAGA_CHAINLET_CONFIG.chainId}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-primary/70">Chain Name:</span>
                <span className="font-medium text-white">{PSAGA_CHAINLET_CONFIG.chainName}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-primary/70">Native Token:</span>
                <span className="font-medium text-white">
                  {PSAGA_CHAINLET_CONFIG.stakeCurrency.coinDenom} 
                  <span className="text-primary/80">({PSAGA_CHAINLET_CONFIG.stakeCurrency.coinMinimalDenom})</span>
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-primary/70">Decimals:</span>
                <span className="font-medium text-white">{PSAGA_CHAINLET_CONFIG.stakeCurrency.coinDecimals}</span>
              </li>
            </ul>
            
            <Separator className="my-4 bg-primary/20" />
            
            {/* Explorer Link */}
            <div className="text-center">
              <a 
                href={PSAGA_CHAINLET_CONFIG.explorerUrl}
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs inline-flex items-center text-primary hover:text-primary-light transition-colors neon-text"
              >
                <span>VIEW IN BLOCKCHAIN EXPLORER</span>
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
