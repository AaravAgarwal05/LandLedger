"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Filter, ShoppingCart, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import apiClient from "@/lib/api-client";
import { useEthPrice } from "@/hooks/useEthPrice";

interface MarketplaceListing {
  listingId: string;
  tokenId: string;
  price: number;
  currency: string;
  name: string;
  description: string;
  image: string;
  sellerWallet: string;
  landId: string | null;
}

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const { ethRate, convertEthToInr, formatInr } = useEthPrice();

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const res = await apiClient.get('/api/market');
        if (res.data.success) {
          setListings(res.data.listings);
        }
      } catch (error) {
        console.error("Error fetching listings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, []);

  const filteredListings = listings.filter(listing => 
    listing.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    listing.tokenId.includes(searchQuery)
  );

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <ShoppingCart className="w-9 h-9 text-primary" />
            Marketplace
          </h1>
          <p className="text-muted-foreground">Buy and sell verified land NFT assets safely.</p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search assets for sale..." 
              className="pl-9" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" /> Filters
          </Button>
          <Link href="/marketplace/list">
            <Button className="gap-2">
              <Tag className="w-4 h-4" />
              List Item
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredListings.map((listing, index) => (
            <motion.div
              key={listing.listingId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link href={`/nfts/${listing.tokenId}`}>
                <Card className="overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group h-full flex flex-col border border-border shadow-md">
                  <div className="aspect-[4/3] relative overflow-hidden rounded-t-xl">
                    <img 
                      src={listing.image || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa'} 
                      alt={listing.name}
                      className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                      <Tag className="w-3 h-3" /> FOR SALE
                    </div>
                  </div>
                  <CardContent className="p-5 flex-1 bg-card">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-xl group-hover:text-primary transition-colors">{listing.name}</h3>
                      <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded-md border border-primary/20">NFT #{listing.tokenId}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{listing.description}</p>
                    
                    <div className="mt-4 pt-3 border-t border-border/50 text-xs text-muted-foreground flex justify-between items-center">
                      <span>Seller:</span>
                      <span className="font-mono text-foreground font-medium">{listing.sellerWallet.slice(0, 6)}...{listing.sellerWallet.slice(-4)}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="p-5 flex items-center justify-between border-t border-border bg-muted/30 mt-auto">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1">Asking Price</p>
                      <p className="font-bold text-2xl text-primary">{listing.price} <span className="text-sm font-normal text-muted-foreground">{listing.currency}</span></p>
                      {listing.currency === 'ETH' && ethRate && (
                        <p className="text-xs text-muted-foreground font-medium mt-1">
                          ≈ {formatInr(convertEthToInr(listing.price))}
                        </p>
                      )}
                    </div>
                    <Button className="font-semibold shadow-md group-hover:shadow-lg transition-all">Start Trade</Button>
                  </CardFooter>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && filteredListings.length === 0 && (
        <div className="text-center py-24 border-2 border-dashed rounded-xl bg-secondary/5">
          <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-40" />
          <h3 className="text-2xl font-bold mb-2">No Active Listings</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">There are currently no lands listed for sale in the marketplace. Be the first to list yours!</p>
          <Link href="/marketplace/list">
            <Button size="lg" className="gap-2">
              <Tag className="w-4 h-4" />
              List Your Land
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
