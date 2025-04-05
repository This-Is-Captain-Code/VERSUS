import { MetaMaskConnection } from '@/components/MetaMaskConnection';
import { MetaMaskProvider } from '@/hooks/useMetaMask';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-100 to-neutral-200 font-sans text-neutral-900 flex items-center justify-center p-4">
      <MetaMaskProvider>
        <MetaMaskConnection />
      </MetaMaskProvider>
    </div>
  );
}
