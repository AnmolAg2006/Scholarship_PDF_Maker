"use client";

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import {
  ArrowRight, Check, CheckCircle2,
  Download, FileArchive, FileCheck2, FileText, Files, Info, LockKeyhole,
  RefreshCw, ShieldCheck, UploadCloud, X, AlertTriangle, Sparkles
} from "lucide-react";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";

type DocConfig = {
  id: string;
  title: string;
  description: string;
  kind: "fixed" | "optional-one" | "count";
  pages: number;
  enabled: boolean;
  count: number;
  required: boolean;
};

const initialDocs: DocConfig[] = [
  { id: "income", title: "Income Certificate", description: "1 page", kind: "fixed", pages: 1, enabled: true, count: 1, required: true },
  { id: "tuition-fees", title: "Fee Slips (Tuition / Exam)", description: "Optional", kind: "count", pages: 0, enabled: false, count: 1, required: false },
  { id: "domicile", title: "Domicile Certificate", description: "1 page", kind: "fixed", pages: 1, enabled: true, count: 1, required: true },
  { id: "gap", title: "Gap Certificate", description: "Optional", kind: "optional-one", pages: 1, enabled: false, count: 1, required: false },
  { id: "high-school", title: "High School Marksheet", description: "1 page", kind: "fixed", pages: 1, enabled: true, count: 1, required: true },
  { id: "university-marksheet", title: "Last Year University Marksheet/Profile Print", description: "1 page", kind: "fixed", pages: 1, enabled: true, count: 1, required: true },
  { id: "aadhaar", title: "Aadhaar Card", description: "1 page", kind: "fixed", pages: 1, enabled: true, count: 1, required: true },
  { id: "12th-marksheet", title: "12th Marksheet", description: "Optional", kind: "optional-one", pages: 1, enabled: true, count: 1, required: false },
  { id: "undertaking", title: "Undertaking", description: "Set pages (0 if none)", kind: "count", pages: 0, enabled: true, count: 1, required: true },
  { id: "application-form", title: "Application Form", description: "3 pages", kind: "fixed", pages: 3, enabled: true, count: 3, required: true },
  { id: "admission-form", title: "Admission Form", description: "Pre-uploaded on portal; skip", kind: "fixed", pages: 0, enabled: false, count: 0, required: false },
  { id: "hostel-fees", title: "Fee Slips (Hostel)", description: "Optional", kind: "count", pages: 0, enabled: false, count: 1, required: false },
];

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
const safeFileName = (name: string) =>
  name.toLowerCase().replace(/[()]/g, "").replace(/[/\\]+/g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".pdf";

export default function Home() {
  const [docs, setDocs] = useState<DocConfig[]>(initialDocs);
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ name: string; blob: Blob; pages: number; size: number }[]>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const fileInput = useRef<HTMLInputElement>(null);

  const activeDocs = useMemo(() => docs.filter(d => d.enabled && (d.kind !== "count" || d.count > 0)), [docs]);
  const requiredPages = useMemo(() => activeDocs.reduce((sum, d) => sum + (d.kind === "fixed" ? d.pages : d.count), 0), [activeDocs]);
  const pageRanges = useMemo(() => {
    let cursor = 1;
    return activeDocs.map(doc => {
      const count = doc.kind === "fixed" ? doc.pages : doc.count;
      const start = cursor;
      const end = cursor + count - 1;
      cursor = end + 1;
      return { ...doc, start, end, pageCount: count };
    });
  }, [activeDocs]);
  const exactMatch = totalPages !== null && totalPages === requiredPages;
  const enoughPages = totalPages !== null && totalPages >= requiredPages;

  async function inspectFile(nextFile: File | undefined) {
    setError(""); setSuccess(""); setGenerated([]);
    if (!nextFile) return;
    if (nextFile.type !== "application/pdf" && !nextFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file. Other file formats are not supported.");
      return;
    }
    if (nextFile.size > 100 * 1024 * 1024) {
      setError("This file is larger than 100 MB. Please compress it or split it into smaller PDFs first.");
      return;
    }
    setIsReading(true);
    try {
      const bytes = await nextFile.arrayBuffer();
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: false });
      if (pdf.isEncrypted) throw new Error("This PDF is password-protected. Please upload an unlocked PDF.");
      const pages = pdf.getPageCount();
      if (pages < 1) throw new Error("This PDF has no pages.");
      setFile(nextFile);
      setTotalPages(pages);
      setStep(2);
    } catch (e) {
      setFile(null); setTotalPages(null);
      const message = e instanceof Error ? e.message : "";
      setError(message.includes("encrypted") || message.toLowerCase().includes("password")
        ? "This PDF is password-protected. Please upload an unlocked PDF."
        : "We couldn't read this PDF. Make sure it opens correctly and isn't corrupted or password-protected.");
    } finally {
      setIsReading(false);
    }
  }

  function updateDoc(id: string, patch: Partial<DocConfig>) {
    setDocs(current => current.map(d => d.id === id ? { ...d, ...patch } : d));
    setGenerated([]);
    setError("");
    setSuccess("");
  }

  function resetAll() {
    setDocs(initialDocs.map(d => ({ ...d })));
    setFile(null); setTotalPages(null); setError(""); setSuccess("");
    setGenerated([]); setStep(1);
    if (fileInput.current) fileInput.current.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault(); setIsDragging(false);
    void inspectFile(event.dataTransfer.files?.[0]);
  }
  function onChoose(event: ChangeEvent<HTMLInputElement>) {
    void inspectFile(event.target.files?.[0]);
  }

  async function generatePdfs() {
    if (!file || totalPages === null) {
      setError("Upload your merged PDF first.");
      return;
    }
    if (!exactMatch) {
      setError(`Your merged PDF has ${totalPages} pages, but the selected document setup needs exactly ${requiredPages} pages. Please check the options and the prescribed order.`);
      return;
    }
    setIsGenerating(true); setError(""); setSuccess(""); setGenerated([]);
    try {
      const sourceBytes = await file.arrayBuffer();
      const source = await PDFDocument.load(sourceBytes);
      const outputs: { name: string; blob: Blob; pages: number; size: number }[] = [];
      for (const item of pageRanges) {
        const output = await PDFDocument.create();
        const indices = Array.from({ length: item.pageCount }, (_, i) => item.start - 1 + i);
        const copied = await output.copyPages(source, indices);
        copied.forEach(page => output.addPage(page));
        const bytes = await output.save();
        const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
        outputs.push({ name: safeFileName(item.title), blob, pages: item.pageCount, size: blob.size });
      }
      setGenerated(outputs);
      setSuccess(`Done! ${outputs.length} PDFs generated successfully. Your files stayed in this browser.`);
    } catch {
      setError("PDF generation failed. Please try another copy of the PDF and try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function downloadZip() {
    if (!generated.length) return;
    const zip = new JSZip();
    generated.forEach(item => zip.file(item.name, item.blob));
    const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 5 } });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "scholarship-documents.zip"; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadOne(item: { name: string; blob: Blob }) {
    const url = URL.createObjectURL(item.blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = item.name; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <main className="min-h-screen pb-12">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-700 text-white shadow-lg shadow-blue-200">
              <Files size={23} />
            </div>
            <div>
              <p className="text-base font-extrabold tracking-tight text-slate-900">Scholarship<span className="text-blue-700">PDF</span></p>
              <p className="text-xs font-medium text-slate-500">Document splitter · GLA scholarship workflow</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 sm:flex">
            <LockKeyhole size={14} /> Files stay on your device
          </div>
          <button onClick={resetAll} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
            <RefreshCw size={15} /> <span className="hidden sm:inline">Start over</span>
          </button>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-[#10265f] via-[#173d91] to-[#245bd5] text-white">
        <div className="absolute -right-24 -top-32 h-96 w-96 rounded-full bg-blue-300/10 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 h-96 w-96 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-6 px-4 py-7 sm:px-6 md:grid-cols-[1.3fr_0.7fr] md:items-center md:py-9 lg:px-8">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-50">
              <Sparkles size={14} /> Simple. Fast. Private.
            </div>
            <h1 className="max-w-2xl text-3xl font-black leading-tight tracking-tight sm:text-4xl">Split your scholarship PDF.</h1>
            <p className="mt-2 max-w-xl text-sm leading-5 text-blue-100">Upload one merged file. Get each document as a separate PDF.</p>
            <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium text-blue-100 sm:text-sm">
              <span className="flex items-center gap-2"><CheckCircle2 size={16} /> No account needed</span>
              <span className="flex items-center gap-2"><ShieldCheck size={16} /> Browser-based processing</span>
              <span className="flex items-center gap-2"><FileArchive size={16} /> Download as ZIP</span>
            </div>
          </div>
          <div className="hidden items-center justify-end gap-3 text-sm font-semibold text-blue-50 md:flex"><LockKeyhole size={17}/> Files stay on your device</div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-700"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50">1</span> Configure</div>
                <h2 className="mt-2 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Select your documents</h2>
                <p className="mt-1 text-sm text-slate-500">Optional documents can be skipped. Page ranges update automatically.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">{activeDocs.length} included</span>
            </div>
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 shrink-0 text-amber-700" size={18}/>
                <div className="text-sm leading-5 text-amber-950">
                  <p className="font-bold">Keep this order in your merged PDF.</p>
                  <p className="text-xs text-amber-900/80">Leave out skipped documents. The admission form is already on the portal.</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {docs.map((doc, index) => {
                const active = doc.enabled && (doc.kind !== "count" || doc.count > 0);
                const range = pageRanges.find(r => r.id === doc.id);
                const optional = !doc.required;
                return (
                  <div key={doc.id} className={`rounded-xl border px-3 py-2.5 transition ${active ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50/70"}`}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-400"}`}>
                        <span className="text-xs font-extrabold">{String(index + 1).padStart(2, "0")}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className={`text-sm font-bold ${active ? "text-slate-900" : "text-slate-500"}`}>{doc.title}</h3>
                          {doc.id === "application-form" && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">3 pages</span>}
                          {doc.id === "admission-form" && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">Pre-uploaded</span>}
                        </div>
                        <p className="text-[11px] text-slate-500">{doc.description}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        {doc.kind === "fixed" && doc.id !== "admission-form" && (
                          <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">{doc.pages} page{doc.pages === 1 ? "" : "s"}</span>
                        )}
                        {doc.kind === "optional-one" && (
                          <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${doc.enabled ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-600"}`}>
                            <input type="checkbox" className="h-4 w-4 accent-blue-700" checked={doc.enabled} onChange={e => updateDoc(doc.id, { enabled: e.target.checked })}/>
                            {doc.enabled ? "Included" : "Skip"}
                          </label>
                        )}
                        {doc.kind === "count" && (
                          <div className="flex items-center gap-2">
                            {optional && <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">
                              <input type="checkbox" className="h-4 w-4 accent-blue-700" checked={doc.enabled} onChange={e => updateDoc(doc.id, { enabled: e.target.checked })}/>
                              Include
                            </label>}
                            {doc.enabled && <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                              Pages
                              <input aria-label={`${doc.title} page count`} type="number" min={0} max={100} value={doc.count} onChange={e => {
                                const value = e.target.value === "" ? 0 : Math.max(0, Math.min(100, Number(e.target.value) || 0));
                                updateDoc(doc.id, { count: value });
                              }} className="w-16 rounded-xl border border-slate-200 bg-white px-2 py-2 text-center text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"/>
                            </label>}
                          </div>
                        )}
                        {range && <div className="min-w-[82px] rounded-xl bg-emerald-50 px-3 py-2 text-center">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">PDF pages</p>
                          <p className="mt-0.5 text-xs font-extrabold text-emerald-800">{range.start === range.end ? range.start : `${range.start}–${range.end}`}</p>
                        </div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-col gap-2 rounded-xl bg-slate-900 px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold">Expected merged PDF length</p>
                <p className="text-xs text-slate-300">Selected documents</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-2xl font-black">{requiredPages} <span className="text-sm font-semibold text-slate-300">pages</span></p>
                <p className="text-xs text-slate-300">{activeDocs.length} individual PDFs</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
            <div className="mb-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-700"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50">2</span> Upload & split</div>
              <h2 className="mt-2 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Upload merged PDF</h2>
              <p className="mt-1 text-sm text-slate-500">We check its page count before splitting it into documents.</p>
            </div>
            <input ref={fileInput} type="file" accept="application/pdf,.pdf" onChange={onChoose} className="hidden"/>
            <div onDragOver={e => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={onDrop}
              className={`rounded-2xl border-2 border-dashed p-6 text-center transition sm:p-9 ${isDragging ? "border-blue-500 bg-blue-50" : file ? "border-emerald-300 bg-emerald-50/50" : "border-slate-300 bg-slate-50/60 hover:border-blue-400 hover:bg-blue-50/40"}`}>
              <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${file ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                {isReading ? <RefreshCw className="animate-spin" size={25}/> : file ? <FileCheck2 size={27}/> : <UploadCloud size={27}/>}
              </div>
              <h3 className="mt-4 text-base font-extrabold text-slate-900">{isReading ? "Checking your PDF…" : file ? "PDF ready to process" : "Drag and drop your PDF here"}</h3>
              <p className="mt-1 text-sm text-slate-500">{file ? "Choose another file below if you need to replace it." : "Or choose a file from your device (PDF only, up to 100 MB)."}</p>
              <button type="button" disabled={isReading} onClick={() => fileInput.current?.click()} className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-800 disabled:opacity-60">
                <UploadCloud size={17}/> {file ? "Choose another PDF" : "Choose PDF"}
              </button>
            </div>

            {file && totalPages !== null && (
              <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600"><FileText size={22}/></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{file.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatBytes(file.size)} · {totalPages} pages detected</p>
                  </div>
                  <button onClick={() => { setFile(null); setTotalPages(null); setGenerated([]); if (fileInput.current) fileInput.current.value = ""; }} className="inline-flex items-center gap-1 self-start rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900 sm:self-center"><X size={14}/> Remove</button>
                </div>
                <div className={`mt-4 flex items-start gap-2 rounded-xl p-3 text-sm ${exactMatch ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
                  {exactMatch ? <CheckCircle2 size={18} className="mt-0.5 shrink-0"/> : <AlertTriangle size={18} className="mt-0.5 shrink-0"/>}
                  <div>
                    <p className="font-bold">{exactMatch ? "Page count matches" : "Page count needs attention"}</p>
                    <p className="mt-1 text-xs leading-5">{exactMatch
                      ? `All ${requiredPages} pages are accounted for. Check the ranges and then generate your PDFs.`
                      : `Your file has ${totalPages} pages; the current setup needs ${requiredPages}. ${totalPages > requiredPages ? "There are extra pages. Check whether an optional document was included or a page count is incorrect." : "Some pages are missing. Check page counts or whether an optional document should be included."}`}</p>
                  </div>
                </div>
              </div>
            )}

            {error && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertTriangle className="mt-0.5 shrink-0" size={17}/><p>{error}</p></div>}
            {success && <div role="status" className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 shrink-0" size={17}/><p>{success}</p></div>}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button onClick={generatePdfs} disabled={!file || !exactMatch || isGenerating || isReading} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none">
                {isGenerating ? <RefreshCw className="animate-spin" size={18}/> : <Files size={18}/>}
                {isGenerating ? "Generating PDFs…" : "Generate individual PDFs"}
                {!isGenerating && <ArrowRight size={17}/>}
              </button>
              {generated.length > 0 && <button onClick={() => void downloadZip()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-emerald-700"><Download size={18}/> Download all ZIP</button>}
            </div>
            <p className="mt-3 text-center text-xs leading-5 text-slate-400">Your PDF is processed locally in your browser. It is not sent to a server by this app.</p>
          </section>

          {generated.length > 0 && (
            <section className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-card sm:p-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700"><CheckCircle2 size={16}/> Completed</div>
                  <h2 className="mt-2 text-xl font-extrabold text-slate-900">Your documents are ready</h2>
                  <p className="mt-1 text-sm text-slate-500">{generated.length} separate PDF files generated.</p>
                </div>
                <button onClick={() => void downloadZip()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700"><FileArchive size={17}/> Download ZIP</button>
              </div>
              <div className="mt-5 space-y-2">
                {generated.map(item => (
                  <div key={item.name} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600"><FileText size={20}/></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">{item.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.pages} page{item.pages === 1 ? "" : "s"} · {formatBytes(item.size)}</p>
                    </div>
                    <button onClick={() => downloadOne(item)} aria-label={`Download ${item.name}`} className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"><Download size={17}/></button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

      </div>
      <footer className="mx-auto max-w-7xl px-4 pt-2 text-center text-xs text-slate-400 sm:px-6 lg:px-8">
        Scholarship PDF Maker · A browser-based utility for organizing scholarship documents
      </footer>
    </main>
  );
}
