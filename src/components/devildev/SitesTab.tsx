import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Globe2, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  adminDeleteSite,
  adminListSites,
  adminSaveSite,
  type SiteStatus,
  type SupportedSite,
} from "@/lib/sites.functions";
import { more } from "@/lib/i18n-more";
import type { Lang } from "@/lib/i18n";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Draft = {
  id?: string;
  name: string;
  domain_or_pattern: string;
  status: SiteStatus;
  category: string;
  display_order: number;
  is_visible: boolean;
};

const empty: Draft = {
  name: "",
  domain_or_pattern: "",
  status: "available",
  category: "",
  display_order: 0,
  is_visible: true,
};

const field =
  "min-h-11 w-full rounded-xl border border-input bg-background px-3 text-xs outline-none focus:border-foreground";

/** Admin CRUD for the public supported-websites list. */
export function SitesTab({ lang, btn, btnSolid }: { lang: Lang; btn: string; btnSolid: string }) {
  const m = more[lang];
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [term, setTerm] = useState("");

  const list = useServerFn(adminListSites);
  const save = useServerFn(adminSaveSite);
  const remove = useServerFn(adminDeleteSite);

  const sites = useQuery({ queryKey: ["admin-sites"], queryFn: () => list({}) });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-sites"] });
    void qc.invalidateQueries({ queryKey: ["supported-sites"] });
  };

  const saveMutation = useMutation({
    mutationFn: (row: Draft) => save({ data: row }),
    onSuccess: () => {
      setDraft(null);
      refresh();
      toast.success(m.sitesTitle);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: refresh,
    onError: (error: Error) => toast.error(error.message),
  });

  const rows = useMemo(() => {
    const data = sites.data ?? [];
    const q = term.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (s) => s.name.toLowerCase().includes(q) || s.domain_or_pattern.toLowerCase().includes(q),
    );
  }, [sites.data, term]);

  const toDraft = (site: SupportedSite): Draft => ({
    id: site.id,
    name: site.name,
    domain_or_pattern: site.domain_or_pattern,
    status: site.status,
    category: site.category ?? "",
    display_order: site.display_order ?? 0,
    is_visible: site.is_visible,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setDraft({ ...empty })} className={btnSolid}>
          <Plus className="mr-1 inline h-3 w-3" /> {m.siteAdd}
        </button>
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={m.sitesSearch}
          aria-label={m.sitesSearch}
          className={`${field} sm:max-w-xs`}
        />
      </div>

      {draft ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate(draft);
          }}
          className="space-y-3 rounded-2xl border border-border bg-card p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-[11px] font-semibold text-muted-foreground">
              {m.siteName}
              <input
                required
                maxLength={80}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className={field}
              />
            </label>
            <label className="space-y-1.5 text-[11px] font-semibold text-muted-foreground">
              {m.siteDomain}
              <input
                required
                maxLength={160}
                value={draft.domain_or_pattern}
                onChange={(e) => setDraft({ ...draft, domain_or_pattern: e.target.value })}
                className={`${field} font-mono`}
              />
            </label>
            <label className="space-y-1.5 text-[11px] font-semibold text-muted-foreground">
              {m.siteStatus}
              <select
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as SiteStatus })}
                className={field}
              >
                <option value="available">{m.statusAvailable}</option>
                <option value="maintenance">{m.statusMaintenance}</option>
                <option value="disabled">{m.statusDisabled}</option>
              </select>
            </label>
            <label className="space-y-1.5 text-[11px] font-semibold text-muted-foreground">
              {m.siteCategory}
              <input
                maxLength={40}
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                className={field}
              />
            </label>
            <label className="space-y-1.5 text-[11px] font-semibold text-muted-foreground">
              {m.siteOrder}
              <input
                type="number"
                min={0}
                max={9999}
                value={draft.display_order}
                onChange={(e) => setDraft({ ...draft, display_order: Number(e.target.value) || 0 })}
                className={field}
              />
            </label>
            <label className="flex items-center gap-2 pt-5 text-[11px] font-semibold text-muted-foreground">
              <input
                type="checkbox"
                checked={draft.is_visible}
                onChange={(e) => setDraft({ ...draft, is_visible: e.target.checked })}
                className="h-4 w-4 accent-foreground"
              />
              {m.siteVisible}
            </label>
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={saveMutation.isPending} className={btnSolid}>
              <Save className="mr-1 inline h-3 w-3" /> {m.siteSave}
            </button>
            <button type="button" onClick={() => setDraft(null)} className={btn}>
              <X className="mr-1 inline h-3 w-3" /> {m.siteCancel}
            </button>
          </div>
        </form>
      ) : null}

      <div className="space-y-2">
        {sites.isLoading ? (
          <div className="h-16 animate-pulse rounded-2xl border border-border bg-card" />
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">{m.sitesEmpty}</p>
        ) : (
          rows.map((site) => (
            <div
              key={site.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background">
                  {site.logo_url ? (
                    <img
                      src={site.logo_url}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="h-6 w-6 rounded-md"
                    />
                  ) : (
                    <Globe2 className="h-4 w-4 text-muted-foreground" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold">
                    {site.name}
                    {!site.is_visible ? (
                      <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                        {m.siteHidden}
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate font-mono text-[10px] text-muted-foreground">
                    {site.domain_or_pattern} · #{site.display_order}
                    {site.category ? ` · ${site.category}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-border px-2 py-1 text-[10px] font-semibold">
                  {site.status === "available"
                    ? m.statusAvailable
                    : site.status === "maintenance"
                      ? m.statusMaintenance
                      : m.statusDisabled}
                </span>
                <button type="button" onClick={() => setDraft(toDraft(site))} className={btn}>
                  {m.siteEdit}
                </button>
                <AlertDialog>
                  <AlertDialogTrigger
                    aria-label={m.siteDeleteTitle}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-destructive/40 text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{m.siteDeleteTitle}</AlertDialogTitle>
                      <AlertDialogDescription>{m.siteDeleteBody}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{m.siteCancel}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate(site.id)}>
                        <Trash2 className="mr-1 h-3 w-3" /> {m.siteDelete}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
