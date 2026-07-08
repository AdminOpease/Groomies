"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type Location = { id: string; name: string };

export function BookingsFilters({ locations }: { locations: Location[] }) {
  const router = useRouter();
  const search = useSearchParams();
  const [pending, startTransition] = useTransition();

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(Array.from(search.entries()));
    if (!value) next.delete(key);
    else next.set(key, value);
    startTransition(() => {
      router.push(`/admin/bookings?${next.toString()}`);
    });
  };

  const status = search.get("status") ?? "active";
  const location = search.get("location") ?? "";
  const range = search.get("range") ?? "week";

  return (
    <div className="flex flex-wrap items-end gap-3 mb-6">
      <Group label="When">
        <Select value={range} onChange={(v) => setParam("range", v)} disabled={pending}>
          <option value="today">Today</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
          <option value="all_future">All upcoming</option>
          <option value="past">Past</option>
        </Select>
      </Group>
      <Group label="Status">
        <Select value={status} onChange={(v) => setParam("status", v)} disabled={pending}>
          <option value="active">Active (pending + confirmed)</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
          <option value="all">All</option>
        </Select>
      </Group>
      {locations.length > 0 ? (
        <Group label="Location">
          <Select
            value={location}
            onChange={(v) => setParam("location", v)}
            disabled={pending}
          >
            <option value="">All locations</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </Group>
      ) : null}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-xs text-stone-600">
      <span className="block mb-1 font-medium text-stone-700">{label}</span>
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  disabled,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
    >
      {children}
    </select>
  );
}
