import { useState } from 'react';
import { useMetaMask } from '@/hooks/useMetaMask';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PSAGA_CHAINLET_CONFIG } from '@/lib/chainConfig';
import { AlertCircle, Check, Copy, ExternalLink, Loader2, Wallet } from 'lucide-react';

export function MetaMaskConnection() {
  const { 
    isConnected, 
    isConnecting, 
    account, 
    error, 
    connectWallet, 
    copyToClipboard 
  } = useMetaMask();
  
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = async () => {
    if (account) {
      const success = await copyToClipboard(account);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const shortenAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary to-secondary p-6 text-white">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">pSAGA Chainlet</h1>
          <div className="flex items-center text-sm">
            <span className={`h-2.5 w-2.5 rounded-full mr-2 ${
              isConnected ? 'bg-green-500' : error ? 'bg-red-500' : 'bg-neutral-300'
            }`}></span>
            <span>{isConnected ? 'Connected' : error ? 'Error' : 'Disconnected'}</span>
          </div>
        </div>
        <p className="mt-2 text-sm opacity-90">Connect to the pSAGA blockchain network</p>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Connection Button */}
        <div className="mb-6 flex flex-col items-center">
          <Button
            variant={isConnected ? "success" : "default"}
            className={`w-full py-6 ${isConnected ? 'bg-green-600 hover:bg-green-700' : ''}`}
            onClick={connectWallet}
            disabled={isConnecting || isConnected}
          >
            {isConnecting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="mr-2 h-4 w-4" />
            )}
            {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Connect MetaMask'}
          </Button>
          
          {isConnecting && (
            <div className="mt-4 flex flex-col items-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-neutral-600 mt-2">Connecting...</p>
            </div>
          )}
        </div>

        {/* Connected Account Info */}
        {isConnected && account && (
          <div className="border border-neutral-200 rounded-lg p-4 mb-6 bg-neutral-100">
            <h2 className="text-sm font-medium text-neutral-700 mb-2">Connected Account</h2>
            <div className="flex items-center justify-between">
              <div className="text-xs bg-white px-3 py-2 rounded border border-neutral-300 truncate flex-1 font-mono">
                {account}
              </div>
              <Button
                variant="ghost" 
                size="icon"
                className="ml-2"
                onClick={handleCopyAddress}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg">
            <div className="flex">
              <AlertCircle className="text-red-500 mr-2 h-5 w-5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Connection Error</h3>
                <p className="text-xs text-neutral-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Chain Information */}
        <Card>
          <CardHeader className="py-3 px-4 bg-neutral-50">
            <h2 className="text-sm font-medium text-neutral-800">Chain Information</h2>
          </CardHeader>
          <CardContent className="p-4">
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between">
                <span className="text-neutral-600">Chain ID:</span>
                <span className="font-medium">{PSAGA_CHAINLET_CONFIG.chainId}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-neutral-600">Chain Name:</span>
                <span className="font-medium">{PSAGA_CHAINLET_CONFIG.chainName}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-neutral-600">Native Token:</span>
                <span className="font-medium">
                  {PSAGA_CHAINLET_CONFIG.stakeCurrency.coinDenom} 
                  ({PSAGA_CHAINLET_CONFIG.stakeCurrency.coinMinimalDenom})
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-neutral-600">Decimals:</span>
                <span className="font-medium">{PSAGA_CHAINLET_CONFIG.stakeCurrency.coinDecimals}</span>
              </li>
            </ul>
            
            <Separator className="my-4" />
            
            {/* Explorer Link */}
            <div className="text-center">
              <a 
                href={PSAGA_CHAINLET_CONFIG.explorerUrl}
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs inline-flex items-center text-primary hover:text-primary-dark transition-colors"
              >
                <span>View in Explorer</span>
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
