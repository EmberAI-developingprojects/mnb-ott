import { cn } from "@/lib/utils";

export function Table({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className={cn("w-full text-sm", className)}>{children}</table>
      </div>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-bg border-b border-border">
      <tr>{children}</tr>
    </thead>
  );
}

export function TH({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn("text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted", className)}>
      {children}
    </th>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-border">{children}</tbody>;
}

export function TR({ children, className, onClick }: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr onClick={onClick}
      className={cn("transition-colors", onClick && "cursor-pointer hover:bg-bg", className)}>
      {children}
    </tr>
  );
}

export function TD({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 text-fg", className)}>{children}</td>;
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-surface border border-dashed border-border rounded-lg py-12 text-center text-sm text-muted">
      {message}
    </div>
  );
}
