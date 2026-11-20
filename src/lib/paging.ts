/** Where a paged listing is and how to link to its other pages. */
export interface Paging {
  /** 1-based page number. */
  page: number;
  /** The listing's path, e.g. "/dashboard/explore". */
  basePath: string;
  /** Other query parameters to keep on every page link, e.g. a search. */
  query?: Record<string, string>;
  /** Element id to scroll back to, for a listing partway down the page. */
  anchor?: string;
}

/** Deep pages are slow to fetch and nobody browses that far. */
const MAX_PAGE = 500;

/** Reads a `?page=` value, falling back to 1 for anything invalid. */
export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.min(page, MAX_PAGE);
}

export function pageHref({ basePath, query, anchor }: Paging, page: number): string {
  const params = new URLSearchParams(query);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  const hash = anchor ? `#${anchor}` : "";
  return `${search ? `${basePath}?${search}` : basePath}${hash}`;
}
