"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Upload, FileText, MapPin, Ruler, User, Wallet, Home, Building, Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import axios from "axios";

const LeafletMap = dynamic(() => import("@/components/LeafletMap"), {
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-muted/20 animate-pulse rounded-md" />,
});

interface WalletData {
  _id: string;
  address: string;
  label: string;
  network: string;
  source: string;
}

export default function NewLandPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [geoJson, setGeoJson] = useState<any>(null);
  const [mapKey, setMapKey] = useState(0);

  const [formData, setFormData] = useState({
    landTitle: "",
    surveyNo: "",
    area: "",
    areaUnit: "sqft",
    ownerWallet: "",
    notes: "",
    address: {
      plotNo: "",
      street1: "",
      street2: "",
      city: "",
      state: "",
      pincode: "",
    }
  });

  useEffect(() => {
    const fetchWallets = async () => {
      try {
        const response = await axios.get("/api/wallets");
        if (response.data.success) {
          setWallets(response.data.wallets);
        }
      } catch (error) {
        console.error("Failed to fetch wallets:", error);
        toast.error("Failed to load linked wallets");
      }
    };
    fetchWallets();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        [id]: value,
      },
    }));
  };

  const handleSelectChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!geoJson) {
      toast.error("Please draw the land boundary on the map");
      return;
    }

    if (!formData.ownerWallet) {
      toast.error("Please select an owner wallet");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        geo: geoJson.geometry,
      };

      const response = await axios.post("/api/lands", payload);

      if (response.data.success) {
        toast.success("Land registered successfully!");
        console.log("Server response:", response.data);
        
        // Reset form
        setFormData({
          landTitle: "",
          surveyNo: "",
          area: "",
          areaUnit: "sqft",
          ownerWallet: "",
          notes: "",
          address: {
            plotNo: "",
            street1: "",
            street2: "",
            city: "",
            state: "",
            pincode: "",
          }
        });
        setGeoJson(null);
        setMapKey(prev => prev + 1); // Force map remount to clear drawn layers
        
        // router.push("/dashboard"); // Kept commented as per previous instruction/testing
      }
    } catch (error: any) {
      console.error("Registration failed:", error);
      
      // Show specific error message from server if available
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
        
        // Log detailed validation info if available
        if (error.response.data.message) {
          console.error("Validation details:", error.response.data.message);
        }
        if (error.response.data.computedArea) {
          console.error("Computed area:", error.response.data.computedArea, "sqm");
          console.error("User area:", error.response.data.userArea, error.response.data.unit);
          console.error("Difference:", error.response.data.difference?.toFixed(2), "%");
        }
      } else {
        toast.error("Failed to register land");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Register New Land</CardTitle>
            <CardDescription>
              Submit land details for verification and registration on the private ledger.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Basic Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Basic Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="landTitle">Land Title</Label>
                    <Input id="landTitle" placeholder="e.g. Green Valley Estate" value={formData.landTitle} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="surveyNo">Survey Number</Label>
                    <Input id="surveyNo" placeholder="S-452/A" value={formData.surveyNo} onChange={handleChange} required />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="area">Total Area</Label>
                    <div className="relative">
                      <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="area" type="number" placeholder="1200" className="pl-9" value={formData.area} onChange={handleChange} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="areaUnit">Unit</Label>
                    <Select value={formData.areaUnit} onValueChange={(val) => handleSelectChange("areaUnit", val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sqft">Sq. Ft.</SelectItem>
                        <SelectItem value="sqm">Sq. Meters</SelectItem>
                        <SelectItem value="acres">Acres</SelectItem>
                        <SelectItem value="hectares">Hectares</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Address Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Location Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="plotNo">Plot / House Number</Label>
                    <Input id="plotNo" placeholder="Plot No. 45" value={formData.address.plotNo} onChange={handleAddressChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input id="pincode" placeholder="400001" value={formData.address.pincode} onChange={handleAddressChange} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="street1">Street Address Line 1</Label>
                  <Input id="street1" placeholder="Main Road, Sector 5" value={formData.address.street1} onChange={handleAddressChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="street2">Street Address Line 2 (Optional)</Label>
                  <Input id="street2" placeholder="Near Landmark" value={formData.address.street2} onChange={handleAddressChange} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="city" placeholder="Mumbai" className="pl-9" value={formData.address.city} onChange={handleAddressChange} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <div className="relative">
                      <MapIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="state" placeholder="Maharashtra" className="pl-9" value={formData.address.state} onChange={handleAddressChange} required />
                    </div>
                  </div>
                </div>
              </div>

              {/* Ownership & Map */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Ownership & Boundary
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="ownerWallet">Owner Wallet</Label>
                  <Select value={formData.ownerWallet} onValueChange={(val) => handleSelectChange("ownerWallet", val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select linked wallet" />
                    </SelectTrigger>
                    <SelectContent>
                      {wallets.map((wallet) => (
                        <SelectItem key={wallet._id} value={wallet.address}>
                          <div className="flex items-center gap-2">
                            <Wallet className="w-4 h-4" />
                            <span>{wallet.label}</span>
                            <span className="text-xs text-muted-foreground">({wallet.address.slice(0, 6)}...{wallet.address.slice(-4)})</span>
                          </div>
                        </SelectItem>
                      ))}
                      {wallets.length === 0 && (
                        <SelectItem value="no-wallet" disabled>No linked wallets found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Geo Boundary</Label>
                  <div className="border rounded-md overflow-hidden">
                     <LeafletMap 
                        key={mapKey}
                        onCreated={(layer) => setGeoJson(layer)} 
                        onDeleted={() => setGeoJson(null)}
                     />
                  </div>
                  <p className="text-xs text-muted-foreground">Use the draw tools to mark the land boundary on the map.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea id="notes" placeholder="Any additional notes..." value={formData.notes} onChange={handleChange} />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Registering..." : "Submit Registration"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
