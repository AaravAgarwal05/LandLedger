import mongoose, { Schema, Document } from "mongoose";

export interface ITradeRequest extends Document {
  tradeId: string; // Unique UI ID
  landId: string; // The ILand ID
  tokenId: string; // The specific ERC721 token ID
  buyerClerkId: string;
  buyerWallet: string;
  sellerClerkId: string;
  sellerWallet: string;
  agreedPrice: {
    amount: string; // Stored as wei string
    currency: "ETH";
  };
  status:
    | "pending"
    | "negotiating"
    | "approved"
    | "funded"
    | "executed"
    | "cancelled";
  escrowContractAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TradeRequestSchema = new Schema<ITradeRequest>(
  {
    tradeId: { type: String, required: true, unique: true },
    landId: { type: String, required: true },
    tokenId: { type: String, required: true },
    buyerClerkId: { type: String, required: true },
    buyerWallet: { type: String, required: true, lowercase: true },
    sellerClerkId: { type: String, required: true },
    sellerWallet: { type: String, required: true, lowercase: true },
    agreedPrice: {
      amount: { type: String, required: true },
      currency: { type: String, required: true, enum: ["ETH"], default: "ETH" },
    },
    status: {
      type: String,
      required: true,
      enum: [
        "pending",
        "negotiating",
        "approved",
        "funded",
        "executed",
        "cancelled",
      ],
      default: "pending",
    },
    escrowContractAddress: { type: String },
  },
  { timestamps: true },
);

export const TradeRequest =
  mongoose.models.TradeRequest ||
  mongoose.model<ITradeRequest>("TradeRequest", TradeRequestSchema);
