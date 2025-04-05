import { MetaMaskConnection } from '@/components/MetaMaskConnection';
import { GameStaking } from '@/components/GameStaking';
import { MetaMaskProvider } from '@/hooks/useMetaMask';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-100 to-neutral-200 font-sans text-neutral-900 p-4">
      <MetaMaskProvider>
        <div className="max-w-6xl mx-auto">
          <header className="mb-8 text-center">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70 mb-2">
              pSAGA Chainlet Game
            </h1>
            <p className="text-neutral-600">
              Connect your wallet, stake your tokens, and enter the game!
            </p>
          </header>
          
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <MetaMaskConnection />
            <GameStaking />
          </div>
          
          <footer className="mt-12 text-center text-neutral-500 text-sm">
            <p>© 2025 pSAGA Chainlet Game | All rights reserved</p>
          </footer>
        </div>
      </MetaMaskProvider>
    </div>
  );
}
