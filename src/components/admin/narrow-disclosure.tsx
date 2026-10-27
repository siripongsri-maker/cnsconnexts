import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Display only: on narrow screens the children sit behind a native `<details>` disclosure, so a long
 * toolbar folds to one line. On wider screens the children render as they are, with no wrapper.
 * The children (and their handlers) are the same element tree in both cases.
 */
export function NarrowDisclosure({
  narrow,
  label,
  icon,
  className,
  children,
}: {
  narrow: boolean;
  label: string;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  if (!narrow) return <>{children}</>;
  return (
    <details className={`admin-disclosure ${className ?? ""}`}>
      <summary>
        {icon}
        <span>{label}</span>
        <ChevronDown className="admin-disclosure-chevron size-4" aria-hidden="true" />
      </summary>
      <div className="admin-disclosure-body">{children}</div>
    </details>
  );
}
