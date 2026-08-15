import React, { useState, useEffect, useRef } from "react";
import {
  Smartphone,
  QrCode,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  X,
  ShieldCheck,
  Clock,
} from "lucide-react";
import api from "../../../utils/axios";

interface TelebirrPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPlan: "Pro" | "Enterprise";
  billingCycle: "monthly" | "yearly";
  priceETB: number;
  initialPhone?: string;
  onSuccess: (updatedPlan: string, invoice: any) => void;
  onShowToast: (msg: string, type: "info" | "success" | "error") => void;
}

export default function TelebirrPaymentModal({
  isOpen,
  onClose,
  targetPlan,
  billingCycle,
  priceETB,
  initialPhone,
  onSuccess,
  onShowToast,
}: TelebirrPaymentModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [phone, setPhone] = useState<string>(initialPhone || "+2519");
  const [channel, setChannel] = useState<"ussd" | "qr">("ussd");
  const [loading, setLoading] = useState<boolean>(false);
  const [merchantOrderId, setMerchantOrderId] = useState<string>("");
  const [txnRef, setTxnRef] = useState<string>("");
  const [ussdCode, setUssdCode] = useState<string>("");
  const [qrData, setQrData] = useState<string>("");
  const [mode, setMode] = useState<"sandbox" | "live">("live");
  const [sandboxSimulationAllowed, setSandboxSimulationAllowed] =
    useState(false);
  const [status, setStatus] = useState<string>("Pending");
  const [completedInvoice, setCompletedInvoice] = useState<any>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isOpen && initialPhone) {
      setPhone(initialPhone);
    }
  }, [isOpen, initialPhone]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      setStep(1);
      setMerchantOrderId("");
      setTxnRef("");
      setUssdCode("");
      setQrData("");
      setStatus("Pending");
      setCompletedInvoice(null);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const handlePaid = (data: any) => {
    const verified =
      data?.verifiedPaid === true ||
      (data?.status === "Paid" &&
        data?.invoice?.status === "Paid" &&
        data?.org?.plan === targetPlan);
    if (!verified) {
      onShowToast(
        "Payment not verified yet. Invoice and plan are still unsettled.",
        "error"
      );
      return;
    }
    stopPolling();
    setStatus("Paid");
    const invoice = data.invoice || null;
    setCompletedInvoice(invoice);
    setStep(4);
    onSuccess(targetPlan, invoice);
    onShowToast(
      `Subscription upgraded to ${targetPlan} Plan via Telebirr!`,
      "success"
    );
  };

  const waitForVerifiedPaid = async (orderId: string, attempts = 8) => {
    for (let i = 0; i < attempts; i++) {
      const res = await api.get(`/api/billing/telebirr/status/${orderId}`);
      setStatus(res.data.status);
      if (
        res.data.verifiedPaid ||
        (res.data.status === "Paid" &&
          res.data.invoice?.status === "Paid" &&
          res.data.org?.plan === targetPlan)
      ) {
        return res.data;
      }
      if (res.data.status === "Failed" || res.data.status === "Expired") {
        throw new Error(`Payment ${res.data.status.toLowerCase()}`);
      }
      await new Promise((r) => setTimeout(r, 600));
    }
    return null;
  };

  const startPolling = (orderId: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/api/billing/telebirr/status/${orderId}`);
        setStatus(res.data.status);
        if (
          res.data.verifiedPaid ||
          (res.data.status === "Paid" &&
            res.data.invoice?.status === "Paid" &&
            res.data.org?.plan === targetPlan)
        ) {
          handlePaid(res.data);
        } else if (
          res.data.status === "Failed" ||
          res.data.status === "Expired"
        ) {
          stopPolling();
          onShowToast(`Payment ${res.data.status.toLowerCase()}`, "error");
        }
      } catch {
        // keep polling briefly on transient errors
      }
    }, 2500);
  };

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.trim().length < 9) {
      onShowToast(
        "Please enter a valid Ethiopian Telebirr mobile number",
        "error"
      );
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/api/billing/telebirr/initiate", {
        plan: targetPlan,
        billingCycle,
        phone: phone.trim(),
      });
      setMerchantOrderId(res.data.merchantOrderId);
      setTxnRef(res.data.transactionRef);
      setUssdCode(res.data.ussdCode);
      setQrData(res.data.qrData || "");
      setMode(res.data.mode === "sandbox" ? "sandbox" : "live");
      setSandboxSimulationAllowed(res.data.sandboxSimulationAllowed === true);
      setStatus("Pending");
      setStep(3);
      startPolling(res.data.merchantOrderId);
    } catch (err: any) {
      onShowToast(
        err.response?.data?.message || "Failed to connect to Telebirr gateway",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sandbox: fire the same signed provider notify production uses, then
   * poll until the server reports verifiedPaid (txn + invoice + org plan).
   */
  const handleSandboxComplete = async () => {
    if (!merchantOrderId) return;
    setLoading(true);
    try {
      await api.post("/api/billing/telebirr/sandbox/complete", {
        merchantOrderId,
      });
      const verified = await waitForVerifiedPaid(merchantOrderId);
      if (verified) {
        handlePaid(verified);
      } else {
        onShowToast(
          "Provider callback sent but payment is not settled yet. Use Check Status.",
          "error"
        );
      }
    } catch (err: any) {
      // Still poll — notify may have partially applied
      try {
        const verified = await waitForVerifiedPaid(merchantOrderId, 4);
        if (verified) {
          handlePaid(verified);
          return;
        }
      } catch {
        /* fall through */
      }
      onShowToast(
        err.response?.data?.message || "Sandbox payment confirmation failed",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (!merchantOrderId) return;
    setLoading(true);
    try {
      const res = await api.get(
        `/api/billing/telebirr/status/${merchantOrderId}`
      );
      setStatus(res.data.status);
      if (
        res.data.verifiedPaid ||
        (res.data.status === "Paid" &&
          res.data.invoice?.status === "Paid" &&
          res.data.org?.plan === targetPlan)
      ) {
        handlePaid(res.data);
      } else {
        onShowToast(
          `Payment status: ${res.data.status}` +
            (res.data.invoice
              ? ` · Invoice: ${res.data.invoice.status}`
              : "") +
            (res.data.org?.plan ? ` · Plan: ${res.data.org.plan}` : ""),
          "info"
        );
      }
    } catch (err: any) {
      onShowToast(
        err.response?.data?.message || "Failed to refresh payment status",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs transition-opacity"
          onClick={() => {
            stopPolling();
            onClose();
          }}
        />

        <div className="relative transform overflow-hidden rounded-xl bg-white border border-gray-200 text-left shadow-xl transition-all sm:my-8 w-full max-w-md">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/80 bg-slate-50">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  Telebirr Express Checkout
                </h2>
                <p className="text-xs text-slate-500">
                  Ethio Telecom Payment Gateway
                  {mode === "sandbox" ? " · Sandbox" : ""}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                stopPolling();
                onClose();
              }}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-200/50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-slate-100 px-6 py-2 flex justify-between items-center text-[11px] font-bold border-b border-slate-200/60">
            <span className={step >= 1 ? "text-primary" : "text-slate-400"}>
              1. Order
            </span>
            <span className="text-slate-300">→</span>
            <span className={step >= 2 ? "text-primary" : "text-slate-400"}>
              2. Phone
            </span>
            <span className="text-slate-300">→</span>
            <span className={step >= 3 ? "text-primary" : "text-slate-400"}>
              3. Pay
            </span>
            <span className="text-slate-300">→</span>
            <span
              className={
                step === 4 ? "text-emerald-600 font-bold" : "text-slate-400"
              }
            >
              4. Done
            </span>
          </div>

          <div className="p-6 space-y-4">
            {step === 1 && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">
                      Target Subscription
                    </span>
                    <span className="font-bold text-slate-800">
                      {targetPlan} Tier
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">
                      Billing Interval
                    </span>
                    <span className="font-semibold text-slate-700 capitalize">
                      {billingCycle} (
                      {billingCycle === "yearly" ? "Save 20%" : "Standard"})
                    </span>
                  </div>
                  <div className="border-t border-slate-200 pt-2.5 flex justify-between items-baseline">
                    <span className="font-bold text-slate-800">
                      Total Payable
                    </span>
                    <div className="text-right">
                      <span className="text-xl font-bold text-slate-900">
                        {priceETB.toLocaleString()}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 ml-1">
                        ETB
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-xs bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-200">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>
                    Plan activates only after Telebirr payment is confirmed
                    server-side.
                  </span>
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
                  <p className="text-[10px] text-slate-500 mt-1">
                    Ethiopian mobile: +251 9XX XXX XXX or 09XXXXXXXX
                  </p>
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
                        <div className="text-[10px] text-slate-500">
                          *806# Push
                        </div>
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
                        <div className="text-[10px] text-slate-500">
                          SuperApp Scan
                        </div>
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

            {step === 3 && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">
                      Order ID
                    </span>
                    <span className="font-mono font-bold text-slate-800 text-[10px]">
                      {merchantOrderId}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">
                      TELEBIRR REF
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      {txnRef}
                    </span>
                  </div>

                  {channel === "ussd" ? (
                    <div className="text-center py-2 space-y-1">
                      <p className="text-xs text-slate-600 font-semibold">
                        Dial USSD on phone or respond to prompt:
                      </p>
                      <div className="bg-white border border-slate-200 py-2 px-3 rounded-lg text-sm text-primary font-mono font-bold tracking-wider">
                        {ussdCode}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-lg">
                      <QrCode className="w-20 h-20 text-primary" />
                      <span className="text-[10px] text-slate-500 mt-1 font-semibold break-all px-2">
                        {qrData || "Scan in Telebirr SuperApp"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs bg-amber-50 text-amber-900 p-3 rounded-xl border border-amber-200">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>
                    Waiting for Telebirr confirmation… Status:{" "}
                    <strong>{status}</strong>
                    {sandboxSimulationAllowed
                      ? " · Sandbox sim enabled — callback still requires configured notify secret."
                      : " · Pay on Telebirr, then Check Status queries the provider."}
                  </span>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  {sandboxSimulationAllowed && (
                    <button
                      onClick={handleSandboxComplete}
                      disabled={loading}
                      className="w-full btn-primary text-xs flex items-center justify-center space-x-1 py-2.5"
                    >
                      {loading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Send provider callback &amp; verify</span>
                        </>
                      )}
                    </button>
                  )}
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        stopPolling();
                        setStep(2);
                      }}
                      className="btn-secondary text-xs"
                    >
                      Change Phone
                    </button>
                    <button
                      onClick={handleRefreshStatus}
                      disabled={loading}
                      className="btn-secondary text-xs flex items-center space-x-1"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
                      />
                      <span>Check Status</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="text-center space-y-4 py-2">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-300">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-800">
                    Payment Successful!
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your organization is now upgraded to the{" "}
                    <span className="font-bold text-emerald-600">
                      {targetPlan} Plan
                    </span>
                    .
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl text-xs text-left space-y-2 border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Invoice Number:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {completedInvoice?.invoiceNumber || "—"}
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
