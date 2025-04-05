import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useMetaMask } from '@/hooks/useMetaMask';
import { 
  GAME_CONTRACT_ABI, 
  GAME_CONTRACT_ADDRESS, 
  GameState, 
  formatEthers 
} from '@/lib/gameContract';
import { PSAGA_CHAINLET_CONFIG } from '@/lib/chainConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { CoinsIcon, GamepadIcon, Loader2, RefreshCcw } from 'lucide-react';

export function GameStaking() {
  const { isConnected, account } = useMetaMask();
  const { toast } = useToast();
  
  const [stakeAmount, setStakeAmount] = useState<string>('0');
  const [gameState, setGameState] = useState<GameState>({
    userStake: '0',
    totalStaked: '0',
    currentWinner: null,
    isStaking: false,
    error: null,
  });
  const [isEntering, setIsEntering] = useState(false);
  const [isSettingWinner, setIsSettingWinner] = useState(false);
  const [isStartingNewSession, setIsStartingNewSession] = useState(false);
  const [isResettingStake, setIsResettingStake] = useState(false);

  // Fetch contract data
  const fetchContractData = useCallback(async () => {
    if (!isConnected || !account || !window.ethereum) {
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(
        GAME_CONTRACT_ADDRESS,
        GAME_CONTRACT_ABI,
        provider
      );

      // Get current winner first
      const winner = await contract.winner();
      
      // Get total staked
      const totalStaked = await contract.totalStaked();
      
      // Get user stake
      const userStake = await contract.stakes(account);
      
      // Important: If there's a winner and total staked is 0, this means rewards were distributed
      // In this case, we should consider all stakes as 0 since they've been distributed
      // This is because the contract doesn't reset individual stakes in the mapping
      const totalStakedBigInt = ethers.getBigInt(totalStaked.toString());
      const effectiveUserStake = 
        (winner !== ethers.ZeroAddress && totalStakedBigInt === ethers.getBigInt(0)) 
          ? '0' 
          : userStake.toString();
      
      // If total staked is 0, all individual stakes should be considered reset
      // This ensures the UI is consistent with the contract's state after a winner is declared
      const isNewOrResetSession = totalStakedBigInt === ethers.getBigInt(0);
      
      // Update game state
      setGameState(prev => ({
        ...prev,
        userStake: isNewOrResetSession ? '0' : effectiveUserStake,
        totalStaked: totalStaked.toString(),
        currentWinner: winner === ethers.ZeroAddress ? null : winner,
      }));
    } catch (error) {
      console.error('Error fetching contract data:', error);
      setGameState(prev => ({
        ...prev,
        error: 'Failed to fetch game data',
      }));
    }
  }, [isConnected, account]);
  
  // Fetch data on component mount and when connection status changes
  useEffect(() => {
    // Check if there was a previous reset from localStorage
    try {
      const wasReset = localStorage.getItem('gameStakeReset') === 'true';
      const resetTimestamp = localStorage.getItem('gameStakeResetTimestamp');
      
      // If reset was done in the last hour, ensure user stake stays at 0
      if (wasReset && resetTimestamp) {
        const resetTime = parseInt(resetTimestamp);
        const hourAgo = Date.now() - (60 * 60 * 1000);
        
        if (resetTime > hourAgo) {
          // Force user stake to 0 on initial render
          setGameState(prev => ({
            ...prev,
            userStake: '0'
          }));
        }
      }
    } catch (err) {
      console.error('Error checking local storage for stake reset:', err);
    }
    
    // Fetch contract data with a slight delay to ensure our reset takes precedence
    setTimeout(() => {
      fetchContractData();
    }, 100);
    
    // Set up a refresh interval when connected
    let intervalId: NodeJS.Timeout;
    if (isConnected) {
      intervalId = setInterval(fetchContractData, 15000); // Refresh every 15 seconds
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchContractData, isConnected]);
  
  // Handle stake amount change
  const handleStakeAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and decimal points
    const value = e.target.value.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = value.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Limit to 6 decimal places (the decimals of pSAGA)
    if (parts.length === 2 && parts[1].length > 6) {
      return;
    }
    
    setStakeAmount(value);
  };
  
  // Handle staking
  const handleStake = async () => {
    if (!isConnected || !account || !window.ethereum) {
      toast({
        title: "Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }
    
    if (parseFloat(stakeAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid stake amount",
        variant: "destructive",
      });
      return;
    }
    
    setGameState(prev => ({ ...prev, isStaking: true, error: null }));
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        GAME_CONTRACT_ADDRESS,
        GAME_CONTRACT_ABI,
        signer
      );
      
      // Convert amount to wei (smallest unit)
      const amountInWei = ethers.parseUnits(
        stakeAmount, 
        PSAGA_CHAINLET_CONFIG.stakeCurrency.coinDecimals
      );
      
      // Send transaction
      const tx = await contract.stake({ value: amountInWei });
      
      // Wait for transaction to be mined
      toast({
        title: "Transaction Submitted",
        description: "Your stake transaction is being processed",
      });
      
      await tx.wait();
      
      // Success!
      toast({
        title: "Stake Successful",
        description: `Successfully staked ${stakeAmount} pSAGA`,
      });
      
      // Clear any previous reset state since we're staking again
      try {
        localStorage.removeItem('gameStakeReset');
        localStorage.removeItem('gameStakeResetTimestamp');
      } catch (error) {
        console.error('Error clearing stake reset state:', error);
      }
      
      // Refresh data
      await fetchContractData();
      
      // Reset form
      setStakeAmount('0');
    } catch (error: any) {
      console.error('Staking error:', error);
      toast({
        title: "Staking Failed",
        description: error.message || "There was an error processing your stake",
        variant: "destructive",
      });
      
      setGameState(prev => ({ 
        ...prev, 
        error: error.message || "Staking failed"
      }));
    } finally {
      setGameState(prev => ({ ...prev, isStaking: false }));
    }
  };
  
  // Handle entering the game
  const handleEnterGame = () => {
    if (!isConnected) {
      toast({
        title: "Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }
    
    if (ethers.getBigInt(gameState.userStake) <= ethers.getBigInt(0)) {
      toast({
        title: "No Stake",
        description: "You need to stake pSAGA tokens before entering the game",
        variant: "destructive",
      });
      return;
    }
    
    setIsEntering(true);
    
    // Show entering toast
    toast({
      title: "Entering Game World",
      description: "Redirecting to Horizon Meta...",
    });
    
    // Redirect to Horizon Meta after a brief delay
    setTimeout(() => {
      // Open in a new tab
      window.open('https://horizon.meta.com/worlds/631234523404686/?snapshot_id=1594378804596639', '_blank');
      setIsEntering(false);
    }, 1500);
  };
  
  // Handle setting the current user as the winner
  const handleSetWinner = async () => {
    if (!isConnected || !account || !window.ethereum) {
      toast({
        title: "Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }
    
    setIsSettingWinner(true);
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        GAME_CONTRACT_ADDRESS,
        GAME_CONTRACT_ABI,
        signer
      );
      
      // Call the setWinner function with the current account
      const tx = await contract.setWinner(account);
      
      toast({
        title: "Transaction Submitted",
        description: "Setting winner transaction is being processed",
      });
      
      await tx.wait();
      
      // After setting winner, the contract distributes all staked tokens to the winner
      // So we can immediately update our UI to reflect that
      setGameState(prev => ({
        ...prev,
        userStake: '0',  // Individual stakes should be shown as 0 since funds were distributed
        totalStaked: '0', // Total staked is reset in the contract
        currentWinner: account
      }));
      
      // Store reset state in localStorage to persist across refreshes
      try {
        localStorage.setItem('gameStakeReset', 'true');
        localStorage.setItem('gameStakeResetTimestamp', Date.now().toString());
      } catch (error) {
        console.error('Error storing reset state:', error);
      }
      
      toast({
        title: "Winner Set",
        description: "You have been set as the winner! All staked tokens have been distributed.",
      });
      
      // Refresh contract data to ensure everything is in sync
      await fetchContractData();
      
    } catch (error: any) {
      console.error('Set winner error:', error);
      toast({
        title: "Set Winner Failed",
        description: error.message || "There was an error setting the winner",
        variant: "destructive",
      });
    } finally {
      setIsSettingWinner(false);
    }
  };
  
  // Handle resetting your stake (UI only)
  const handleResetStake = () => {
    if (!isConnected || !account) {
      toast({
        title: "Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }
    
    setIsResettingStake(true);
    
    try {
      // Since there's no contract function to reset the stake, we'll just update the UI
      setGameState(prev => ({
        ...prev,
        userStake: '0'
      }));
      
      // Store reset state in localStorage to persist across page refreshes
      try {
        localStorage.setItem('gameStakeReset', 'true');
        localStorage.setItem('gameStakeResetTimestamp', Date.now().toString());
      } catch (error) {
        console.error('Error storing reset state:', error);
      }
      
      toast({
        title: "Stake Reset",
        description: "Your stake has been reset in the UI. The blockchain value remains unchanged.",
        duration: 5000,
      });
    } catch (error: any) {
      console.error('Reset stake error:', error);
      toast({
        title: "Failed to Reset Stake",
        description: "There was an error resetting your stake in the UI.",
        variant: "destructive",
      });
    } finally {
      setIsResettingStake(false);
    }
  };
  
  // Handle starting a new staking session
  const handleStartNewSession = async () => {
    if (!isConnected || !account || !window.ethereum) {
      toast({
        title: "Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }
    
    setIsStartingNewSession(true);
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        GAME_CONTRACT_ADDRESS,
        GAME_CONTRACT_ABI,
        signer
      );
      
      // For resetting the game, we set the winner to zero address
      // This will actually trigger distributeRewards() in the contract, but since 
      // the winner is the zero address, the tokens will be effectively burned
      const tx = await contract.setWinner(ethers.ZeroAddress);
      
      toast({
        title: "Resetting Game",
        description: "Resetting winner to start a new session...",
      });
      
      await tx.wait();
      
      // After setting zero address as winner, all funds have been distributed (burned)
      // The contract will have totalStaked = 0, but individual stakes remain in the mapping
      // We need to update our UI to reflect the new state properly
      setGameState(prev => ({
        ...prev,
        userStake: '0',  // We reset this in UI to match the contract behavior
        totalStaked: '0', // This is reset in the contract
        currentWinner: null  // No winner now
      }));
      
      toast({
        title: "New Session Started",
        description: "Ready for new staking round!",
      });
      
      // Store the reset state in local storage to remember that we've reset
      // This helps ensure the UI remains consistent across sessions
      try {
        localStorage.setItem('gameStakeReset', 'true');
        localStorage.setItem('gameStakeResetTimestamp', Date.now().toString());
      } catch (error) {
        console.error('Error storing reset state:', error);
      }
      
      // Refresh contract data to ensure everything is in sync, but force userStake to 0
      const refreshData = async () => {
        if (!isConnected || !account || !window.ethereum) return;
        
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const contract = new ethers.Contract(
            GAME_CONTRACT_ADDRESS,
            GAME_CONTRACT_ABI,
            provider
          );
          
          const totalStaked = await contract.totalStaked();
          const winner = await contract.winner();
          
          // Explicitly set userStake to 0 after new session
          setGameState(prev => ({
            ...prev,
            userStake: '0',  // Force to 0 to ensure UI consistency
            totalStaked: totalStaked.toString(),
            currentWinner: winner === ethers.ZeroAddress ? null : winner,
          }));
        } catch (error) {
          console.error('Error refreshing after session reset:', error);
        }
      };
      
      await refreshData();
      
      // Additional notification about the stakes
      toast({
        title: "Note on Stakes",
        description: "All stakes have been reset. You can add new stakes for the new session.",
        duration: 5000,
      });
      
    } catch (error: any) {
      console.error('Start new session error:', error);
      toast({
        title: "Failed to Start New Session",
        description: error.message || "There was an error starting a new session",
        variant: "destructive",
      });
    } finally {
      setIsStartingNewSession(false);
    }
  };
  
  // Format stake amount for display
  const formatStake = (amount: string) => {
    return formatEthers(amount, PSAGA_CHAINLET_CONFIG.stakeCurrency.coinDecimals);
  };
  
  return (
    <Card className="cyberpunk-card w-full max-w-md shadow-lg backdrop-blur-sm">
      <CardHeader className="bg-black/40 border-b border-primary/30">
        <CardTitle className="flex items-center gap-2 text-xl neon-text">
          <GamepadIcon className="h-5 w-5" />
          <span className="gradient-text font-bold">GAME STAKING PORTAL</span>
        </CardTitle>
        <CardDescription className="text-primary/80">
          Stake your pSAGA tokens to enter the cybernetic realm
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Current Stakes Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-primary/90">CURRENT STAKES</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/60 rounded-lg p-3 neon-border">
              <div className="text-xs text-primary/70 mb-1">Your Stake</div>
              <div className="flex items-center">
                <CoinsIcon className="h-3.5 w-3.5 text-primary mr-1.5" />
                <span className="font-bold text-white">
                  {formatStake(gameState.userStake)} <span className="text-primary">pSAGA</span>
                </span>
              </div>
            </div>
            
            <div className="bg-black/60 rounded-lg p-3 neon-border">
              <div className="text-xs text-primary/70 mb-1">Total Staked</div>
              <div className="flex items-center">
                <CoinsIcon className="h-3.5 w-3.5 text-primary mr-1.5" />
                <span className="font-bold text-white">
                  {formatStake(gameState.totalStaked)} <span className="text-primary">pSAGA</span>
                </span>
              </div>
            </div>
          </div>
          
          {/* Reset Your Stake Button */}
          {ethers.getBigInt(gameState.userStake) > ethers.getBigInt(0) && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 border-red-500/70 text-red-400 hover:bg-red-500/10 hover:text-red-300 w-full"
              onClick={handleResetStake}
              disabled={!isConnected || isResettingStake}
            >
              {isResettingStake ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Resetting Stake...
                </>
              ) : (
                <>
                  <RefreshCcw className="mr-1 h-3 w-3" />
                  Reset Your Stake
                </>
              )}
            </Button>
          )}
          
          {/* Current Winner Display */}
          {gameState.currentWinner && (
            <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-3 mt-2">
              <div className="text-xs text-yellow-400 mb-1">Current Winner</div>
              <div className="text-sm font-mono truncate text-yellow-300">
                {gameState.currentWinner === account ? 'You are the Winner! 🏆' : gameState.currentWinner}
              </div>
            </div>
          )}
        </div>
        
        <Separator className="bg-primary/20" />
        
        {/* Set Winner Button */}
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full border-amber-500/70 bg-amber-900/30 text-amber-300 hover:bg-amber-800/40 hover:text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.4)] font-bold tracking-wide py-5"
            onClick={handleSetWinner}
            disabled={!isConnected || isSettingWinner}
          >
            {isSettingWinner ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting Winner...
              </>
            ) : (
              <span className="relative z-10 flex items-center justify-center">
                <span className="mr-2">🏆</span>
                SET ME AS WINNER
              </span>
            )}
          </Button>
          <p className="text-xs text-primary/70 text-center">
            (For testing only: Sets your address as the game winner)
          </p>
        </div>
        
        {/* Start New Session Button (appears when a winner exists) */}
        {gameState.currentWinner && (
          <div className="space-y-2 mt-4">
            <Button
              variant="outline"
              className="w-full border-emerald-500/70 bg-emerald-900/30 text-emerald-300 hover:bg-emerald-800/40 hover:text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.4)] font-bold tracking-wide py-5"
              onClick={handleStartNewSession}
              disabled={!isConnected || isStartingNewSession}
            >
              {isStartingNewSession ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting New Session...
                </>
              ) : (
                <span className="relative z-10 flex items-center justify-center">
                  <span className="mr-2">🔄</span>
                  START NEW STAKING SESSION
                </span>
              )}
            </Button>
            <p className="text-xs text-primary/70 text-center">
              Resets the game to start a new staking round
            </p>
          </div>
        )}
        
        <Separator className="bg-primary/20" />
        
        {/* Stake Form */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-primary/90">STAKE TOKENS</h3>
          
          <div className="grid gap-2">
            <Label htmlFor="stake-amount" className="text-primary/80">Stake Amount</Label>
            <div className="relative">
              <Input
                id="stake-amount"
                type="text"
                value={stakeAmount}
                onChange={handleStakeAmountChange}
                placeholder="0.0"
                className="pr-12 bg-black/50 border-primary/50 text-white focus:border-primary focus:ring-primary/30"
                disabled={!isConnected || gameState.isStaking}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="text-sm text-primary/80">pSAGA</span>
              </div>
            </div>
          </div>
          
          <Button 
            className="w-full bg-primary hover:bg-primary/90 neon-glow text-black font-bold tracking-wide py-5 text-base shadow-[0_0_15px_rgba(13,242,201,0.7)]" 
            onClick={handleStake}
            disabled={!isConnected || gameState.isStaking || parseFloat(stakeAmount) <= 0}
          >
            {gameState.isStaking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Staking...
              </>
            ) : (
              'STAKE TOKENS'
            )}
          </Button>
        </div>
      </CardContent>
      
      <CardFooter className="bg-gradient-to-r from-primary/20 to-purple-700/20 p-6 flex flex-col border-t border-primary/30">
        <Button
          className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-black font-bold py-6 text-lg uppercase tracking-wider shadow-[0_0_20px_rgba(13,242,201,0.8),0_0_30px_rgba(127,58,236,0.5)]"
          onClick={handleEnterGame}
          disabled={!isConnected || ethers.getBigInt(gameState.userStake) <= ethers.getBigInt(0) || isEntering}
        >
          {isEntering ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Entering...
            </>
          ) : (
            <span className="relative z-10 flex items-center justify-center">
              <span className="mr-2">🎮</span>
              ENTER THE GAME
            </span>
          )}
        </Button>
        
        <p className="text-primary/80 text-xs mt-2 text-center">
          {ethers.getBigInt(gameState.userStake) <= ethers.getBigInt(0) 
            ? 'Stake tokens to unlock game entry' 
            : 'Click to enter the virtual realm with your current stake'}
        </p>
      </CardFooter>
    </Card>
  );
}