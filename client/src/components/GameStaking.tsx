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
import { CoinsIcon, GamepadIcon, Loader2 } from 'lucide-react';

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

      // Get user stake
      const userStake = await contract.stakes(account);
      
      // Get total staked
      const totalStaked = await contract.totalStaked();
      
      // Get current winner
      const winner = await contract.winner();
      
      // Update game state
      setGameState(prev => ({
        ...prev,
        userStake: userStake.toString(),
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
    fetchContractData();
    
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
      
      toast({
        title: "Winner Set",
        description: "You have been set as the winner!",
      });
      
      // Refresh contract data
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
      
      // Set winner to zero address to reset the game
      const tx = await contract.setWinner(ethers.ZeroAddress);
      
      toast({
        title: "Resetting Game",
        description: "Resetting winner to start a new session...",
      });
      
      await tx.wait();
      
      // For this specific contract, we need to manually update our state
      // Since the contract doesn't have a way to reset stakes directly
      setGameState(prev => ({
        ...prev,
        userStake: '0',
        totalStaked: '0',
        currentWinner: null
      }));
      
      toast({
        title: "New Session Started",
        description: "Ready for new staking round!",
      });
      
      // Refresh contract data to confirm changes
      await fetchContractData();
      
      // Additional notification about the stakes
      toast({
        title: "Note on Stakes",
        description: "Your stake has been reset in the UI. You can add new stakes now.",
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
    <Card className="w-full max-w-md shadow-lg border-primary/20">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardTitle className="flex items-center gap-2 text-xl">
          <GamepadIcon className="h-5 w-5" />
          Game Staking Portal
        </CardTitle>
        <CardDescription>
          Stake your pSAGA tokens to enter the game
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Current Stakes Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-neutral-700">Current Stakes</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary/5 rounded-lg p-3">
              <div className="text-xs text-neutral-500 mb-1">Your Stake</div>
              <div className="flex items-center">
                <CoinsIcon className="h-3.5 w-3.5 text-primary mr-1.5" />
                <span className="font-bold">
                  {formatStake(gameState.userStake)} pSAGA
                </span>
              </div>
            </div>
            
            <div className="bg-primary/5 rounded-lg p-3">
              <div className="text-xs text-neutral-500 mb-1">Total Staked</div>
              <div className="flex items-center">
                <CoinsIcon className="h-3.5 w-3.5 text-primary mr-1.5" />
                <span className="font-bold">
                  {formatStake(gameState.totalStaked)} pSAGA
                </span>
              </div>
            </div>
          </div>
          
          {/* Current Winner Display */}
          {gameState.currentWinner && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2">
              <div className="text-xs text-yellow-700 mb-1">Current Winner</div>
              <div className="text-sm font-mono truncate">
                {gameState.currentWinner === account ? 'You are the Winner! 🏆' : gameState.currentWinner}
              </div>
            </div>
          )}
        </div>
        
        <Separator />
        
        {/* Set Winner Button */}
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
            onClick={handleSetWinner}
            disabled={!isConnected || isSettingWinner}
          >
            {isSettingWinner ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting Winner...
              </>
            ) : (
              'Set Me as Winner'
            )}
          </Button>
          <p className="text-xs text-neutral-500 text-center">
            (For testing only: Sets your address as the game winner)
          </p>
        </div>
        
        {/* Start New Session Button (appears when a winner exists) */}
        {gameState.currentWinner && (
          <div className="space-y-2 mt-4">
            <Button
              variant="outline"
              className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
              onClick={handleStartNewSession}
              disabled={!isConnected || isStartingNewSession}
            >
              {isStartingNewSession ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting New Session...
                </>
              ) : (
                'Start New Staking Session'
              )}
            </Button>
            <p className="text-xs text-neutral-500 text-center">
              Resets the game to start a new staking round
            </p>
          </div>
        )}
        
        <Separator />
        
        {/* Stake Form */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-neutral-700">Stake pSAGA Tokens</h3>
          
          <div className="grid gap-2">
            <Label htmlFor="stake-amount">Stake Amount</Label>
            <div className="relative">
              <Input
                id="stake-amount"
                type="text"
                value={stakeAmount}
                onChange={handleStakeAmountChange}
                placeholder="0.0"
                className="pr-12"
                disabled={!isConnected || gameState.isStaking}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="text-sm text-neutral-500">pSAGA</span>
              </div>
            </div>
          </div>
          
          <Button 
            className="w-full" 
            onClick={handleStake}
            disabled={!isConnected || gameState.isStaking || parseFloat(stakeAmount) <= 0}
          >
            {gameState.isStaking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Staking...
              </>
            ) : (
              'Stake Tokens'
            )}
          </Button>
        </div>
      </CardContent>
      
      <CardFooter className="bg-primary p-6 flex flex-col">
        <Button
          className="w-full bg-white text-primary hover:bg-white/90 hover:text-primary font-bold py-6 text-lg"
          onClick={handleEnterGame}
          disabled={!isConnected || ethers.getBigInt(gameState.userStake) <= ethers.getBigInt(0) || isEntering}
        >
          {isEntering ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Entering...
            </>
          ) : (
            'ENTER THE GAME'
          )}
        </Button>
        
        <p className="text-white/80 text-xs mt-2 text-center">
          {ethers.getBigInt(gameState.userStake) <= ethers.getBigInt(0) 
            ? 'Stake tokens to unlock game entry' 
            : 'Click to enter the game with your current stake'}
        </p>
      </CardFooter>
    </Card>
  );
}