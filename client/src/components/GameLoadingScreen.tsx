import React, { useEffect, useState } from 'react';

interface GameLoadingScreenProps {
  onLoadingComplete: () => void;
}

export function GameLoadingScreen({ onLoadingComplete }: GameLoadingScreenProps) {
  const [tip, setTip] = useState<string>('');
  const [loadingMessage, setLoadingMessage] = useState('Initializing connection to game world...');

  // List of gaming tips for the loading screen
  const tips = [
    "Stake more pSAGA tokens to increase your rank in the metaverse.",
    "Remember to explore all areas of the game world - there are hidden rewards.",
    "The total staked amount affects the game economy and rare item drop rates.",
    "Players who participate in staking consistently receive special bonuses.",
    "Being declared a winner in the staking pool grants exclusive access to legendary items.",
    "Your pSAGA balance is directly linked to your in-game powers and abilities.",
    "Need a boost? Reset your stakes and start fresh after each game session.",
    "Game progress is stored on the blockchain, ensuring your achievements remain secure."
  ];

  // Messages that appear during loading
  const loadingMessages = [
    'Initializing connection to game world...',
    'Building virtual environment...',
    'Loading player data from blockchain...',
    'Generating world assets...',
    'Connecting to pSAGA network...',
    'Synchronizing stake data...',
    'Preparing neural interface...',
    'Ready to enter the metaverse!'
  ];

  useEffect(() => {
    // Select a random tip
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    setTip(randomTip);

    // Cycle through loading messages
    let msgIndex = 0;
    const messageInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % loadingMessages.length;
      setLoadingMessage(loadingMessages[msgIndex]);
    }, 1000);

    // Complete loading after 3.5 seconds
    const timer = setTimeout(() => {
      clearInterval(messageInterval);
      onLoadingComplete();
    }, 3500);

    return () => {
      clearTimeout(timer);
      clearInterval(messageInterval);
    };
  }, [onLoadingComplete]);

  return (
    <div className="game-loading-overlay">
      <div className="game-loading-grid"></div>
      <div className="game-loading-container px-6">
        <h1 className="game-loading-title gradient-text">ENTERING VIRTUAL REALM</h1>
        
        <div className="blocks-loading">
          <div className="loading-block"></div>
          <div className="loading-block"></div>
          <div className="loading-block"></div>
          <div className="loading-block"></div>
          <div className="loading-block"></div>
        </div>
        
        <div className="game-loading-bar-container">
          <div className="game-loading-bar"></div>
        </div>
        
        <div className="game-loading-message">{loadingMessage}</div>
        
        <div className="game-loading-tip">
          <span className="text-yellow-400">TIP:</span> {tip}
        </div>
      </div>
    </div>
  );
}