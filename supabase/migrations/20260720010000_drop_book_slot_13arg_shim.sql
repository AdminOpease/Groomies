-- Groomies · Drop the 13-argument book_slot shim
--
-- It existed only to keep the previously-deployed site booking while the
-- geo-fence build shipped. That build is live and verified, and nothing calls
-- the 13-arg form any more:
--   * the app caller sends p_postcode
--   * the test fixture sends p_postcode
--   * the live booking page renders the postcode field
--
-- Worth removing rather than leaving. PostgREST resolves overloads by argument
-- NAME, so a caller that forgot p_postcode would silently match the shim and
-- book with no postcode — which on a fenced location means bypassing the
-- geo-fence entirely. With the shim gone that mistake fails loudly (PGRST202)
-- instead of quietly letting through a booking the van can't reach.

drop function if exists public.book_slot(
  uuid, uuid, uuid, text, text, text, text, text, text, text, text, boolean, uuid[]
);
