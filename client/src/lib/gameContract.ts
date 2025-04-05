import { ethers } from 'ethers';

// Contract ABI (Application Binary Interface)
export const GAME_CONTRACT_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "distributeRewards",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "players",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_winner",
        "type": "address"
      }
    ],
    "name": "setWinner",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "stake",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "stakes",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalStaked",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "unstake",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "winner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Contract address
export const GAME_CONTRACT_ADDRESS = '0xDe69BC0b9e42a25a629bc13314da8Dcf87453Cd5';

// Helper function to initialize the contract
export const getGameContract = (provider: ethers.BrowserProvider) => {
  const signer = provider.getSigner();
  return signer.then(signerObj => {
    return new ethers.Contract(GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI, signerObj);
  });
};

// Interface for game state
export interface GameState {
  userStake: string;
  totalStaked: string;
  currentWinner: string | null;
  isStaking: boolean;
  error: string | null;
  isStartingNewSession?: boolean;
}

// Format ethers to a human-readable format
export const formatEthers = (amount: string, decimals: number = 6): string => {
  const value = ethers.formatUnits(amount, decimals);
  const num = parseFloat(value);
  
  if (num < 0.000001 && num > 0) {
    return num.toExponential(4);
  }
  
  // Format with 6 decimal places max and trim trailing zeros
  return parseFloat(num.toFixed(6)).toString();
};