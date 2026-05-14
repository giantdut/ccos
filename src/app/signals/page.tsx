"use client";

import { useEffect, useState, useCallback } from "react";

type SignalType =
  | "draft_rejected"
  | "draft_edit"
  | "schedule_item_rejected"
  | "brand_profile_override";

interface Signal {
  id: string;
  type: SignalType;
  payload: Record<string, unknown>;
  createdAt: string;
}

interface SignalAggregate {
  type: SignalType;
  count: number;
}

const SIGNAL_LABEL: Record<SignalType, string> = {
  draft_rejected: "Draft Rejected",
  draft_edit: "Draft Edit",
  schedule_item_rejected: "Schedule Item Rejected",
  brand_profile_override: "Brand Profile Override",
};

const WINDOW_OPTIONS: { label: string; days: number }[] = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

function sinceFromDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export default function SignalDashboard() {
  const [windowDays, setWindowDays] = useState(30);
  const [aggregates, setAggregates] = useState<SignalAggregate[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSignals = useCallback(async () => {
    try {
      const since = sinceFromDays(windowDays);
      const res = await fetch(
        `/api/signals?since=${encodeURIComponent(since)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        aggregates: SignalAggregate[];
        signals: Signal[];
      };
      setAggregates(data.aggregates);
      setSignals(data.signals);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [windowDays]);

  useEffect(() => {
    setLoading(true);
    void fetchSignals();
    const interval = setInterval(() => void fetchSignals(), 10_000);
    return () => clearInterval(interval);
  }, [fetchSignals]);

  const allTypes: SignalType[] = [
    "draft_edit",
    "draft_rejected",
    "schedule_item_rejected",
    "brand_profile_override",
  ];

  const aggregateMap = new Map(aggregates.map((a) => [a.type, a.count]));

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Signal Dashboard</h1>

      {/* Time window selector */}
      <div className="flex gap-2 mb-6">
        {WINDOW_OPTIONS.map((opt) => (
          <button
            key={opt.days}
            onClick={() => setWindowDays(opt.days)}
            className={`px-4 py-2 rounded text-sm font-medium border transition-colors ${
              windowDays === opt.days
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading && (
        <p className="text-gray-500 text-sm mb-4">Loading signals...</p>
      )}
      {error && (
        <p className="text-red-600 text-sm mb-4">Error: {error}</p>
      )}

      {/* Aggregate counts */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Aggregate Counts</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {allTypes.map((type) => (
            <div
              key={type}
              className="border border-gray-200 rounded-lg p-4 bg-gray-50"
            >
              <p className="text-xs text-gray-500 mb-1">
                {SIGNAL_LABEL[type]}
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {aggregateMap.get(type) ?? 0}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Recent signals list */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Recent Signals</h2>
        {signals.length === 0 && !loading ? (
          <p className="text-gray-500 text-sm">
            No signals recorded in this window.
          </p>
        ) : (
          <div className="space-y-2">
            {signals.map((signal) => (
              <div
                key={signal.id}
                className="border border-gray-200 rounded-lg p-4 bg-white"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    {SIGNAL_LABEL[signal.type] ?? signal.type}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(signal.createdAt).toLocaleString()}
                  </span>
                </div>
                <pre className="text-xs text-gray-600 bg-gray-50 rounded p-2 overflow-auto max-h-24">
                  {JSON.stringify(signal.payload, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
