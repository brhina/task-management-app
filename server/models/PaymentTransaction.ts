import mongoose from "mongoose";

export type PaymentPlan = "Pro" | "Enterprise";
export type PaymentBillingCycle = "monthly" | "yearly";
export type PaymentTransactionStatus = "Pending" | "Paid" | "Failed" | "Expired";

export interface IPaymentTransaction {
  orgId: mongoose.Types.ObjectId;
  initiatedBy: mongoose.Types.ObjectId;
  plan: PaymentPlan;
  billingCycle: PaymentBillingCycle;
  amount: number;
  currency: string;
  phone: string;
  merchantOrderId: string;
  providerRef?: string;
  status: PaymentTransactionStatus;
  invoiceId?: mongoose.Types.ObjectId;
  expiresAt: Date;
  paidAt?: Date;
  providerPayload?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface IPaymentTransactionDocument
  extends IPaymentTransaction, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

const paymentTransactionSchema = new mongoose.Schema<IPaymentTransactionDocument>(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    plan: {
      type: String,
      enum: ["Pro", "Enterprise"],
      required: true,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "ETB",
    },
    phone: {
      type: String,
      required: true,
    },
    merchantOrderId: {
      type: String,
      required: true,
      unique: true,
    },
    providerRef: {
      type: String,
      default: "",
      index: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Expired"],
      default: "Pending",
      index: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    paidAt: {
      type: Date,
    },
    providerPayload: {
      type: mongoose.Schema.Types.Mixed,
    },
    idempotencyKey: {
      type: String,
      index: true,
    },
  },
  { timestamps: true }
);

paymentTransactionSchema.index({ orgId: 1, status: 1 });

const PaymentTransaction = mongoose.model<IPaymentTransactionDocument>(
  "PaymentTransaction",
  paymentTransactionSchema
);

export default PaymentTransaction;
