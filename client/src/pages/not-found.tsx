import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center cyber-grid">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-black to-background/90 opacity-80" />
      
      <Card className="cyberpunk-card w-full max-w-md mx-4 backdrop-blur-sm">
        <div className="bg-gradient-to-r from-red-500/30 to-red-700/20 p-4 border-b border-primary/30">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <h1 className="text-2xl font-bold text-red-300 glitch-text" data-text="ERROR 404">ERROR 404</h1>
          </div>
        </div>
        
        <CardContent className="pt-6 bg-black/60">
          <div className="border border-red-500/30 bg-red-900/10 p-4 rounded-md mb-6">
            <h2 className="text-xl font-bold text-primary mb-2 neon-text">NEURAL NETWORK DISRUPTION</h2>
            <p className="text-red-300/80 text-sm">
              Target destination not found in the cyberspace grid. Connection terminated.
            </p>
          </div>
          
          <p className="mb-6 text-primary/70 text-sm">
            The digital coordinates you're attempting to access don't exist in this subnet.
          </p>
          
          <Link href="/">
            <Button className="w-full bg-gradient-to-r from-primary to-purple-600 text-black neon-glow font-bold">
              RETURN TO MAINFRAME
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
