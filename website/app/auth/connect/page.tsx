"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Wallet, ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { connectWallet, getConnectedAddress } from "@/lib/ethers";
import { toast } from "sonner";

export default function ConnectPage() {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const address = getConnectedAddress();
    if (address) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const address = await connectWallet();
      if (address) {
        toast.success("Wallet connected successfully!");
        router.push("/auth/onboard");
      } else {
        toast.error("Failed to connect wallet. Please try again.");
      }
    } catch (error) {
      toast.error("An error occurred while connecting.");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="border-2 shadow-2xl">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <Wallet className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-3xl">Connect Wallet</CardTitle>
            <CardDescription className="text-base">
              Connect your MetaMask wallet to access the LandLedger platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              size="lg" 
              className="w-full h-12 text-base gap-2" 
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? "Connecting..." : "Connect MetaMask"}
              {!isConnecting && <ArrowRight className="w-4 h-4" />}
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => router.push("/dashboard")}
            >
              Skip (Dev Mode)
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-4">
              <Shield className="w-3 h-3" />
              <span>We only store your public address</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
