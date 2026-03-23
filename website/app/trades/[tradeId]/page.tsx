"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Send, Handshake, AlertCircle, CheckCircle2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { ethers, BrowserProvider, Contract } from "ethers";
import { LAND_ESCROW_ABI } from "@/lib/contracts/abis";
import { fetchEthToInrRate, weiToInr, weiToEth } from "@/lib/utils/pricing";

const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS || "";
const NFT_ADDRESS = process.env.NEXT_PUBLIC_NFT_CONTRACT || "";

// Minimal ERC721 ABI for approval
const MINIMAL_ERC721_ABI = [
  "function approve(address to, uint256 tokenId) public",
  "function getApproved(uint256 tokenId) public view returns (address)"
];

export default function TradeRoom() {
  const { tradeId } = useParams();
  const { userId, isLoaded } = useAuth();
  const [trade, setTrade] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [ethRate, setEthRate] = useState<number>(250000);
  
  // On-chain state
  const [isFunded, setIsFunded] = useState(false);
  const [isNftDeposited, setIsNftDeposited] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchTradeDocs = useCallback(async () => {
    try {
      const res = await apiClient.get(`/api/trades/${tradeId}`);
      if (res.data.success) {
        setTrade(res.data.trade);
        setMessages(res.data.messages || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load trade data");
    } finally {
      setLoading(false);
    }
  }, [tradeId]);

  const fetchOnChainState = useCallback(async () => {
    if (!window.ethereum || !ESCROW_ADDRESS || !tradeId) return null;
    try {
      const provider = new BrowserProvider(window.ethereum as any);
      const contract = new Contract(ESCROW_ADDRESS, LAND_ESCROW_ABI, provider);
      const nftContract = new Contract(NFT_ADDRESS, MINIMAL_ERC721_ABI, provider);

      // Read trade state directly from public mapping
      const onChainTrade = await contract.trades(tradeId);
      const funded = onChainTrade.isFunded === true;
      const nftDeposited = onChainTrade.isNftDeposited === true; // The deployed contract HAS this field

      setIsFunded(funded);
      setIsNftDeposited(nftDeposited);

      return { funded, nftDeposited };
    } catch (error) {
      console.error("Error fetching on-chain state:", error);
    }
    return null;
  }, [tradeId]);

  const checkAndAutoExecute = useCallback(async (funded: boolean, nftDeposited: boolean) => {
    if (funded && nftDeposited && trade?.status !== 'executed' && !isExecuting) {
      setIsExecuting(true);
      toast.info("All assets secured! Executing swap automatically...");
      
      try {
        const res = await apiClient.post(`/api/trades/${tradeId}/execute`);
        if (res.data.success) {
          toast.success("Trade executed successfully!");
          fetchTradeDocs();
        } else {
          toast.error("Auto-execution failed. Please try manually or contact support.");
          setIsExecuting(false);
        }
      } catch (err) {
        toast.error("Error executing trade");
        setIsExecuting(false);
      }
    }
  }, [trade, tradeId, isExecuting]); // fetchTradeDocs omitted intentionally — stable via tradeId

  // Keep a ref to latest trade so interval can read it without being a dep
  const tradeRef = useRef<any>(null);
  useEffect(() => { tradeRef.current = trade; }, [trade]);

  useEffect(() => {
    if (!tradeId || !isLoaded || !userId) return;

    // Initial load
    fetchTradeDocs();
    fetchEthToInrRate().then(setEthRate);

    const interval = setInterval(async () => {
      // Stop polling if trade is already done
      const currentTrade = tradeRef.current;
      if (currentTrade?.status === 'executed' || currentTrade?.status === 'cancelled') {
        clearInterval(interval);
        return;
      }

      await fetchTradeDocs();
      const state = await fetchOnChainState();
      if (state && tradeRef.current?.status !== 'executed') {
        checkAndAutoExecute(state.funded, state.nftDeposited);
      }
    }, 10000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeId, isLoaded, userId]); // ← only stable primitives, NO callbacks in deps

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const logOnChainAction = async (content: string, txHash?: string) => {
    try {
      const res = await apiClient.post(`/api/trades/${tradeId}/chat`, {
        type: 'on_chain_action',
        content,
        txHash
      });
      if (res.data.success) {
        setMessages(prev => [...prev, res.data.message]);
      }
    } catch (err) {
      console.error("Failed to log on-chain action");
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      setActionLoading(true);
      const res = await apiClient.post(`/api/trades/${tradeId}/chat`, {
        content: newMessage,
        type: 'chat'
      });
      if (res.data.success) {
        setMessages([...messages, res.data.message]);
        setNewMessage("");
      }
    } catch (err) {
      toast.error("Failed to send message");
    } finally {
      setActionLoading(false);
    }
  };

  const handleProposePrice = async () => {
    const newPriceInr = prompt("Enter new price proposal (in ₹ INR):");
    if (!newPriceInr || isNaN(Number(newPriceInr))) return;
    try {
      const { inrToWei } = await import('@/lib/utils/pricing');
      const priceWei = inrToWei(Number(newPriceInr), ethRate);
      setActionLoading(true);
      const formattedInr = Number(newPriceInr).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
      const res = await apiClient.post(`/api/trades/${tradeId}/chat`, {
        content: `Proposed new price: ${formattedInr}`,
        type: 'proposal',
        newPriceWei: priceWei
      });
      if (res.data.success) {
        setMessages([...messages, res.data.message]);
        fetchTradeDocs();
      }
    } catch (err) {
      toast.error("Failed to propose price");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptProposal = async () => {
    try {
      setActionLoading(true);
      const res = await apiClient.post(`/api/trades/${tradeId}/chat`, {
        content: `Accepted the terms! Waiting for Escrow initialization.`,
        type: 'accept'
      });
      if (res.data.success) {
        toast.success("Proposal accepted! You can now proceed to Smart Contract execution.");
        fetchTradeDocs();
      }
    } catch (err) {
      toast.error("Failed to accept proposal");
    } finally {
      setActionLoading(false);
    }
  };

  // --- Blockchain Actions ---

  const handleDepositFunds = async () => {
    if (!window.ethereum) return toast.error("Please install MetaMask");
    try {
      setActionLoading(true);
      const provider = new BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const contract = new Contract(ESCROW_ADDRESS, LAND_ESCROW_ABI, signer);
      
      // ABI: depositFunds(string tradeId, address seller, uint256 tokenId) payable
      const tx = await contract.depositFunds(
        tradeId,
        trade.sellerWallet,
        trade.tokenId,
        { value: trade.agreedPrice.amount }
      );
      toast.info("Transaction submitted. Waiting for confirmation...");
      
      await tx.wait();
      toast.success("Funds deposited successfully!");
      setIsFunded(true);
      
      const inrAmount = weiToInr(trade.agreedPrice.amount, ethRate);
      await logOnChainAction(`✅ Buyer deposited ${inrAmount} to Escrow`, tx.hash);
      
      checkAndAutoExecute(true, isNftDeposited);
    } catch (err: any) {
      console.error(err);
      toast.error(err.reason || "Transaction failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveNFT = async () => {
    if (!window.ethereum) return toast.error("Please install MetaMask");
    try {
      // 1. First step: Approve
      setActionLoading(true);
      const provider = new BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const nftContract = new Contract(NFT_ADDRESS, MINIMAL_ERC721_ABI, signer);

      const tx = await nftContract.approve(ESCROW_ADDRESS, trade.tokenId);
      toast.info("Approval transaction submitted...");

      await tx.wait();
      toast.success("NFT approved! Now click Deposit NFT.");
      // We don't set isNftDeposited here, because the contract requires the second step
      
      await logOnChainAction(`✅ Seller approved NFT #${trade.tokenId} for Escrow transfer`, tx.hash);
    } catch (err: any) {
      console.error(err);
      toast.error("Approval transaction failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDepositNFT = async () => {
    if (!window.ethereum) return toast.error("Please install MetaMask");
    try {
      // 2. Second step: Deposit into Escrow
      setActionLoading(true);
      const provider = new BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const contract = new Contract(ESCROW_ADDRESS, LAND_ESCROW_ABI, signer);

      const tx = await contract.depositNFT(tradeId);
      toast.info("Deposit NFT transaction submitted...");

      await tx.wait();
      toast.success("NFT deposited into Escrow!");
      setIsNftDeposited(true);

      await logOnChainAction(`✅ Seller deposited NFT #${trade.tokenId} into Escrow`, tx.hash);

      // Both conditions now met — trigger auto-execute
      checkAndAutoExecute(isFunded, true);
    } catch (err: any) {
      console.error(err);
      toast.error(err.reason || "Failed to deposit NFT");
    } finally {
      setActionLoading(false);
    }
  };

  // --- Render ---

  if (loading || !isLoaded) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  if (!trade) {
    return <div className="text-center mt-20 text-xl font-semibold text-destructive">Trade not found or access denied</div>;
  }

  const isBuyer = userId === trade.buyerClerkId;
  const isSeller = userId === trade.sellerClerkId;
  const isExecutedOrCancelled = trade.status === 'executed' || trade.status === 'cancelled';

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
                <p className="font-mono font-medium">{trade.tokenId} (Land: {trade.landId})</p>
              </div>
              <div className="p-3 bg-secondary/20 rounded-lg">
                <p className="text-sm text-muted-foreground">Current Agreed Price</p>
                <p className="text-2xl font-bold text-primary">
                  {weiToInr(trade.agreedPrice.amount, ethRate)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-secondary/10 rounded-lg border text-center">
                  <p className="text-xs text-muted-foreground mb-1">Buyer</p>
                  <p className="text-xs font-mono truncate" title={trade.buyerWallet}>{trade.buyerWallet || 'N/A'}</p>
                </div>
                <div className="p-3 bg-secondary/10 rounded-lg border text-center">
                  <p className="text-xs text-muted-foreground mb-1">Seller</p>
                  <p className="text-xs font-mono truncate" title={trade.sellerWallet}>{trade.sellerWallet || 'N/A'}</p>
                </div>
              </div>
              
              <div className="pt-4 border-t border-border">
                <p className="text-sm font-semibold mb-2">Trade Status: <span className="uppercase text-primary">{trade.status}</span></p>
                
                {trade.status === 'negotiating' && (
                   <AlertCircle className="text-yellow-500 w-12 h-12 mx-auto my-4" />
                )}
                
                {(trade.status === 'pending' || trade.status === 'negotiating') && !isExecutedOrCancelled && (
                   <div className="space-y-3 mt-4 text-center">
                     <p className="text-sm text-muted-foreground">Waiting for terms approval.</p>
                     {isSeller && (
                       <Button 
                         className="w-full bg-green-600 hover:bg-green-700" 
                         onClick={handleAcceptProposal} 
                         disabled={actionLoading}
                       >
                         Accept Initial Offer
                       </Button>
                     )}
                   </div>
                )}

                {trade.status === 'approved' && !isExecutedOrCancelled && (
                  <div className="space-y-3 mt-4">
                    {/* Auto Execute Banner */}
                    {(isFunded && isNftDeposited) ? (
                      <div className="p-4 bg-green-500/20 border border-green-500 rounded-lg text-center animate-pulse">
                        <p className="font-bold text-green-700 dark:text-green-400">All assets secured!</p>
                        <p className="text-xs mt-1">Executing swap automatically...</p>
                      </div>
                    ) : (
                      <>
                        {isBuyer && (
                          <Button 
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex justify-between"
                            onClick={handleDepositFunds}
                            disabled={isFunded || actionLoading}
                          >
                            <span>1. Deposit Funds to Escrow</span>
                            {isFunded && <CheckCircle2 className="w-4 h-4 text-green-300" />}
                          </Button>
                        )}
                        {isSeller && (
                          <>
                            <Button
                              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 flex justify-between"
                              onClick={handleApproveNFT}
                              disabled={isNftDeposited || actionLoading || !isFunded}
                            >
                              <span>2a. Approve NFT Transfer{!isFunded ? ' (wait for buyer funds)' : ''}</span>
                            </Button>
                            <Button
                              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 flex justify-between"
                              onClick={handleDepositNFT}
                              disabled={isNftDeposited || actionLoading || !isFunded}
                            >
                              <span>2b. Deposit NFT to Escrow</span>
                              {isNftDeposited && <CheckCircle2 className="w-4 h-4 text-green-300" />}
                            </Button>
                          </>
                        )}
                      </>
                    )}
                    <p className="text-xs text-center text-muted-foreground">Interact with the Smart Contract using MetaMask</p>
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
              {!isExecutedOrCancelled && (
                <Button variant="outline" size="sm" onClick={handleProposePrice} disabled={actionLoading}>Propose New Price</Button>
              )}
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
                  const isMe = userId === msg.senderClerkId;
                  const isSystem = msg.isSystemMessage;
                  
                  if (isSystem) {
                    return (
                      <div key={idx} className="flex justify-center my-2">
                        <div className="bg-secondary/50 border text-xs px-3 py-1.5 rounded-full text-center max-w-[90%]">
                          {msg.content}
                          {msg.type === 'proposal' && trade.status === 'negotiating' && !isMe && (
                             <Button size="sm" variant="outline" className="ml-3 h-6 text-[10px]" onClick={handleAcceptProposal} disabled={actionLoading}>
                               Accept
                             </Button>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="text-xs text-muted-foreground mb-1 px-1">
                        {isMe ? 'You' : (msg.senderRole === 'buyer' ? 'Buyer' : 'Seller')} • {new Date(msg.createdAt).toLocaleTimeString()}
                      </div>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        isMe ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
          {/* Chat input only shown if NOT executed or cancelled */}
          {!isExecutedOrCancelled ? (
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
          ) : (
            <div className="p-4 border-t bg-card mt-auto text-center text-sm text-muted-foreground">
              Trade is {trade.status}. Chat is closed.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
