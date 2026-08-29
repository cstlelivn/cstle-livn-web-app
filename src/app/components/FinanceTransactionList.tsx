import { useState } from "react";
import { ArrowUpRight, Trash2 } from "lucide-react";
import { formatDate } from "../src/lib/dates";

export default function FinanceTransactionList({ transactions, categoryLabel, formatCurrency, onOpen, onDelete }: { transactions: any[]; categoryLabel: (category: string) => string; formatCurrency: (amount: number) => string; onOpen: (transaction: any) => void; onDelete: (id: string, event: React.MouseEvent) => void }) {
  const [widths, setWidths] = useState([120, 290, 180, 230, 100, 140, 120, 92]);
  const template = `${widths[0]}px minmax(${widths[1]}px,1.55fr) ${widths[2]}px minmax(${widths[3]}px,1.15fr) ${widths[4]}px ${widths[5]}px ${widths[6]}px ${widths[7]}px`;
  const labels = ["Date", "Description", "Category", "Project", "Type", "Amount", "Status", "Actions"];
  const minWidth = widths.reduce((total, width) => total + width, 0) + (widths.length - 1) * 16 + 32;

  const resize = (index: number, event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const initial = [...widths];
    const move = (next: PointerEvent) => {
      const delta = next.clientX - startX;
      const adjusted = Math.max(84 - initial[index], Math.min(delta, initial[index + 1] - 84));
      setWidths(initial.map((width, column) => column === index ? width + adjusted : column === index + 1 ? width - adjusted : width));
    };
    const end = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", end); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  };

  return <div className="overflow-x-auto rounded-[14px] border border-black/[0.07] bg-card shadow-[0_14px_36px_rgba(25,25,25,0.06)]">
    <div className="grid w-full gap-4 border-b border-black/[0.07] bg-[#f4f5ef] px-4 py-2.5" style={{ gridTemplateColumns: template, minWidth }}>{labels.map((label, index) => <div key={label} className="relative min-w-0"><p className={`truncate font-['Roboto_Mono'] text-[9px] font-bold uppercase tracking-[0.06em] text-muted-foreground ${label === "Amount" || label === "Actions" ? "text-right" : ""}`}>{label}</p>{index < labels.length - 1 && <button type="button" onPointerDown={(event) => resize(index, event)} className="absolute -right-2 top-1/2 h-7 w-3 -translate-y-1/2 cursor-col-resize touch-none rounded-full bg-[#65733d]/10 opacity-30 transition-opacity hover:opacity-100" aria-label={`Resize ${label} column`} />}</div>)}</div>
    {transactions.map((transaction) => <div key={transaction.id} role="button" tabIndex={0} onClick={() => onOpen(transaction)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onOpen(transaction); }} className="grid w-full cursor-pointer items-center gap-4 border-b border-black/[0.055] px-4 py-2.5 transition-colors hover:bg-[#f7f8f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#65733d] last:border-b-0" style={{ gridTemplateColumns: template, minWidth }}>
      <p className="truncate text-[10px] text-muted-foreground">{formatDate(transaction.date)}</p>
      <div className="min-w-0"><p className="truncate text-[12px] font-semibold text-[#191919]">{transaction.description || "Untitled transaction"}</p><p className="mt-0.5 truncate font-['Roboto_Mono'] text-[8px] uppercase text-muted-foreground">{transaction.recipient_or_vendor || transaction.payment_method || "No recipient recorded"}</p></div>
      <p className="truncate text-[10px] text-muted-foreground">{categoryLabel(transaction.category)}</p>
      <p className="truncate text-[10px] font-medium text-[#303030]">{transaction.project?.title || "General"}</p>
      <span className={`w-fit rounded-full px-2 py-1 text-[9px] font-medium ${transaction.type === "income" ? "bg-[#eef1e3] text-[#53602f]" : "bg-black/[0.055] text-[#4a4a4a]"}`}>{transaction.type === "income" ? "Income" : "Expense"}</span>
      <p className={`truncate text-right text-[11px] font-semibold tabular-nums ${transaction.type === "income" ? "text-[#53602f]" : "text-[#4a4a4a]"}`}>{transaction.type === "income" ? "+" : "−"}{formatCurrency(Number(transaction.amount || 0))}</p>
      <span className="block truncate rounded-full border border-black/[0.08] px-2 py-1 text-center text-[9px] text-muted-foreground">{transaction.status || "Unknown"}</span>
      <div className="flex items-center justify-end gap-1 border-l border-black/[0.07] pl-2"><button type="button" onClick={(event) => { event.stopPropagation(); onOpen(transaction); }} className="flex h-8 items-center gap-1 rounded-md px-2 font-['Roboto_Mono'] text-[9px] font-bold text-[#53602f] hover:bg-[#eef1e3]" aria-label={`Open ${transaction.description}`}>View <ArrowUpRight className="size-3" /></button><button type="button" onClick={(event) => onDelete(transaction.id, event)} className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Delete ${transaction.description}`}><Trash2 className="size-3.5" /></button></div>
    </div>)}
  </div>;
}
