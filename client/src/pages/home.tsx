import { MetaMaskConnection } from '@/components/MetaMaskConnection';
import { GameStaking } from '@/components/GameStaking';
import { MetaMaskProvider } from '@/hooks/useMetaMask';

export default function Home() {
  return (
    <div className="min-h-screen">
      <MetaMaskProvider>
        <div className="max-w-6xl mx-auto relative z-10">
          <header className="mb-12 text-center py-8">
            <div className="mb-2 relative">
              <h1 className="text-6xl font-black uppercase gradient-text tracking-tighter">
                pSAGA
              </h1>
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-40 h-12 bg-primary/10 blur-2xl rounded-full"></div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4 neon-text tracking-wide">
              CHAINLET GAMING PORTAL
            </h2>
            <p className="text-primary/80 max-w-lg mx-auto border-t border-b border-primary/20 py-3 text-sm">
              CONNECT YOUR METAMASK WALLET • STAKE YOUR TOKENS • ENTER THE GAME
            </p>
          </header>
          
          <div className="grid md:grid-cols-2 gap-8 items-start mb-12">
            <MetaMaskConnection />
            <GameStaking />
          </div>
          
          <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/4 w-1/2 h-24 bg-primary/10 blur-3xl rounded-full"></div>
            <div className="absolute bottom-1/4 right-1/4 w-1/3 h-32 bg-purple-600/10 blur-3xl rounded-full"></div>
          </div>
          
          <footer className="mt-16 text-center text-primary/40 text-sm border-t border-primary/10 pt-6 pb-12">
            <p>© 2025 PSAGA-CHAINLET-GAME.INTERFACE // ALL RIGHTS RESERVED</p>
          </footer>
        </div>
      </MetaMaskProvider>
    </div>
  );
}
