"use client";

import { useState, useMemo, useEffect } from "react";
import {
  FileText,
  Download,
  Plus,
  Trash2,
  RefreshCw,
  ClipboardPaste,
  Upload,
  Sparkles,
  AlertCircle,
  Check,
  ChevronDown,
} from "lucide-react";
import Papa from "papaparse";

// Demo data so users can click "Try with sample data" and see how it works
const DEMO_CAMPAIGNS = [
  { campaign: "[LATAM] Million Dollar Live Trading Season 1 (2026) - Leads", impressions: 269, amount: 9.21 },
  { campaign: "[LATAM] Million Dollar Live Trading Season 1 (2026) - Leads", impressions: 429, amount: 20.18, notes: "Retargeting" },
  { campaign: "[LATAM] Million Dollar Live Trading Season 1 (2026) - Leads", impressions: 2165, amount: 84.91, notes: "Retargeting" },
  { campaign: "[TH] Million Dollar Live Trading Season 1 (2026) - Leads", impressions: 2056, amount: 32.81, notes: "New LP" },
  { campaign: "[TH] Million Dollar Live Trading Season 1 (2026) - Leads", impressions: 6910, amount: 283.35, notes: "Copy" },
  { campaign: "[ID] Million Dollar Live Trading Season 1 (2026) - Leads", impressions: 10091, amount: 88.51 },
  { campaign: "[ID] Million Dollar Live Trading Season 1 (2026) - Leads", impressions: 39385, amount: 357.09, notes: "Copy" },
  { campaign: "[LATAM] 50% Credit Bonus – Leads", impressions: 1681, amount: 77.12, notes: "Copy 2" },
  { campaign: "[LATAM] 50% Credit Bonus – Leads", impressions: 2923, amount: 93.50 },
  { campaign: "[LATAM] 50% Credit Bonus – Leads", impressions: 2547, amount: 96.07, notes: "Copy" },
];

// Storage key for persisting form state (no DB — just localStorage)
const STORAGE_KEY = "wetrade_receipt_form_v1";

export default function ReceiptGeneratorPage() {
  // === Identity fields ===
  const [accountName, setAccountName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [reference, setReference] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");

  // === Date range + financial ===
  const today = new Date();
  const fourteenAgo = new Date(today);
  fourteenAgo.setDate(today.getDate() - 14);
  const isoDate = (d) => d.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(isoDate(fourteenAgo));
  const [endDate, setEndDate] = useState(isoDate(today));
  const [currency, setCurrency] = useState("MYR");
  const [exchangeRate, setExchangeRate] = useState("1"); // amounts already in target currency by default
  const [taxRatePct, setTaxRatePct] = useState("8");

  // === Campaign rows ===
  const [campaigns, setCampaigns] = useState([
    { id: crypto.randomUUID(), campaign: "", impressions: "", amount: "", notes: "" },
  ]);

  // === UI state ===
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  // === Persist form state to localStorage so refresh doesn't wipe everything ===
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const data = JSON.parse(saved);
      if (data.accountName) setAccountName(data.accountName);
      if (data.accountId) setAccountId(data.accountId);
      if (data.paymentMethod) setPaymentMethod(data.paymentMethod);
      if (data.reference) setReference(data.reference);
      if (data.transactionId) setTransactionId(data.transactionId);
      if (data.invoiceNo) setInvoiceNo(data.invoiceNo);
      if (data.currency) setCurrency(data.currency);
      if (data.exchangeRate) setExchangeRate(data.exchangeRate);
      if (data.taxRatePct) setTaxRatePct(data.taxRatePct);
    } catch (e) {
      // ignore parse errors
    }
  }, []);

  useEffect(() => {
    // Only persist identity + financial settings (not campaign rows — those are per-receipt)
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          accountName, accountId, paymentMethod, reference, transactionId, invoiceNo,
          currency, exchangeRate, taxRatePct,
        })
      );
    } catch (e) {
      // ignore storage errors (private mode, etc.)
    }
  }, [accountName, accountId, paymentMethod, reference, transactionId, invoiceNo, currency, exchangeRate, taxRatePct]);

  // === Computed totals for the live preview ===
  const preview = useMemo(() => {
    const validRows = campaigns.filter((r) => r.campaign && parseFloat(r.amount) > 0);
    const subtotal = validRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const rate = parseFloat(exchangeRate) || 1;
    const taxAmount = subtotal * ((parseFloat(taxRatePct) || 0) / 100);
    const total = subtotal + taxAmount;
    const groupCount = new Set(validRows.map((r) => r.campaign.trim())).size;
    return {
      rowCount: validRows.length,
      groupCount,
      subtotal: subtotal * rate,
      taxAmount: taxAmount * rate,
      total: total * rate,
      symbol: currency,
    };
  }, [campaigns, exchangeRate, taxRatePct, currency]);

  const fmt = (n) => `${preview.symbol} ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

  // === Campaign row handlers ===
  const addRow = () => {
    setCampaigns((rows) => [
      ...rows,
      { id: crypto.randomUUID(), campaign: "", impressions: "", amount: "", notes: "" },
    ]);
  };

  const updateRow = (id, field, value) => {
    setCampaigns((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const removeRow = (id) => {
    setCampaigns((rows) => (rows.length === 1 ? rows : rows.filter((r) => r.id !== id)));
  };

  const clearAllRows = () => {
    if (!confirm("Clear all campaign rows?")) return;
    setCampaigns([{ id: crypto.randomUUID(), campaign: "", impressions: "", amount: "", notes: "" }]);
  };

  const loadDemoData = () => {
    setCampaigns(
      DEMO_CAMPAIGNS.map((d) => ({
        id: crypto.randomUUID(),
        campaign: d.campaign,
        impressions: String(d.impressions),
        amount: String(d.amount),
        notes: d.notes || "",
      }))
    );
  };

  // File upload handler — reads the file and pipes its text into the same
  // parser that handles paste.
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result || "");
      processCSV(text);
    };
    reader.readAsText(file);
    e.target.value = ""; // reset so re-uploading the same file works
  };

  // === CSV/TSV parser ===
  // Accepts comma or tab separated. Auto-detects column order.
  // Recognizes both simple headers (campaign, impressions, amount) and Meta Ads
  // Manager's actual export headers ("Campaign name", "Amount spent (MYR)", etc.).
  const processCSV = (text) => {
    if (!text.trim()) return;
    try {
      // Detect delimiter: if more tabs than commas in first line, use tab
      const firstLine = text.split("\n")[0];
      const tabCount = (firstLine.match(/\t/g) || []).length;
      const commaCount = (firstLine.match(/,/g) || []).length;
      const delimiter = tabCount > commaCount ? "\t" : ",";

      const parsed = Papa.parse(text.trim(), {
        delimiter,
        skipEmptyLines: true,
      });

      const rows = parsed.data;
      if (!rows.length) {
        alert("No data found.");
        return;
      }

      // Detect header row (lenient — looks for any cell containing key terms)
      const firstRow = rows[0].map((c) => String(c).toLowerCase().trim());
      const hasHeader = firstRow.some((c) =>
        c.includes("campaign") || c.includes("impression") ||
        c.includes("amount") || c.includes("spend") || c.includes("spent") ||
        c === "name"
      );

      let dataRows = hasHeader ? rows.slice(1) : rows;
      let columnMap = { campaign: 0, impressions: 1, amount: 2, notes: 3 };

      if (hasHeader) {
        // First match wins — order matters. Each helper finds the first cell
        // matching any of the given predicates, in priority order.
        const find = (...preds) => {
          for (const pred of preds) {
            const i = firstRow.findIndex(pred);
            if (i >= 0) return i;
          }
          return -1;
        };
        columnMap = {
          campaign: find(
            (h) => h === "campaign name" || h === "campaign_name",
            (h) => h.includes("campaign") && h.includes("name"),
            (h) => h === "campaign" || h === "name" || h === "ad set name",
            (h) => h.includes("campaign"),
          ),
          impressions: find(
            (h) => h === "impressions" || h === "impr",
            (h) => h.includes("impression"),
          ),
          amount: find(
            (h) => h.startsWith("amount spent"),
            (h) => h === "amount" || h === "spend" || h === "spent",
            (h) => h.includes("amount") && !h.includes("budget"),
          ),
          notes: find(
            (h) => h === "notes" || h === "note" || h === "ad set name",
          ),
        };
      }

      const newRows = dataRows
        .filter((r) => r[columnMap.campaign])
        .map((r) => ({
          id: crypto.randomUUID(),
          campaign: String(r[columnMap.campaign] || "").trim(),
          impressions: columnMap.impressions >= 0 ? String(r[columnMap.impressions] || "").replace(/[,\s]/g, "") : "",
          amount: columnMap.amount >= 0 ? String(r[columnMap.amount] || "").replace(/[^0-9.\-]/g, "") : "",
          notes: columnMap.notes >= 0 ? String(r[columnMap.notes] || "").trim() : "",
        }))
        .filter((r) => r.campaign && parseFloat(r.amount) > 0);

      if (!newRows.length) {
        alert(
          "Couldn't parse any rows. The CSV needs a campaign-name column and an amount-spent column with values > 0."
        );
        return;
      }

      setCampaigns(newRows);
      setPasteText("");
      setShowPasteArea(false);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2000);
    } catch (err) {
      alert("Parse error: " + (err?.message || err));
    }
  };

  // Paste button — delegates to processCSV with the textarea contents
  const handlePaste = () => processCSV(pasteText);


  // === Generate ===
  const generateRandomRef = () => Math.random().toString(36).slice(2, 12).toUpperCase();
  // Meta transaction IDs are two 17-digit numbers joined by a dash, e.g.
  // 26486742894346480-26465751236445638. Generate that format.
  const generateRandomTxn = () => {
    const rand17 = () => Math.floor(Math.random() * 9e16 + 1e16).toString();
    return `${rand17()}-${rand17()}`;
  };
  const generateRandomInvoice = () => `FBADS-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900000000) + 100000000}`;

  const handleGenerate = async () => {
    const validRows = campaigns.filter((r) => r.campaign.trim() && parseFloat(r.amount) > 0);
    if (validRows.length === 0) {
      alert("Add at least one campaign row with a valid amount.");
      return;
    }

    setBusy(true);
    try {
      // Convert form rows into the entry shape that meta-receipt.js expects.
      // We need: { date, account, campaign, impressions, amount, notes }.
      // Date is taken from the form (all entries get endDate as their date —
      // doesn't actually matter since the receipt groups by campaign, not date).
      const entries = validRows.map((r) => ({
        date: endDate,
        account: accountName || "all",
        campaign: r.campaign.trim(),
        impressions: parseFloat(r.impressions) || 0,
        amount: parseFloat(r.amount) || 0,
        notes: r.notes?.trim() || "",
      }));

      // Build the config shape that meta-receipt.js expects
      const config = {
        receiptAccountName: accountName.trim(),
        receiptAccountId: accountId.trim(),
        receiptPaymentMethod: paymentMethod.trim(),
        receiptReference: reference.trim(),
        receiptTransactionId: transactionId.trim(),
        receiptInvoiceNo: invoiceNo.trim(),
      };

      const { generateMetaReceipt } = await import("../lib/meta-receipt");
      await generateMetaReceipt({
        entries,
        config,
        startDate,
        endDate,
        accountFilter: "all", // we already filtered server-side via the entries we built
        currency,
        exchangeRate: parseFloat(exchangeRate) || 1,
        taxRatePct: parseFloat(taxRatePct) || 0,
      });
    } catch (err) {
      alert("Failed to generate PDF: " + (err?.message || err));
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 md:py-12">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Meta Receipt Generator</h1>
              <p className="text-xs md:text-sm text-slate-400 mt-0.5">
                Generate Meta-style invoice PDFs from campaign data · No data stored
              </p>
            </div>
          </div>
          <button
            onClick={loadDemoData}
            className="text-xs px-3 py-2 rounded-lg glass glass-hover text-slate-300 flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            Try with sample data
          </button>
        </div>

        {/* Main grid: 2 columns on desktop, 1 on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* === LEFT COLUMN — form === */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account info */}
            <section className="glass rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-cyan-400 rounded-full" />
                Account Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-slate-400 mb-1 block">Account Name</label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="e.g. we trade 1"
                    className="input-base"
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-slate-400 mb-1 block">Account ID</label>
                  <input
                    type="text"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    placeholder="e.g. 317689061347612"
                    className="input-base font-mono-num"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[11px] uppercase tracking-wider text-slate-400 mb-1 block">Payment Method</label>
                  <input
                    type="text"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    placeholder="e.g. MasterCard ···· 9313"
                    className="input-base"
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                    <span>Reference Number</span>
                    <button
                      onClick={() => setReference(generateRandomRef())}
                      className="text-cyan-400 hover:text-cyan-300 text-[10px] font-normal normal-case tracking-normal"
                    >
                      ↻ random
                    </button>
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Auto if blank"
                    className="input-base font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                    <span>Transaction ID</span>
                    <button
                      onClick={() => setTransactionId(generateRandomTxn())}
                      className="text-cyan-400 hover:text-cyan-300 text-[10px] font-normal normal-case tracking-normal"
                    >
                      ↻ random
                    </button>
                  </label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Auto if blank"
                    className="input-base font-mono-num"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[11px] uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                    <span>Invoice Number</span>
                    <button
                      onClick={() => setInvoiceNo(generateRandomInvoice())}
                      className="text-cyan-400 hover:text-cyan-300 text-[10px] font-normal normal-case tracking-normal"
                    >
                      ↻ random
                    </button>
                  </label>
                  <input
                    type="text"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    placeholder="e.g. FBADS-413-105786618"
                    className="input-base font-mono"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-3">
                These fields are saved locally in your browser, so you don't have to re-enter every time.
              </p>
            </section>

            {/* Date + currency + tax */}
            <section className="glass rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-violet-400 rounded-full" />
                Date Range & Financials
              </h2>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-slate-400 mb-1 block">Start date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={endDate}
                    className="input-base"
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-slate-400 mb-1 block">End date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="input-base"
                  />
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap mb-4">
                {[
                  { label: "Last 7d", days: 7 },
                  { label: "Last 14d", days: 14 },
                  { label: "Last 30d", days: 30 },
                  { label: "MTD", mtd: true },
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() => {
                      const end = new Date();
                      let start;
                      if (p.mtd) start = new Date(end.getFullYear(), end.getMonth(), 1);
                      else {
                        start = new Date(end);
                        start.setDate(end.getDate() - p.days);
                      }
                      setStartDate(isoDate(start));
                      setEndDate(isoDate(end));
                    }}
                    className="px-3 py-1 rounded-md text-[11px] font-medium bg-slate-900/40 text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-slate-400 mb-1 block">Currency</label>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="input-base">
                    <option value="MYR">MYR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-slate-400 mb-1 block">Exchange rate</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    placeholder="1"
                    className="input-base font-mono-num"
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-slate-400 mb-1 block">SST (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={taxRatePct}
                    onChange={(e) => setTaxRatePct(e.target.value)}
                    className="input-base font-mono-num"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Use exchange rate &gt; 1 if your campaign amounts are in USD but you want the receipt in MYR.
                Leave at 1 if amounts are already in target currency.
              </p>
            </section>

            {/* Campaign rows */}
            <section className="glass rounded-xl p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="w-1 h-4 bg-emerald-400 rounded-full" />
                  Campaign Entries
                  <span className="text-[11px] font-normal text-slate-500">({campaigns.filter((r) => r.campaign).length})</span>
                </h2>
                <div className="flex gap-2 flex-wrap">
                  <label
                    className="text-[11px] px-2.5 py-1.5 rounded-md bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1.5 cursor-pointer"
                    title="Upload a CSV file exported from Meta Ads Manager"
                  >
                    <Upload className="w-3 h-3" />
                    Upload CSV
                    <input
                      type="file"
                      accept=".csv,.tsv,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={() => setShowPasteArea((v) => !v)}
                    className="text-[11px] px-2.5 py-1.5 rounded-md bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center gap-1.5"
                  >
                    <ClipboardPaste className="w-3 h-3" />
                    Paste CSV
                  </button>
                  <button
                    onClick={clearAllRows}
                    className="text-[11px] px-2.5 py-1.5 rounded-md bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border border-pink-500/30 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear
                  </button>
                </div>
              </div>

              {/* Paste area (collapsible) */}
              {showPasteArea && (
                <div className="mb-4 p-3 bg-slate-900/40 border border-slate-800/60 rounded-lg">
                  <p className="text-[11px] text-slate-400 mb-2">
                    Paste CSV/TSV or upload a file. Works with Meta Ads Manager exports
                    (columns like "Campaign name", "Amount spent (MYR)", "Impressions")
                    or simple <span className="font-mono">campaign,impressions,amount</span> format.
                  </p>
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder={`campaign,impressions,amount\n[LATAM] Million Dollar...,269,9.21\n[TH] Million Dollar...,2056,32.81`}
                    rows={5}
                    className="input-base font-mono text-xs resize-y"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => { setPasteText(""); setShowPasteArea(false); }}
                      className="text-xs px-3 py-1.5 text-slate-400 hover:text-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePaste}
                      disabled={!pasteText.trim()}
                      className="text-xs px-3 py-1.5 rounded-md bg-violet-500 hover:bg-violet-400 text-slate-950 font-semibold disabled:opacity-40"
                    >
                      Parse & Import
                    </button>
                  </div>
                </div>
              )}

              {/* Campaign rows table */}
              <div className="space-y-2">
                {/* Header */}
                <div className="hidden md:grid grid-cols-12 gap-2 px-2 text-[10px] uppercase tracking-wider text-slate-500">
                  <div className="col-span-5">Campaign Name</div>
                  <div className="col-span-2 text-right">Impressions</div>
                  <div className="col-span-2 text-right">Amount</div>
                  <div className="col-span-2">Notes (sub-label)</div>
                  <div className="col-span-1"></div>
                </div>

                {campaigns.map((row) => (
                  <div key={row.id} className="grid grid-cols-12 gap-2 items-start">
                    <input
                      type="text"
                      value={row.campaign}
                      onChange={(e) => updateRow(row.id, "campaign", e.target.value)}
                      placeholder="[LATAM] Million Dollar..."
                      className="input-base text-sm col-span-12 md:col-span-5"
                    />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={row.impressions}
                      onChange={(e) => updateRow(row.id, "impressions", e.target.value)}
                      placeholder="0"
                      className="input-base text-sm font-mono-num text-right col-span-4 md:col-span-2"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.amount}
                      onChange={(e) => updateRow(row.id, "amount", e.target.value)}
                      placeholder="0.00"
                      className="input-base text-sm font-mono-num text-right col-span-4 md:col-span-2"
                    />
                    <input
                      type="text"
                      value={row.notes}
                      onChange={(e) => updateRow(row.id, "notes", e.target.value)}
                      placeholder="Optional"
                      className="input-base text-sm col-span-3 md:col-span-2"
                    />
                    <button
                      onClick={() => removeRow(row.id)}
                      disabled={campaigns.length === 1}
                      className="col-span-1 p-2 rounded-md text-slate-500 hover:text-pink-400 hover:bg-pink-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                      title="Remove row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addRow}
                className="mt-3 w-full py-2 border border-dashed border-slate-700 rounded-lg text-slate-400 hover:text-cyan-300 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-colors text-sm flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add row
              </button>
            </section>
          </div>

          {/* === RIGHT COLUMN — preview + generate === */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              <section className="glass rounded-xl p-5">
                <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 bg-amber-400 rounded-full" />
                  Receipt Preview
                </h2>

                {/* Mini stats */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="p-2.5 bg-slate-900/40 rounded-lg border border-slate-800/40">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">Rows</div>
                    <div className="text-base font-semibold text-slate-200 mt-0.5 font-mono-num">{preview.rowCount}</div>
                  </div>
                  <div className="p-2.5 bg-slate-900/40 rounded-lg border border-slate-800/40">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">Campaigns</div>
                    <div className="text-base font-semibold text-slate-200 mt-0.5 font-mono-num">{preview.groupCount}</div>
                  </div>
                </div>

                {/* Totals */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-mono-num text-slate-300">{fmt(preview.subtotal)}</span>
                  </div>
                  {preview.taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">SST ({taxRatePct}%)</span>
                      <span className="font-mono-num text-amber-300">{fmt(preview.taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-slate-800/60">
                    <span className="text-white font-medium">Total</span>
                    <span className="font-mono-num text-emerald-300 font-bold text-base">{fmt(preview.total)}</span>
                  </div>
                </div>

                {preview.rowCount === 0 && (
                  <div className="mt-4 bg-pink-500/10 border border-pink-500/30 rounded-lg p-3 text-xs text-pink-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Add at least one campaign with an amount to generate.</span>
                  </div>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={busy || preview.rowCount === 0}
                  className="mt-5 w-full py-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                >
                  {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {busy ? "Generating..." : "Generate Receipt PDF"}
                </button>
              </section>

              {/* Help / tips card */}
              <section className="glass rounded-xl p-4">
                <h3 className="text-xs font-semibold text-slate-300 mb-2">💡 Tips</h3>
                <ul className="text-[11px] text-slate-400 space-y-1.5 leading-relaxed">
                  <li>• Account info auto-saves locally — no server stores your data</li>
                  <li>• Multiple rows with the same campaign name are grouped on the PDF</li>
                  <li>• Use the [GEO] prefix in campaign names like Meta does (e.g. <code className="text-cyan-300">[TH]</code>)</li>
                  <li>• Notes appear as sub-labels under each entry on the PDF</li>
                  <li>• ↻ random buttons are useful for filling test data</li>
                </ul>
              </section>
            </div>
          </div>
        </div>

        {/* Saved toast */}
        {savedToast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-4 py-2 rounded-lg text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/10 animate-in fade-in slide-in-from-bottom-2">
            <Check className="w-4 h-4" />
            Imported successfully
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-slate-800/40 text-center">
          <p className="text-[11px] text-slate-600">
            Receipt generator runs entirely in your browser · No server-side data storage
          </p>
        </footer>
      </div>
    </div>
  );
}