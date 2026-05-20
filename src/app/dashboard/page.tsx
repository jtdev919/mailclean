"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

interface SenderInfo {
  email: string;
  name: string;
  count: number;
  messageIds: string[];
}

interface CategoryInfo {
  label: string;
  description: string;
  count: number;
  messageIds: string[];
}

type Tab = "senders" | "cleanup";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("senders");
  const [senders, setSenders] = useState<SenderInfo[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [selectedSenders, setSelectedSenders] = useState<Set<string>>(
    new Set()
  );
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sendersRes, categoriesRes] = await Promise.all([
        fetch("/api/gmail?action=senders"),
        fetch("/api/gmail?action=categories"),
      ]);

      if (sendersRes.ok) setSenders(await sendersRes.json());
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) fetchData();
  }, [session, fetchData]);

  const toggleSender = (email: string) => {
    setSelectedSenders((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const toggleCategory = (label: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const selectAllSenders = () => {
    if (selectedSenders.size === senders.length) {
      setSelectedSenders(new Set());
    } else {
      setSelectedSenders(new Set(senders.map((s) => s.email)));
    }
  };

  const getSelectedMessageIds = (): string[] => {
    if (tab === "senders") {
      return senders
        .filter((s) => selectedSenders.has(s.email))
        .flatMap((s) => s.messageIds);
    }
    return categories
      .filter((c) => selectedCategories.has(c.label))
      .flatMap((c) => c.messageIds);
  };

  const handleDelete = async () => {
    const ids = getSelectedMessageIds();
    if (ids.length === 0) return;

    const confirmed = window.confirm(
      `Move ${ids.length.toLocaleString()} email${ids.length === 1 ? "" : "s"} to trash?`
    );
    if (!confirmed) return;

    setDeleting(true);
    setDeleteResult(null);
    setDeleteProgress({ done: 0, total: ids.length });

    const batchSize = 1000;
    let totalDeleted = 0;

    try {
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const res = await fetch("/api/gmail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageIds: batch }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setDeleteResult(
            `Deleted ${totalDeleted.toLocaleString()} of ${ids.length.toLocaleString()} emails before an error occurred. ${err.error || "Please try again for the rest."}`
          );
          return;
        }

        const data = await res.json();
        totalDeleted += data.deleted;
        setDeleteProgress({ done: totalDeleted, total: ids.length });
      }

      setDeleteResult(
        `${totalDeleted.toLocaleString()} emails moved to trash.`
      );
      setSelectedSenders(new Set());
      setSelectedCategories(new Set());
      await fetchData();
    } finally {
      setDeleting(false);
      setDeleteProgress(null);
    }
  };

  const selectedCount = getSelectedMessageIds().length;

  if (status === "loading" || !session) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">MailClean</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {session.user?.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("senders")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              tab === "senders"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
            }`}
          >
            Top Senders
          </button>
          <button
            onClick={() => setTab("cleanup")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              tab === "cleanup"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
            }`}
          >
            Quick Cleanup
          </button>
        </div>

        {deleteResult && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            {deleteResult}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-3">
              <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <p className="text-sm text-gray-500">
                Scanning your inbox&hellip;
              </p>
            </div>
          </div>
        ) : tab === "senders" ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Top Senders
                </h2>
                <p className="text-sm text-gray-500">
                  Select senders and delete all their emails at once.
                </p>
              </div>
              {senders.length > 0 && (
                <button
                  onClick={selectAllSenders}
                  className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  {selectedSenders.size === senders.length
                    ? "Deselect all"
                    : "Select all"}
                </button>
              )}
            </div>

            {senders.length === 0 ? (
              <p className="text-gray-500 py-8 text-center">
                No messages found in your inbox.
              </p>
            ) : (
              <div className="bg-white rounded-lg shadow ring-1 ring-gray-200 divide-y divide-gray-100">
                {senders.map((sender) => (
                  <label
                    key={sender.email}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSenders.has(sender.email)}
                      onChange={() => toggleSender(sender.email)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {sender.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {sender.email}
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                      {sender.count} email{sender.count !== 1 && "s"}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Quick Cleanup
              </h2>
              <p className="text-sm text-gray-500">
                Select categories to clean up in one click.
              </p>
            </div>

            {categories.length === 0 ? (
              <p className="text-gray-500 py-8 text-center">
                No junk categories found — your inbox is looking clean!
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {categories.map((cat) => (
                  <label
                    key={cat.label}
                    className={`relative flex items-start gap-4 rounded-lg bg-white p-4 shadow ring-1 cursor-pointer transition-all ${
                      selectedCategories.has(cat.label)
                        ? "ring-blue-600 bg-blue-50"
                        : "ring-gray-200 hover:ring-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.has(cat.label)}
                      onChange={() => toggleCategory(cat.label)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {cat.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {cat.description}
                      </p>
                      <p className="text-sm font-medium text-blue-600 mt-2">
                        {cat.count} email{cat.count !== 1 && "s"}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {(selectedCount > 0 || deleteProgress) && (
          <div className="sticky bottom-0 mt-6 pb-6">
            <div className="bg-white rounded-lg shadow-lg ring-1 ring-gray-200 px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">
                  {deleteProgress ? (
                    <>
                      Deleting&hellip;{" "}
                      <span className="font-semibold">
                        {deleteProgress.done.toLocaleString()}
                      </span>{" "}
                      of{" "}
                      <span className="font-semibold">
                        {deleteProgress.total.toLocaleString()}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold">
                        {selectedCount.toLocaleString()}
                      </span>{" "}
                      email{selectedCount !== 1 && "s"} selected
                    </>
                  )}
                </span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {deleting ? "Deleting..." : "Move to Trash"}
                </button>
              </div>
              {deleteProgress && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.round((deleteProgress.done / deleteProgress.total) * 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
