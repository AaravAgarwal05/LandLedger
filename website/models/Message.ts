import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
  tradeId: string;
  senderClerkId: string;
  senderRole: "buyer" | "seller" | "system";
  content: string;
  isSystemMessage?: boolean;
  type?: "chat" | "proposal" | "accept" | "on_chain_action";
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    tradeId: { type: String, required: true },
    senderClerkId: { type: String, required: true },
    senderRole: { type: String, enum: ["buyer", "seller", "system"], required: true },
    content: { type: String, required: true },
    isSystemMessage: { type: Boolean, default: false },
    type: { type: String, enum: ["chat", "proposal", "accept", "on_chain_action"], default: "chat" },
  },
  { timestamps: { updatedAt: false } },
);

export const Message =
  mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);
