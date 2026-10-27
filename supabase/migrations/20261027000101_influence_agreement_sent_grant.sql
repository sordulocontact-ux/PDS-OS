-- Page loads audit (27/10/2026): 20261026400301 added the sending of an
-- express agreement (sent_at, sent_by, sent_channel) without granting their
-- reading, the table being granted column by column (token_hash is never
-- read by a client). Every render of a project failed on « permission
-- denied » in loadModuleFacts and the Activations facts were missing.
grant select (sent_at, sent_by, sent_channel) on public.influence_agreements to authenticated;
