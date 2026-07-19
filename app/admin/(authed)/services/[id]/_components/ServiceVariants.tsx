"use client";

import { useActionState } from "react";
import {
  createVariant,
  updateVariant,
  deleteVariant,
  type VariantState,
} from "../../actions";

export type Variant = {
  id: string;
  label: string;
  price_cents: number;
  price_from: boolean;
  sort_order: number;
};

const initial: VariantState = { ok: true };

const input =
  "block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent";

export function ServiceVariants({
  serviceId,
  variants,
}: {
  serviceId: string;
  variants: Variant[];
}) {
  return (
    <section className="mt-12 border-t border-stone-200 pt-8 max-w-2xl">
      <h2 className="text-lg font-semibold text-stone-900">Size tiers</h2>
      <p className="mt-1 text-sm text-stone-500">
        For services priced by dog size. Add a row per size and customers pick
        theirs when booking — the price they choose is what gets recorded.
        Leave this empty to keep a single flat price.
      </p>

      {variants.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {variants.map((v) => (
            <li
              key={v.id}
              className="rounded-xl border border-stone-200 bg-white p-4"
            >
              <VariantRow serviceId={serviceId} variant={v} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 rounded-xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
          No sizes yet — this service uses its single price above.
        </p>
      )}

      <AddVariant serviceId={serviceId} nextSort={(variants.length + 1) * 10} />
    </section>
  );
}

function VariantRow({
  serviceId,
  variant,
}: {
  serviceId: string;
  variant: Variant;
}) {
  const save = updateVariant.bind(null, variant.id, serviceId);
  const remove = deleteVariant.bind(null, variant.id, serviceId);
  const [state, saveAction, saving] = useActionState(save, initial);
  const [delState, deleteAction, deleting] = useActionState(remove, initial);

  return (
    <div className="space-y-3">
      <form action={saveAction} className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[9rem]">
          <label className="block text-xs font-medium text-stone-600 mb-1">
            Size label
          </label>
          <input
            name="label"
            type="text"
            required
            defaultValue={variant.label}
            className={input}
          />
        </div>
        <div className="w-28">
          <label className="block text-xs font-medium text-stone-600 mb-1">
            Price (pence)
          </label>
          <input
            name="price_pence"
            type="number"
            min="1"
            required
            defaultValue={variant.price_cents}
            className={input}
          />
        </div>
        <div className="w-20">
          <label className="block text-xs font-medium text-stone-600 mb-1">
            Order
          </label>
          <input
            name="sort_order"
            type="number"
            defaultValue={variant.sort_order}
            className={input}
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-stone-700 select-none cursor-pointer">
          <input
            type="checkbox"
            name="price_from"
            defaultChecked={variant.price_from}
            className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
          />
          “From”
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </form>

      <form action={deleteAction}>
        <button
          type="submit"
          disabled={deleting}
          className="text-xs text-red-700 hover:text-red-800 underline underline-offset-2 disabled:opacity-50"
        >
          {deleting ? "Removing…" : "Remove this size"}
        </button>
      </form>

      <Message state={state} />
      <Message state={delState} />
    </div>
  );
}

function AddVariant({
  serviceId,
  nextSort,
}: {
  serviceId: string;
  nextSort: number;
}) {
  const create = createVariant.bind(null, serviceId);
  const [state, action, pending] = useActionState(create, initial);

  return (
    <form
      action={action}
      className="mt-6 rounded-xl border border-stone-200 bg-stone-50 p-4"
    >
      <p className="text-sm font-medium text-stone-800 mb-3">Add a size</p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[9rem]">
          <label className="block text-xs font-medium text-stone-600 mb-1">
            Size label
          </label>
          <input
            name="label"
            type="text"
            required
            placeholder="Small dogs"
            className={input}
          />
        </div>
        <div className="w-28">
          <label className="block text-xs font-medium text-stone-600 mb-1">
            Price (pence)
          </label>
          <input
            name="price_pence"
            type="number"
            min="1"
            required
            placeholder="4500"
            className={input}
          />
        </div>
        <div className="w-20">
          <label className="block text-xs font-medium text-stone-600 mb-1">
            Order
          </label>
          <input
            name="sort_order"
            type="number"
            defaultValue={nextSort}
            className={input}
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-stone-700 select-none cursor-pointer">
          <input
            type="checkbox"
            name="price_from"
            className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
          />
          “From”
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-stone-800 hover:bg-stone-900 disabled:bg-stone-400 text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          {pending ? "Adding…" : "Add size"}
        </button>
      </div>
      <Message state={state} />
    </form>
  );
}

function Message({ state }: { state: VariantState }) {
  if (!state.message) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={
        state.ok
          ? "text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5"
          : "text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5"
      }
    >
      {state.message}
    </p>
  );
}
