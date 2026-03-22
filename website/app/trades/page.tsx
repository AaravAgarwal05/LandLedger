"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Handshake, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserSync } from "@/hooks/useUserSync";
import { useRouter } from "next/navigation";
import api from "@/lib/api-client";

export default function TradesPage() {
  const { user, loading: authLoading, isSignedIn } = useUserSync();
  const router = useRouter();
  const [trades, setTrades] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isSignedIn) {
      router.push('/');
    }
  }, [authLoading, isSignedIn, router]);

  useEffect(() => {
    const fetchTrades = async () => {
      if (!isSignedIn) return;
      try {
        const response = await api.get('/api/trades');
        if (response.data.success) {
          setTrades(response.data.trades || []);
        }
      } catch (error) {
        console.error("Failed to fetch trades:", error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchTrades();
  }, [isSignedIn]);

  if (authLoading || (isSignedIn && dataLoading)) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading your trades...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn || !user) {
    return null;
  }

  const buyingTrades = trades.filter((t) => t.buyerClerkId === user.id);
  const sellingTrades = trades.filter((t) => t.sellerClerkId === user.id);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Handshake className="w-8 h-8 text-primary" />
          My Trade Requests
        </h1>
        <p className="text-lg text-muted-foreground">
          Manage your ongoing and past land transactions.
        </p>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="all">All ({trades.length})</TabsTrigger>
          <TabsTrigger value="buying">Buying ({buyingTrades.length})</TabsTrigger>
          <TabsTrigger value="selling">Selling ({sellingTrades.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <TradeList trades={trades} userId={user.id} />
        </TabsContent>

        <TabsContent value="buying" className="space-y-4">
          <TradeList trades={buyingTrades} userId={user.id} />
        </TabsContent>

        <TabsContent value="selling" className="space-y-4">
          <TradeList trades={sellingTrades} userId={user.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TradeList({ trades, userId }: { trades: any[]; userId: string }) {
  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-lg bg-secondary/10">
        <div className="p-4 bg-background rounded-full mb-4">
          <Handshake className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No Trades Found</h3>
        <p className="text-muted-foreground max-w-md mb-6">
          You don't have any trade requests in this category. Head over to the Marketplace to buy or sell land.
        </p>
        <Link href="/marketplace">
          <Button variant="outline">Browse Marketplace</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {trades.map((trade) => (
        <TradeCard key={trade.tradeId} trade={trade} userId={userId} />
      ))}
    </div>
  );
}

function TradeCard({ trade, userId }: { trade: any; userId: string }) {
  const isBuyer = trade.buyerClerkId === userId;
  
  const statusColors: Record<string, string> = {
    'pending': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    'negotiating': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    'approved': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    'funded': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
    'executed': 'bg-green-500/10 text-green-600 border-green-500/20',
    'cancelled': 'bg-red-500/10 text-red-600 border-red-500/20',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="hover:shadow-lg transition-all border-border/50 h-full flex flex-col">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start mb-2">
            <div className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColors[trade.status] || 'bg-gray-500/10 text-gray-600'}`}>
              {trade.status.toUpperCase()}
            </div>
            <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${isBuyer ? 'bg-primary/10 text-primary' : 'bg-orange-500/10 text-orange-600'}`}>
              {isBuyer ? 'BUYING' : 'SELLING'}
            </div>
          </div>
          <CardTitle className="text-lg truncate" title={trade.tradeId}>
            {trade.tradeId}
          </CardTitle>
          <CardDescription>
            {new Date(trade.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-2 bg-secondary/30 p-3 rounded-md">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Price:</span>
              <span className="font-semibold">{trade.agreedPrice?.amount} {trade.agreedPrice?.currency}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Token ID:</span>
              <span className="font-mono text-xs mt-0.5">{trade.tokenId}</span>
            </div>
          </div>
          
          <Link href={`/trades/${trade.tradeId}`} className="mt-auto pt-2 block">
            <Button variant={trade.status === 'executed' ? 'outline' : 'default'} className="w-full gap-2">
              View Request <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
}
