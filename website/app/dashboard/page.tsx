"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Map as MapIcon, Grid, ArrowUpRight, Loader2, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserSync } from "@/hooks/useUserSync";
import { useRouter } from "next/navigation";
import WalletManager from "@/components/dashboard/WalletManager";
import api from "@/lib/api-client";

export default function DashboardPage() {
  const { user, loading: authLoading, isSignedIn } = useUserSync();
  const router = useRouter();
  const [lands, setLands] = useState<any[]>([]);
  const [nfts, setNfts] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Redirect to home if not signed in
  useEffect(() => {
    if (!authLoading && !isSignedIn) {
      router.push('/');
    }
  }, [authLoading, isSignedIn, router]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!isSignedIn) return;
      try {
        const [landsRes, nftsRes] = await Promise.all([
          api.get('/api/lands'),
          api.get('/api/nfts')
        ]);
        
        if (landsRes.data.success) setLands(landsRes.data.lands);
        if (nftsRes.data.success) setNfts(nftsRes.data.nfts);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setDataLoading(false);
      }
    };

    if (isSignedIn) {
      fetchData();
    }
  }, [isSignedIn]);

  // Show loading state
  if (authLoading || (isSignedIn && dataLoading)) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Don't render if not signed in (will redirect)
  if (!isSignedIn || !user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user.displayName}! 👋</h1>
          <p className="text-muted-foreground">Manage your registered lands and digital assets.</p>
        </div>
        <Link href="/lands/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Register New Land
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Wallet Manager Section */}
        <div className="lg:col-span-1">
          <WalletManager />
        </div>

        {/* Stats */}
        <div className="lg:col-span-2">
           <Card className="h-full bg-gradient-to-br from-primary/10 to-secondary/10 border-none">
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-background/50 backdrop-blur-sm">
                <p className="text-sm text-muted-foreground">Total Lands</p>
                <p className="text-2xl font-bold">{lands.length}</p>
              </div>
              <div className="p-4 rounded-lg bg-background/50 backdrop-blur-sm">
                <p className="text-sm text-muted-foreground">Total NFTs</p>
                <p className="text-2xl font-bold">{nfts.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="lands" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="lands">My Lands</TabsTrigger>
          <TabsTrigger value="nfts">My NFTs</TabsTrigger>
        </TabsList>

        <TabsContent value="lands" className="space-y-4">
          {lands.length === 0 ? (
            <EmptyState 
              icon={FileText}
              title="No Lands Registered"
              description="You haven't registered any lands yet. Start by registering your first property."
              actionLink="/lands/new"
              actionText="Register Land"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lands.map((land) => (
                <LandCard key={land._id} land={land} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="nfts" className="space-y-4">
          {nfts.length === 0 ? (
            <EmptyState 
              icon={ImageIcon}
              title="No NFTs Found"
              description="You don't have any Land NFTs in your connected wallets yet."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {nfts.map((nft) => (
                <NFTCard key={nft._id} nft={nft} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, actionLink, actionText }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg bg-secondary/10">
      <div className="p-4 bg-background rounded-full mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm mb-6">{description}</p>
      {actionLink && (
        <Link href={actionLink}>
          <Button variant="outline">{actionText}</Button>
        </Link>
      )}
    </div>
  );
}

function LandCard({ land }: { land: any }) {
  const statusColors = {
    'pending': 'bg-yellow-500/10 text-yellow-500',
    'verified': 'bg-green-500/10 text-green-500',
    'rejected': 'bg-red-500/10 text-red-500',
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium truncate pr-2">
            {land.landTitle || `Land #${land.landId}`}
          </CardTitle>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[land.status as keyof typeof statusColors] || 'bg-gray-500/10 text-gray-500'}`}>
            {land.status}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mt-2">
            <div className="flex items-center text-sm text-muted-foreground gap-2">
              <MapIcon className="w-4 h-4" />
              {land.area} sq.m
            </div>
            <div className="text-sm text-muted-foreground line-clamp-2">
              {typeof land.address === 'object' 
                ? [
                    land.address?.plotNo,
                    land.address?.street1,
                    land.address?.city,
                    land.address?.state,
                    land.address?.pincode
                  ].filter(Boolean).join(', ')
                : land.address
              }
            </div>
            <Link href={`/lands/${land._id}`} className="block pt-2">
              <Button variant="outline" size="sm" className="w-full gap-2">
                View Details <ArrowUpRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function NFTCard({ nft }: { nft: any }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
      <Card className="hover:shadow-md transition-shadow overflow-hidden">
        <div className="aspect-video bg-secondary relative">
          {nft.metadata?.image ? (
            <img src={nft.metadata.image} alt={nft.metadata.name} className="object-cover w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ImageIcon className="w-8 h-8" />
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-1 truncate">{nft.metadata?.name || `Token #${nft.tokenId}`}</h3>
          <p className="text-sm text-muted-foreground mb-4">Token ID: #{nft.tokenId}</p>
          <Link href={`/nfts/${nft.tokenId}`}>
            <Button variant="secondary" size="sm" className="w-full">
              View Asset
            </Button>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
}
