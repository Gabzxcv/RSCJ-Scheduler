"use client";

export function PrintButton({ children = "Print / save as PDF" }: { children?: React.ReactNode }) {
  return <button className="button secondary print-control" type="button" onClick={() => window.print()}>{children}</button>;
}
