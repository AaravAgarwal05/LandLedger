"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { sampleNFTs } from "@/lib/mockData";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNFTs = sampleNFTs.filter(nft => 
    nft.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    nft.tokenId.includes(searchQuery)
  );

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Explore Lands</h1>
          <p className="text-muted-foreground">Discover verified land assets available on the marketplace.</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or ID..." 
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredNFTs.map((nft, index) => (
          <motion.div
            key={nft.tokenId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link href={`/nfts/${nft.tokenId}`}>
              <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 group h-full flex flex-col">
                <div className="aspect-[4/3] relative overflow-hidden bg-secondary">
                  <img 
                    src={nft.image} 
                    alt={nft.name}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white text-xs px-2 py-1 rounded-md font-mono">
                    #{nft.tokenId}
                  </div>
                </div>
                <CardContent className="p-4 flex-1">
                  <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">{nft.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{nft.description}</p>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Price</span>
                    <span className="font-bold text-primary">{nft.price} {nft.currency}</span>
                  </div>
                  <Button size="sm" variant="secondary" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {filteredNFTs.length === 0 && (
        <div className="text-center py-20">
          <p className="text-muted-foreground">No lands found matching your search.</p>
        </div>
      )}
    </div>
  );
}
