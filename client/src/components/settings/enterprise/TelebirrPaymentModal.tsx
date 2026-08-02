import React, { useState } from "react";
import {
  Smartphone,
  QrCode,
  CheckCircle2,
  Lock,
  ArrowRight,
  RefreshCw,
  X,
  ShieldCheck,
} from "lucide-react";
import api from "../../../utils/axios";

interface TelebirrPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPlan: "Pro" | "Enterprise";
  billingCycle: "monthly" | "yearly";
  priceETB: number;
  onSuccess: (updatedPlan: string, invoice: any) => void;
  onShowToast: (msg: string, type: "info" | "success" | "error") => void;
}

export default function TelebirrPaymentModal({
  isOpen,
  onClose,
  targetPlan,
  billingCycle,
  priceETB,
  onSuccess,
  onShowToast,
}: TelebirrPaymentModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [phone, setPhone] = useState<string>("+251 911 234 567");
  const [channel, setChannel] = useState<"ussd" | "qr" | "app">("ussd");
  const [loading, setLoading] = useState<boolean>(false);
  const [txnRef, setTxnRef] = useState<string>("");
  const [ussdCode, setUssdCode] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState<string>("123456");
  const [completedInvoice, setCompletedInvoice] = useState<any>(null);

  if (!isOpen) return null;

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.trim().length < 9) {
      onShowToast("Please enter a valid Ethiopian Telebirr mobile number", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/api/billing/telebirr/initiate", {
        plan: targetPlan,
        billingCycle,
        phone: phone.trim(),
      });
      setTxnRef(res.data.transactionRef);
      setUssdCode(res.data.ussdCode);
      setStep(3);
    } catch (err: any) {
      onShowToast(err.response?.data?.message || "Failed to connect to Telebirr gateway", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      const res = await api.post("/api/billing/telebirr/verify", {
        plan: targetPlan,
        billingCycle,
        telebirrReference: txnRef || `TB-${Math.floor(100000 + Math.random() * 900000)}`,
        phone: phone.trim(),
      });
      setCompletedInvoice(res.data.invoice);
      setStep(4);
      onSuccess(targetPlan, res.data.invoice);
      onShowToast(`Subscription upgraded to ${targetPlan} Plan via Telebirr!`, "success");
    } catch (err: any) {
      onShowToast(err.response?.data?.message || "Telebirr verification failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />

        {/* Modal Window */}
        <div className="relative transform overflow-hidden rounded-xl bg-white border border-gray-200 text-left shadow-xl transition-all sm:my-8 w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/80 bg-slate-50">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Telebirr Express Checkout</h2>
                <p className="text-xs text-slate-500">Ethio Telecom Payment Gateway</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-200/50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step Progress Bar */}
          <div className="bg-slate-100 px-6 py-2 flex justify-between items-center text-[11px] font-bold border-b border-slate-200/60">
            <span className={step >= 1 ? "text-primary" : "text-slate-400"}>1. Order</span>
            <span className="text-slate-300">→</span>
            <span className={step >= 2 ? "text-primary" : "text-slate-400"}>2. Phone</span>
            <span className="text-slate-300">→</span>
            <span className={step >= 3 ? "text-primary" : "text-slate-400"}>3. Verify</span>
            <span className="text-slate-300">→</span>
            <span className={step === 4 ? "text-emerald-600 font-bold" : "text-slate-400"}>4. Done</span>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* STEP 1: Plan Review */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">Target Subscription</span>
                    <span className="font-bold text-slate-800">{targetPlan} Tier</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">Billing Interval</span>
                    <span className="font-semibold text-slate-700 capitalize">
                      {billingCycle} ({billingCycle === "yearly" ? "Save 20%" : "Standard"})
                    </span>
                  </div>
                  <div className="border-t border-slate-200 pt-2.5 flex justify-between items-baseline">
                    <span className="font-bold text-slate-800">Total Payable</span>
                    <div className="text-right">
                      <span className="text-xl font-bold text-slate-900">
                        {priceETB.toLocaleString()}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 ml-1">ETB</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-xs text-slate-600 bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-200">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>Instant plan activation upon Telebirr payment confirmation.</span>
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    className="btn-primary text-xs flex items-center space-x-1"
                  >
                    <span>Proceed to Phone Input</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Phone Input */}
            {step === 2 && (
              <form onSubmit={handleInitiate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Telebirr Registered Mobile Number
                  </label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+251 9... or 09..."
                      required
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Ethiopian mobile number: +251 9XX XXX XXX or 09XXXXXXXX</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Payment Method Channel
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setChannel("ussd")}
                      className={`p-3 rounded-xl border text-left flex items-start space-x-2 transition-all ${
                        channel === "ussd"
                          ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <Smartphone className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs font-bold">USSD Prompt</div>
                        <div className="text-[10px] text-slate-500">*806# Push</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setChannel("qr")}
                      className={`p-3 rounded-xl border text-left flex items-start space-x-2 transition-all ${
                        channel === "qr"
                          ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <QrCode className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs font-bold">Telebirr App QR</div>
                        <div className="text-[10px] text-slate-500">SuperApp Scan</div>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn-secondary text-xs"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary text-xs flex items-center space-x-1"
                  >
                    {loading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <span>Initiate Payment</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Verification */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">TELEBIRR REF</span>
                    <span className="font-mono font-bold text-slate-800">{txnRef || "TB-892019"}</span>
                  </div>

                  {channel === "ussd" ? (
                    <div className="text-center py-2 space-y-1">
                      <p className="text-xs text-slate-600 font-semibold">Dial USSD on phone or respond to prompt:</p>
                      <div className="bg-white border border-slate-200 py-2 px-3 rounded-lg text-sm text-primary font-mono font-bold tracking-wider">
                        {ussdCode || `*806*1*${phone.replace(/\+/g, "")}*${priceETB}#`}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-lg">
                      <QrCode className="w-20 h-20 text-primary" />
                      <span className="text-[10px] text-slate-500 mt-1 font-semibold">Scan in Telebirr SuperApp</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Enter Telebirr PIN / Verification Code
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="Enter PIN or OTP"
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold tracking-widest"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="btn-secondary text-xs"
                  >
                    Change Phone
                  </button>
                  <button
                    onClick={handleVerify}
                    disabled={loading}
                    className="btn-primary text-xs flex items-center space-x-1"
                  >
                    {loading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm & Upgrade</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Success */}
            {step === 4 && (
              <div className="text-center space-y-4 py-2">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-300">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-800">Payment Successful!</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your organization is now upgraded to the <span className="font-bold text-emerald-600">{targetPlan} Plan</span>.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl text-xs text-left space-y-2 border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Invoice Number:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {completedInvoice?.invoiceNumber || "INV-ETB-90182"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Telebirr Ref:</span>
                    <span className="font-mono font-bold text-primary">
                      {completedInvoice?.telebirrReference || txnRef}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount Paid:</span>
                    <span className="font-bold text-slate-800">
                      {priceETB.toLocaleString()} ETB
                    </span>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="w-full btn-primary text-xs py-2.5"
                >
                  Return to Enterprise Settings
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
