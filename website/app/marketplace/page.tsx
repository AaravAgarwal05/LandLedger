"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Filter, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { sampleNFTs } from "@/lib/mockData";

export default function MarketplacePage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">Marketplace</h1>
          <p className="text-muted-foreground">Buy and sell verified land assets.</p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search assets..." className="pl-9" />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" /> Filters
          </Button>
          <Link href="/marketplace/list">
            <Button>List Item</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {sampleNFTs.map((nft, index) => (
          <motion.div
            key={nft.tokenId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link href={`/nfts/${nft.tokenId}`}>
              <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 group h-full flex flex-col border-0 bg-secondary/10">
                <div className="aspect-[4/3] relative overflow-hidden rounded-t-xl">
                  <img 
                    src={nft.image} 
                    alt={nft.name}
                    className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                    <span className="text-white font-medium flex items-center gap-2">
                      View Details <ArrowUpRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
                <CardContent className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{nft.name}</h3>
                    <span className="text-xs font-mono bg-secondary px-2 py-1 rounded">#{nft.tokenId}</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{nft.description}</p>
                </CardContent>
                <CardFooter className="p-5 pt-0 flex items-center justify-between border-t border-border/50 mt-auto">
                  <div>
                    <p className="text-xs text-muted-foreground">Price</p>
                    <p className="font-bold text-lg">{nft.price} {nft.currency}</p>
                  </div>
                  <Button size="sm">Buy Now</Button>
                </CardFooter>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
