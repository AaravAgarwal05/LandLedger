import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  userId: string; // The user receiving the notification
  type: "trade_request" | "trade_update" | "message" | "system";
  title: string;
  message: string;
  isRead: boolean;
  link?: string; // e.g. /dashboard/trades/123
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: String, required: true },
    type: {
      type: String,
      enum: ["trade_request", "trade_update", "message", "system"],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    link: { type: String },
  },
  { timestamps: { updatedAt: false } },
);

export const Notification =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
