import mongoose from "mongoose";

export interface IWebhookEndpoint {
  orgId: mongoose.Types.ObjectId;
  name: string;
  url: string;
  secret: string;
  events: string[];
  status: "active" | "inactive";
  createdBy: mongoose.Types.ObjectId;
}

export interface IWebhookEndpointDocument extends IWebhookEndpoint, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

const webhookEndpointSchema = new mongoose.Schema<IWebhookEndpointDocument>(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    secret: { type: String, required: true },
    events: [{ type: String, required: true }],
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const WebhookEndpoint = mongoose.model<IWebhookEndpointDocument>(
  "WebhookEndpoint",
  webhookEndpointSchema
);

export default WebhookEndpoint;
