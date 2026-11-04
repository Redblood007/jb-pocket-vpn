export function buildUpiIntent(input: {
  vpa: string;
  payeeName: string;
  amountInr: number;
  orderReference: string;
}) {
  const vpa = input.vpa.trim();
  const amount = input.amountInr;
  if (!/^[\w.-]{2,256}@[\w.-]{2,64}$/.test(vpa)) throw new Error("Invalid merchant UPI ID");
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Invalid payment amount");
  if (!/^JBVPN[A-Z0-9]{8,40}$/.test(input.orderReference)) throw new Error("Invalid order reference");

  const params = new URLSearchParams({
    pa: vpa,
    pn: input.payeeName.slice(0, 70),
    am: amount.toFixed(2),
    cu: "INR",
    tn: `VPN subscription ${input.orderReference}`.slice(0, 80),
    tr: input.orderReference,
  });
  return `upi://pay?${params.toString()}`;
}
