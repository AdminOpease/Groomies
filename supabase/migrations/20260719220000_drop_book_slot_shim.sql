-- Groomies · Drop the book_slot compatibility shim
--
-- The 12-argument signature existed only to keep the previously-deployed site
-- booking while the add-on build shipped. That build is now live and verified:
--   * the only app caller (book/[slotId]/actions.ts) sends p_addon_service_ids
--   * every test goes through validBookingArgs, which sends it too
--   * the live booking page renders the add-on checkboxes
--
-- So nothing calls the 12-arg form any more and it is safe to remove. Leaving
-- it would be a quiet trap: a future caller that forgot p_addon_service_ids
-- would silently resolve to the shim and book with no extras rather than
-- failing loudly.
--
-- PostgREST resolves overloads by argument NAME, so after this drop a call
-- missing p_addon_service_ids errors with PGRST202 instead of half-working.

drop function if exists public.book_slot(
  uuid, uuid, uuid, text, text, text, text, text, text, text, text, boolean
);
