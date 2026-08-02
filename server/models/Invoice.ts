import mongoose from "mongoose";

export interface IInvoiceItem {
  description: string;
  unitPrice: number;
  quantity: number;
  total: number;
}

export interface IInvoice {
  orgId: mongoose.Types.ObjectId;
  invoiceNumber: string;
  plan: "Free" | "Pro" | "Enterprise";
  billingCycle: "monthly" | "yearly";
  amount: number;
  currency: string;
  paymentMethod: "Telebirr" | "Bank Transfer" | "Card";
  telebirrReference?: string;
  telebirrPhone?: string;
  status: "Paid" | "Pending" | "Failed" | "Refunded";
  billingDate: Date;
  dueDate: Date;
  items: IInvoiceItem[];
}

export interface IInvoiceDocument extends IInvoice, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

const invoiceSchema = new mongoose.Schema<IInvoiceDocument>(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    plan: {
      type: String,
      enum: ["Free", "Pro", "Enterprise"],
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
    },
    currency: {
      type: String,
      default: "ETB",
    },
    paymentMethod: {
      type: String,
      enum: ["Telebirr", "Bank Transfer", "Card"],
      default: "Telebirr",
    },
    telebirrReference: {
      type: String,
      default: "",
    },
    telebirrPhone: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Paid", "Pending", "Failed", "Refunded"],
      default: "Paid",
    },
    billingDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      default: Date.now,
    },
    items: [
      {
        description: { type: String, required: true },
        unitPrice: { type: Number, required: true },
        quantity: { type: Number, required: true, default: 1 },
        total: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true }
);

const Invoice = mongoose.model<IInvoiceDocument>("Invoice", invoiceSchema);

export default Invoice;
