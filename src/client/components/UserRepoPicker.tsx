import { useEffect, useMemo, useState } from "react";
import { api, type RepoPreview, type UserPreview } from "../api";
import { formatNumber } from "../utils";

type Props = {
  preview: UserPreview;
  onCancel: () => void;
  onDone: (added: number, skipped: number) => void;
};

export function UserRepoPicker({ preview, onCancel, onDone }: Props) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelected(new Set());
    setSearch("");
    setError(null);
  }, [preview.user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return preview.repos;
    return preview.repos.filter((repo) => {
      const hay = `${repo.owner}/${repo.name} ${repo.description ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [preview.repos, search]);

  const key = (r: RepoPreview) => `${r.owner}/${r.name}`;

  const toggle = (repo: RepoPreview) => {
    if (repo.already_watched) return;
    setSelected((prev) => {
      const next = new Set(prev);
      const k = key(repo);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const selectableInView = filtered.filter((r) => !r.already_watched);
  const allInViewSelected =
    selectableInView.length > 0 &&
    selectableInView.every((r) => selected.has(key(r)));

  const selectAllInView = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const r of selectableInView) next.add(key(r));
      return next;
    });
  };

  const clearAllInView = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const r of selectableInView) next.delete(key(r));
      return next;
    });
  };

  const submit = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      const repos = preview.repos
        .filter((r) => selected.has(key(r)))
        .map((r) => ({
          owner: r.owner,
          name: r.name,
          description: r.description,
          stars: r.stars,
          open_issues: r.open_issues,
        }));
      const res = await api.bulkAddRepos(repos);
      onDone(res.added, res.skipped);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const alreadyCount = preview.repos.filter((r) => r.already_watched).length;
  const totalSelectable = preview.repos.length - alreadyCount;

  return (
    <div className="mt-3 border border-[var(--color-ink-3)] bg-[var(--color-ink-1)]">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--color-ink-3)] bg-[var(--color-ink-2)]">
        <span className="font-pixel uppercase text-xs text-[var(--color-accent)] tracking-wider">
          {preview.user}
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-4)]">
          {preview.total} repos · {alreadyCount} ya vigilados
        </span>
        <button
          onClick={onCancel}
          className="ml-auto font-pixel uppercase text-[10px] text-[var(--color-fg-3)] hover:text-[var(--color-danger)] transition-colors"
          title="cerrar"
        >
          ✕ close
        </button>
      </div>

      <div className="flex items-stretch border-b border-[var(--color-ink-3)]">
        <span className="px-3 py-2 text-[var(--color-fg-4)] font-mono text-sm select-none">
          ⌕
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="filtrar por nombre o descripción..."
          className="flex-1 bg-transparent border-0 outline-none text-[var(--color-fg-1)] font-mono text-sm py-2 placeholder:text-[var(--color-fg-4)]"
          spellCheck={false}
          autoComplete="off"
          autoFocus
        />
        <button
          type="button"
          onClick={allInViewSelected ? clearAllInView : selectAllInView}
          disabled={selectableInView.length === 0}
          className="font-pixel uppercase text-[10px] px-3 border-l border-[var(--color-ink-3)] text-[var(--color-fg-2)] hover:text-[var(--color-accent)] transition-colors disabled:opacity-40"
        >
          {allInViewSelected ? "clear view" : "select view"}
        </button>
      </div>

      <ul className="max-h-80 overflow-y-auto divide-y divide-[var(--color-ink-3)]">
        {filtered.length === 0 ? (
          <li className="p-5 text-center text-sm text-[var(--color-fg-3)]">
            <span className="text-[var(--color-fg-4)]">[ </span>
            ningún repo coincide con "{search}"
            <span className="text-[var(--color-fg-4)]"> ]</span>
          </li>
        ) : (
          filtered.map((repo) => {
            const k = key(repo);
            const checked = selected.has(k);
            return (
              <li
                key={k}
                className={`flex items-center gap-3 px-4 py-2 group ${
                  repo.already_watched
                    ? "opacity-50"
                    : "hover:bg-[var(--color-ink-2)] cursor-pointer"
                }`}
                onClick={() => toggle(repo)}
              >
                <input
                  type="checkbox"
                  checked={repo.already_watched || checked}
                  disabled={repo.already_watched}
                  onChange={() => toggle(repo)}
                  onClick={(e) => e.stopPropagation()}
                  className="accent-[var(--color-accent)] cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm text-[var(--color-fg-1)] truncate">
                    <span className="text-[var(--color-fg-3)]">
                      {repo.owner}
                    </span>
                    <span className="text-[var(--color-fg-4)]">/</span>
                    <span>{repo.name}</span>
                    {repo.fork && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-[var(--color-fg-4)]">
                        fork
                      </span>
                    )}
                    {repo.archived && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-[var(--color-warn)]">
                        archived
                      </span>
                    )}
                    {repo.already_watched && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-[var(--color-accent)]">
                        ✓ watched
                      </span>
                    )}
                  </div>
                  {repo.description && (
                    <div className="text-xs text-[var(--color-fg-3)] truncate">
                      {repo.description}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--color-fg-3)] shrink-0">
                  <span title="stars" className="flex items-center gap-1">
                    <span className="text-[var(--color-fg-4)]">★</span>
                    {formatNumber(repo.stars)}
                  </span>
                  <span title="open issues" className="flex items-center gap-1">
                    <span className="text-[var(--color-fg-4)]">●</span>
                    {formatNumber(repo.open_issues)}
                  </span>
                </div>
              </li>
            );
          })
        )}
      </ul>

      <div className="flex items-center gap-3 px-4 py-2.5 border-t border-[var(--color-ink-3)] bg-[var(--color-ink-2)] flex-wrap">
        <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-4)]">
          {selected.size} / {totalSelectable} seleccionados
          {search && ` · ${filtered.length} visibles`}
        </span>
        {error && (
          <span className="text-xs font-mono text-[var(--color-danger)]">
            {error}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="font-pixel uppercase text-[10px] px-3 py-1.5 border border-[var(--color-ink-3)] text-[var(--color-fg-2)] hover:border-[var(--color-ink-4)] transition-colors disabled:opacity-40"
          >
            cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || selected.size === 0}
            className="font-pixel uppercase text-[10px] px-3 py-1.5 border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-ink-0)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "..." : `watch ${selected.size}`}
          </button>
        </div>
      </div>
    </div>
  );
}
