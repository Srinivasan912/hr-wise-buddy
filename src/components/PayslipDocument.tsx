/**
 * React-PDF payslip document. Standard Indian payslip layout:
 * company header, employee info, earnings/deductions table, net in words.
 */
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { numberToWordsIndian } from "@/lib/format";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#111" },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottom: "2 solid #5B5BD6", paddingBottom: 8, marginBottom: 12 },
  brand: { fontSize: 16, fontWeight: 700, color: "#5B5BD6" },
  small: { fontSize: 8, color: "#666" },
  title: { textAlign: "center", fontSize: 12, fontWeight: 700, marginVertical: 8, textTransform: "uppercase", letterSpacing: 1 },
  empBox: { border: "1 solid #ddd", padding: 8, marginBottom: 10, flexDirection: "row" },
  col: { flex: 1, paddingHorizontal: 4 },
  row: { flexDirection: "row", marginBottom: 2 },
  label: { width: 90, color: "#666" },
  value: { flex: 1, fontWeight: 700 },

  table: { border: "1 solid #ddd", marginBottom: 8 },
  trH: { flexDirection: "row", backgroundColor: "#f3f4f6", padding: 5, fontWeight: 700, borderBottom: "1 solid #ddd" },
  tr: { flexDirection: "row", padding: 5, borderBottom: "1 solid #eee" },
  td1: { flex: 2 }, td2: { flex: 1, textAlign: "right" },
  twoCol: { flexDirection: "row", gap: 8 },
  half: { flex: 1 },
  totalRow: { flexDirection: "row", padding: 6, backgroundColor: "#f9fafb", fontWeight: 700 },
  netBox: { marginTop: 8, padding: 10, backgroundColor: "#5B5BD6", color: "#fff", flexDirection: "row", justifyContent: "space-between" },
  netLabel: { fontSize: 10 },
  netVal: { fontSize: 14, fontWeight: 700 },
  footer: { marginTop: 14, fontSize: 7, color: "#888", textAlign: "center", borderTop: "1 solid #eee", paddingTop: 6 },
});

export type PayslipData = {
  organization: { name: string; address?: string | null; city?: string | null; state?: string | null; pincode?: string | null; pan_number?: string | null; gst_number?: string | null };
  cycle: { name: string; cycle_start: string; cycle_end: string };
  employee: { full_name: string; employee_code: string; designation?: string | null; department?: string | null; pan_number?: string | null; uan_number?: string | null; bank_account?: string | null; bank_ifsc?: string | null; bank_name?: string | null; joining_date?: string | null };
  totals: { working_days: number; payable_days: number; present_days: number; paid_leave_days: number; lop_days: number; week_offs: number; holidays: number };
  earnings: { code: string; name: string; amount: number }[];
  deductions: { code: string; name: string; amount: number }[];
  gross: number; total_deductions: number; net_pay: number;
};

const inr = (n: number) => `Rs. ${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

// Suppress font missing warnings (uses Helvetica built-in)
Font.registerHyphenationCallback((w) => [w]);

export function PayslipDocument({ data }: { data: PayslipData }) {
  const orgAddr = [data.organization.address, data.organization.city, data.organization.state, data.organization.pincode].filter(Boolean).join(", ");
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>{data.organization.name}</Text>
            {orgAddr ? <Text style={styles.small}>{orgAddr}</Text> : null}
            {data.organization.pan_number ? <Text style={styles.small}>PAN: {data.organization.pan_number}</Text> : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.small}>Payslip for</Text>
            <Text style={{ fontSize: 11, fontWeight: 700 }}>{data.cycle.name}</Text>
            <Text style={styles.small}>{fmt(data.cycle.cycle_start)} – {fmt(data.cycle.cycle_end)}</Text>
          </View>
        </View>

        <Text style={styles.title}>Salary Slip</Text>

        <View style={styles.empBox}>
          <View style={styles.col}>
            <View style={styles.row}><Text style={styles.label}>Name</Text><Text style={styles.value}>{data.employee.full_name}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Emp Code</Text><Text style={styles.value}>{data.employee.employee_code}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Department</Text><Text style={styles.value}>{data.employee.department || "—"}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Designation</Text><Text style={styles.value}>{data.employee.designation || "—"}</Text></View>
            {data.employee.joining_date ? <View style={styles.row}><Text style={styles.label}>Joined</Text><Text style={styles.value}>{fmt(data.employee.joining_date)}</Text></View> : null}
          </View>
          <View style={styles.col}>
            <View style={styles.row}><Text style={styles.label}>PAN</Text><Text style={styles.value}>{data.employee.pan_number || "—"}</Text></View>
            <View style={styles.row}><Text style={styles.label}>UAN</Text><Text style={styles.value}>{data.employee.uan_number || "—"}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Bank</Text><Text style={styles.value}>{data.employee.bank_name || "—"}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Account</Text><Text style={styles.value}>{data.employee.bank_account || "—"}</Text></View>
            <View style={styles.row}><Text style={styles.label}>IFSC</Text><Text style={styles.value}>{data.employee.bank_ifsc || "—"}</Text></View>
          </View>
          <View style={styles.col}>
            <View style={styles.row}><Text style={styles.label}>Working days</Text><Text style={styles.value}>{data.totals.working_days}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Payable days</Text><Text style={styles.value}>{data.totals.payable_days.toFixed(2)}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Present</Text><Text style={styles.value}>{data.totals.present_days.toFixed(1)}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Paid leave</Text><Text style={styles.value}>{data.totals.paid_leave_days.toFixed(1)}</Text></View>
            <View style={styles.row}><Text style={styles.label}>LOP</Text><Text style={styles.value}>{data.totals.lop_days.toFixed(1)}</Text></View>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={[styles.table, styles.half]}>
            <View style={styles.trH}><Text style={styles.td1}>Earnings</Text><Text style={styles.td2}>Amount</Text></View>
            {data.earnings.map((e) => (
              <View style={styles.tr} key={e.code}><Text style={styles.td1}>{e.name}</Text><Text style={styles.td2}>{inr(e.amount)}</Text></View>
            ))}
            <View style={styles.totalRow}><Text style={styles.td1}>Gross Earnings</Text><Text style={styles.td2}>{inr(data.gross)}</Text></View>
          </View>
          <View style={[styles.table, styles.half]}>
            <View style={styles.trH}><Text style={styles.td1}>Deductions</Text><Text style={styles.td2}>Amount</Text></View>
            {data.deductions.map((e) => (
              <View style={styles.tr} key={e.code}><Text style={styles.td1}>{e.name}</Text><Text style={styles.td2}>{inr(e.amount)}</Text></View>
            ))}
            <View style={styles.totalRow}><Text style={styles.td1}>Total Deductions</Text><Text style={styles.td2}>{inr(data.total_deductions)}</Text></View>
          </View>
        </View>

        <View style={styles.netBox}>
          <Text style={styles.netLabel}>Net pay for {data.cycle.name}</Text>
          <Text style={styles.netVal}>{inr(data.net_pay)}</Text>
        </View>
        <Text style={{ marginTop: 6, fontSize: 8, fontStyle: "italic", color: "#444" }}>
          Amount in words: {numberToWordsIndian(data.net_pay)}
        </Text>

        <Text style={styles.footer}>
          This is a system-generated payslip and does not require signature.
          Generated on {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}.
        </Text>
      </Page>
    </Document>
  );
}
