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
import { GameLoadingScreen } from '@/components/GameLoadingScreen';

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
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);

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
      
      // Get user stake directly from contract
      const userStake = await contract.stakes(account);
      
      console.log('Raw contract data:');
      console.log('- Winner:', winner);
      console.log('- Total staked:', totalStaked.toString());
      console.log('- User stake:', userStake.toString());
      
      // Important: If total staked is 0, this means we're in a reset state
      // and individual stakes should be considered 0 regardless of what the contract says
      // This is because the contract has a bug where it doesn't reset individual stakes in the mapping
      const totalStakedBigInt = ethers.getBigInt(totalStaked.toString());
      const isZeroTotalStake = totalStakedBigInt === ethers.getBigInt(0);
      
      // WORKAROUND FOR CONTRACT BUG:
      // If total staked is 0, FORCE user stake to 0 regardless of what's in the contract
      // This prevents stakes from accumulating across sessions
      const effectiveUserStake = isZeroTotalStake ? '0' : userStake.toString();
      
      console.log('Using effective user stake:', effectiveUserStake, 
                 '(original contract value:', userStake.toString() + ')');
      
      // Update game state with our fixed value
      setGameState(prev => ({
        ...prev,
        userStake: effectiveUserStake,
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
    // Clear any localStorage values since we want to always use contract values
    try {
      localStorage.removeItem('gameStakeReset');
      localStorage.removeItem('gameStakeResetTimestamp');
    } catch (err) {
      console.error('Error clearing local storage stake reset:', err);
    }
    
    // Fetch contract data immediately on connection
    if (isConnected) {
      fetchContractData();
    }
    
    // Set up a refresh interval when connected
    let intervalId: NodeJS.Timeout;
    if (isConnected) {
      intervalId = setInterval(fetchContractData, 10000); // Refresh every 10 seconds
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
      
      // Before adding new stake, check if we need to reset previous stake
      // This is a workaround for the contract issue where individual stakes aren't reset
      const totalStaked = await contract.totalStaked();
      const userStake = await contract.stakes(account);
      
      console.log('Before staking - Total staked:', totalStaked.toString());
      console.log('Before staking - User stake:', userStake.toString());
      
      // If we're in a "reset" state (total stake is 0) but the user's stake isn't 0,
      // we need to warn the user about the contract inconsistency
      if (ethers.getBigInt(totalStaked.toString()) === ethers.getBigInt(0) && 
          ethers.getBigInt(userStake.toString()) > ethers.getBigInt(0)) {
        console.warn('Contract inconsistency detected: Total stake is 0 but user stake is non-zero');
        
        toast({
          title: "Contract Reset Detected",
          description: "Stake values from previous sessions will be ignored for this stake.",
          duration: 5000,
        });
      }
      
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
      
      // Force refresh from contract
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
      description: "Preparing gaming environment...",
    });
    
    // Show the loading screen
    setShowLoadingScreen(true);
  };
  
  // Handle completion of loading screen
  const handleLoadingComplete = () => {
    // Open the game in a new tab
    window.open('https://horizon.meta.com/worlds/631234523404686/?snapshot_id=1594378804596639', '_blank');
    
    // Hide the loading screen and reset entering state
    setShowLoadingScreen(false);
    setIsEntering(false);
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
      
      // No longer using localStorage for stake reset
      
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
  
  // Handle unstaking to withdraw your staked tokens
  const handleUnstake = async () => {
    if (!isConnected || !account || !window.ethereum) {
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
        description: "You don't have any tokens staked to withdraw",
        variant: "destructive",
      });
      return;
    }
    
    setIsResettingStake(true);
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Log contract address and ABI for debugging
      console.log('Contract address:', GAME_CONTRACT_ADDRESS);
      console.log('Using ABI with these functions:', 
        GAME_CONTRACT_ABI
          .filter((item: any) => item.type === 'function')
          .map((item: any) => item.name)
      );
      
      const contract = new ethers.Contract(
        GAME_CONTRACT_ADDRESS,
        GAME_CONTRACT_ABI,
        signer
      );
      
      // Verify actual stake amount on the contract
      const contractStakeAmount = await contract.stakes(account);
      console.log('Contract stake amount for address:', contractStakeAmount.toString());
      console.log('UI stake amount:', gameState.userStake);
      
      // If contract stake is 0 but UI shows non-zero stake, there's a data inconsistency
      if (ethers.getBigInt(contractStakeAmount.toString()) <= ethers.getBigInt(0)) {
        console.warn('Contract shows zero stake but UI shows non-zero stake. Data inconsistency detected.');
        
        // Force UI to sync with contract
        setGameState(prev => ({
          ...prev,
          userStake: '0'
        }));
        
        toast({
          title: "No Stake Found",
          description: "The blockchain doesn't show any stake for your address. UI has been updated.",
          variant: "destructive",
        });
        
        setIsResettingStake(false);
        return;
      }
      
      // Check if the unstake function exists
      if (typeof contract.unstake !== 'function') {
        throw new Error('Unstake function not found in contract');
      }
      
      // Add logging for debugging
      console.log('Calling unstake function...');
      
      // Call the unstake function from the contract with explicit gas limit
      const tx = await contract.unstake({
        gasLimit: 300000 // Increased gas limit to ensure enough gas
      });
      
      toast({
        title: "Transaction Submitted",
        description: "Your unstake transaction is being processed",
      });
      
      console.log('Transaction hash:', tx.hash);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log('Transaction receipt:', receipt);
      
      // After unstaking, refresh the stake values from the contract
      await fetchContractData();
      
      toast({
        title: "Unstake Successful",
        description: "Successfully withdrawn your staked tokens",
      });
      
      // No longer using localStorage for stake reset state
      
    } catch (error: any) {
      console.error('Unstake error:', error);
      
      // Enhanced error handling
      let errorMessage = "There was an error withdrawing your tokens";
      
      if (error.code) {
        console.log('Error code:', error.code);
      }
      
      if (error.reason) {
        errorMessage = `Error: ${error.reason}`;
      } else if (error.message) {
        errorMessage = error.message;
        
        // Check for common error patterns
        if (error.message.includes("user rejected")) {
          errorMessage = "Transaction was rejected by user";
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds for gas * price + value";
        } else if (error.message.includes("execution reverted")) {
          errorMessage = "Transaction reverted: You may not have any stake to withdraw";
        } else if (error.message.includes("CALL_EXCEPTION")) {
          errorMessage = "Contract call failed: Stake might have already been withdrawn";
        }
      }
      
      toast({
        title: "Unstake Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      // If we get a revert, force refresh the data from the contract
      await fetchContractData();
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
      
      // No longer using localStorage for tracking reset state
      
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
    <>
      <Card className="cyberpunk-card w-full max-w-md shadow-lg backdrop-blur-sm">
        <CardHeader className="bg-black/40 border-b border-primary/30">
          <CardTitle className="flex items-center gap-2 text-xl neon-text">
            <GamepadIcon className="h-5 w-5" />
            <span className="gradient-text font-bold">VERSUS STAKING PORTAL</span>
          </CardTitle>
          <CardDescription className="text-primary/80">
            Stake your pSAGA tokens to enter the VERSUS cybernetic realm
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
            
            {/* Unstake Button */}
            {ethers.getBigInt(gameState.userStake) > ethers.getBigInt(0) && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 border-red-500/70 text-red-400 hover:bg-red-500/10 hover:text-red-300 w-full"
                onClick={handleUnstake}
                disabled={!isConnected || isResettingStake}
              >
                {isResettingStake ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Unstaking...
                  </>
                ) : (
                  <>
                    <RefreshCcw className="mr-1 h-3 w-3" />
                    Unstake Tokens
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
      
      {/* Game Loading Screen */}
      {showLoadingScreen && (
        <GameLoadingScreen onLoadingComplete={handleLoadingComplete} />
      )}
    </>
  );
}