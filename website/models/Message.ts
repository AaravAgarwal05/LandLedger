import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  tradeId: string;
  senderClerkId: string;
  senderRole: 'buyer' | 'seller';
  content: string;
  isSystemMessage?: boolean;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    tradeId: { type: String, required: true },
    senderClerkId: { type: String, required: true },
    senderRole: { type: String, enum: ['buyer', 'seller'], required: true },
    content: { type: String, required: true },
    isSystemMessage: { type: Boolean, default: false },
  },
  { timestamps: { updatedAt: false } }
);

export const Message = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
