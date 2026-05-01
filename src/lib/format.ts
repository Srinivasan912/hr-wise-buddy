// India-specific formatting helpers (INR, IST dates).
const TZ = "Asia/Kolkata";

export const inr = (n: number | string | null | undefined, opts: { compact?: boolean } = {}) => {
  const v = typeof n === "string" ? Number(n) : n ?? 0;
  if (!Number.isFinite(v)) return "₹0";
  if (opts.compact && Math.abs(v) >= 100000) {
    if (Math.abs(v) >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
    return `₹${(v / 100000).toFixed(2)} L`;
  }
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
};

export const inrPrecise = (n: number | string | null | undefined) => {
  const v = typeof n === "string" ? Number(n) : n ?? 0;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
};

export const fmtDate = (d: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-IN", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric", ...opts }).format(date);
};

export const fmtTime = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-IN", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: true }).format(date);
};

export const fmtDateTime = (d: string | Date | null | undefined) =>
  d ? `${fmtDate(d)}, ${fmtTime(d)}` : "—";

// Today's date in IST as YYYY-MM-DD (for postgres date columns)
export const todayIST = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
};

// Number to Indian words (used on payslips). Limited to crores.
export const numberToWordsIndian = (num: number): string => {
  const n = Math.round(num);
  if (n === 0) return "Zero Rupees Only";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (x: number): string =>
    x < 20 ? ones[x] : `${tens[Math.floor(x / 10)]}${x % 10 ? " " + ones[x % 10] : ""}`;
  const three = (x: number): string => {
    const h = Math.floor(x / 100), r = x % 100;
    return `${h ? ones[h] + " Hundred" + (r ? " " : "") : ""}${r ? two(r) : ""}`;
  };
  let res = "";
  const cr = Math.floor(n / 10000000); const rem1 = n % 10000000;
  const lk = Math.floor(rem1 / 100000); const rem2 = rem1 % 100000;
  const th = Math.floor(rem2 / 1000); const rem3 = rem2 % 1000;
  if (cr) res += two(cr) + " Crore ";
  if (lk) res += two(lk) + " Lakh ";
  if (th) res += two(th) + " Thousand ";
  if (rem3) res += three(rem3);
  return res.trim() + " Rupees Only";
};
