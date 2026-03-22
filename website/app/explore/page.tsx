"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Globe, Map } from "lucide-react";
import apiClient from "@/lib/api-client";

interface ExploreLand {
  id: string;
  tokenId: string;
  name: string;
  description: string;
  image: string;
  owner: string;
  status: string;
}

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [lands, setLands] = useState<ExploreLand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLands = async () => {
      try {
        const res = await apiClient.get('/api/explore');
        if (res.data.success) {
          setLands(res.data.lands);
        }
      } catch (error) {
        console.error("Error fetching lands:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLands();
  }, []);

  const filteredLands = lands.filter(land => 
    land.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    land.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Globe className="w-8 h-8 text-primary" />
            Explore Global Lands
          </h1>
          <p className="text-muted-foreground">Browse all registered properties on the LandLedger registry.</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or Registry ID..." 
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

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredLands.map((land, index) => (
            <motion.div
              key={land.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link href={`/lands/${land.id}`}>
                <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 group h-full flex flex-col border-primary/20">
                  <div className="aspect-[4/3] relative overflow-hidden bg-secondary">
                    <img 
                      src={land.image || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef'} 
                      alt={land.name}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 right-2 bg-primary/80 backdrop-blur-md text-white text-xs px-3 py-1 rounded-full font-semibold uppercase">
                      {land.status.replace('_', ' ')}
                    </div>
                  </div>
                  <CardContent className="p-4 flex-1">
                    <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">{land.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{land.description}</p>
                    <div className="text-xs flex items-center gap-1 text-muted-foreground">
                      <Map className="w-3 h-3" /> Registry ID: {land.id}
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 pt-0 flex flex-col items-start gap-2 bg-secondary/5 border-t border-border/50">
                    <div className="w-full">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Owner Address</span>
                      <span className="font-mono text-xs truncate block pb-2 text-foreground font-medium" title={land.owner}>
                        {land.owner ? `${land.owner.slice(0,6)}...${land.owner.slice(-4)}` : 'Government / Unclaimed'}
                      </span>
                    </div>
                    <Button size="sm" variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      View Registry Details
                    </Button>
                  </CardFooter>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && filteredLands.length === 0 && (
        <div className="text-center py-20 border rounded-xl bg-secondary/10">
          <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-medium mb-2">No lands found</h3>
          <p className="text-muted-foreground">No lands matching your criteria currently exist in the registry.</p>
        </div>
      )}
    </div>
  );
}
