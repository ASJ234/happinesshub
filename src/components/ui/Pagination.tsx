import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { chipButtonClass } from "./styles";
import { pageHref, type Paging } from "@/lib/paging";

interface PaginationProps {
  paging: Paging;
  hasNext: boolean;
}

/** Previous / next links under a paged listing. Renders nothing on a single page. */
export function Pagination({ paging, hasNext }: PaginationProps) {
  const { page } = paging;
  if (page <= 1 && !hasNext) return null;

  return (
    <nav aria-label="Pages" className="flex items-center justify-center gap-3 pt-2">
      {page > 1 ? (
        <Link href={pageHref(paging, page - 1)} className={chipButtonClass}>
          <ChevronLeft size={14} />
          Previous
        </Link>
      ) : (
        <span className={`${chipButtonClass} opacity-40`} aria-hidden>
          <ChevronLeft size={14} />
          Previous
        </span>
      )}
      <span className="text-xs text-muted">Page {page}</span>
      {hasNext ? (
        <Link href={pageHref(paging, page + 1)} className={chipButtonClass}>
          Next
          <ChevronRight size={14} />
        </Link>
      ) : (
        <span className={`${chipButtonClass} opacity-40`} aria-hidden>
          Next
          <ChevronRight size={14} />
        </span>
      )}
    </nav>
  );
}
