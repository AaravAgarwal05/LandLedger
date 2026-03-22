"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Send, Handshake, AlertCircle, CheckCircle2, Building2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import ethers from "ethers";

export default function TradeRoom() {
  const { tradeId } = useParams();
  const { user } = useAuth();
  const [trade, setTrade] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchTradeDocs = async () => {
    try {
      const res = await apiClient.get(`/api/trades/${tradeId}`);
      if (res.data.success) {
        setTrade(res.data.data.trade);
        setMessages(res.data.data.messages || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load trade data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tradeId && user) {
      fetchTradeDocs();
      // Polling for updates every 10 secs
      const interval = setInterval(fetchTradeDocs, 10000);
      return () => clearInterval(interval);
    }
  }, [tradeId, user]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      setActionLoading(true);
      const res = await apiClient.post(`/api/trades/${tradeId}/chat`, {
        content: newMessage,
        type: 'text'
      });
      if (res.data.success) {
        setMessages([...messages, res.data.data]);
        setNewMessage("");
      }
    } catch (err) {
      toast.error("Failed to send message");
    } finally {
      setActionLoading(false);
    }
  };

  const handleProposePrice = async () => {
    const newPrice = prompt("Enter new price proposal (in ETH):");
    if (!newPrice) return;
    try {
      setActionLoading(true);
      const res = await apiClient.post(`/api/trades/${tradeId}/chat`, {
        content: `Proposed new price: ${newPrice} ETH`,
        type: 'proposal',
        proposalAmount: parseFloat(newPrice),
        proposalCurrency: 'ETH'
      });
      if (res.data.success) {
        setMessages([...messages, res.data.data]);
      }
    } catch (err) {
      toast.error("Failed to propose price");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptProposal = async (proposalAmount: number, proposalCurrency: string) => {
    try {
      setActionLoading(true);
      const res = await apiClient.post(`/api/trades/${tradeId}/chat`, {
        content: `Accepted price proposal: ${proposalAmount} ${proposalCurrency}`,
        type: 'accept',
        proposalAmount,
        proposalCurrency
      });
      if (res.data.success) {
        toast.success("Proposal accepted! You can now proceed to Smart Contract execution.");
        fetchTradeDocs(); // Refresh trade state
      }
    } catch (err) {
      toast.error("Failed to accept proposal");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  if (!trade) {
    return <div className="text-center mt-20 text-xl font-semibold text-destructive">Trade not found or access denied</div>;
  }

  const isBuyer = user?.walletAddress?.toLowerCase() === trade.buyerAddress.toLowerCase();
  const isSeller = user?.walletAddress?.toLowerCase() === trade.sellerAddress.toLowerCase();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row gap-6 h-[80vh]">
        {/* Left Side: Trade details & Actions */}
        <div className="md:w-1/3 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Handshake className="w-5 h-5 text-primary" />
                Trade Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-secondary/20 rounded-lg">
                <p className="text-sm text-muted-foreground">Land NFT ID</p>
                <p className="font-mono font-medium">{trade.landId}</p>
              </div>
              <div className="p-3 bg-secondary/20 rounded-lg">
                <p className="text-sm text-muted-foreground">Current Agreed Price</p>
                <p className="text-2xl font-bold text-primary">{trade.price.amount} {trade.price.currency}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-secondary/10 rounded-lg border text-center">
                  <p className="text-xs text-muted-foreground mb-1">Buyer</p>
                  <p className="text-xs font-mono truncate" title={trade.buyerAddress}>{trade.buyerAddress}</p>
                </div>
                <div className="p-3 bg-secondary/10 rounded-lg border text-center">
                  <p className="text-xs text-muted-foreground mb-1">Seller</p>
                  <p className="text-xs font-mono truncate" title={trade.sellerAddress}>{trade.sellerAddress}</p>
                </div>
              </div>
              
              <div className="pt-4 border-t border-border">
                <p className="text-sm font-semibold mb-2">Trade Status: <span className="uppercase text-primary">{trade.status}</span></p>
                
                {/* Blockchain Actions based on status */}
                {trade.status === 'negotiating' && (
                   <AlertCircle className="text-yellow-500 w-12 h-12 mx-auto my-4" />
                )}
                {trade.status === 'agreed' && (
                  <div className="space-y-3 mt-4">
                    {isBuyer && (
                      <Button className="w-full bg-blue-600 hover:bg-blue-700">
                        1. Deposit Funds to Escrow
                      </Button>
                    )}
                    {isSeller && (
                      <Button className="w-full bg-purple-600 hover:bg-purple-700">
                        2. Approve NFT Transfer
                      </Button>
                    )}
                    <Button variant="outline" className="w-full">
                      Execute Atomic Swap
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">Interact with the Smart Contract</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Chat */}
        <Card className="md:w-2/3 flex flex-col h-full bg-card/50">
          <CardHeader className="border-b bg-card">
            <CardTitle className="text-lg flex justify-between items-center">
              <span>Negotiation Room</span>
              <Button variant="outline" size="sm" onClick={handleProposePrice}>Propose New Price</Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden relative">
            <div 
              ref={scrollRef}
              className="absolute inset-0 overflow-y-auto p-4 space-y-4"
            >
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground flex-col">
                  <Building2 className="w-12 h-12 mb-4 opacity-20" />
                  <p>No messages yet. Start the negotiation!</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = user?.walletAddress?.toLowerCase() === msg.senderAddress.toLowerCase();
                  return (
                    <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="text-xs text-muted-foreground mb-1 px-1">
                        {isMe ? 'You' : (msg.senderRole === 'buyer' ? 'Buyer' : 'Seller')} • {new Date(msg.createdAt).toLocaleTimeString()}
                      </div>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        msg.type === 'proposal' ? 'bg-yellow-500/20 border border-yellow-500/50' :
                        msg.type === 'accept' ? 'bg-green-500/20 border border-green-500/50' :
                        isMe ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                      }`}>
                        <p>{msg.content}</p>
                        
                        {/* Proposal Actions */}
                        {msg.type === 'proposal' && !isMe && trade.status === 'negotiating' && (
                          <div className="mt-3 block">
                            <Button 
                              size="sm" 
                              variant="default"
                              onClick={() => handleAcceptProposal(msg.proposalAmount, msg.proposalCurrency)}
                              disabled={actionLoading}
                            >
                              Accept Proposal
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
          <CardFooter className="p-4 border-t bg-card mt-auto gap-2">
            <Input 
              placeholder="Type your message..." 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={actionLoading}
            />
            <Button onClick={sendMessage} disabled={actionLoading || !newMessage.trim()}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
