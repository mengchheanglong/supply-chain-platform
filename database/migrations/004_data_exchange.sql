CREATE TABLE public.sc_integration_commands (
 tenant_id uuid NOT NULL REFERENCES public.sc_tenants(id),idempotency_key uuid NOT NULL,
 action text NOT NULL CHECK(action IN ('mapping','import','export')),fingerprint text NOT NULL,
 source_system text NOT NULL CHECK(length(source_system) BETWEEN 1 AND 80),
 external_id text NOT NULL CHECK(length(external_id) BETWEEN 1 AND 160),result jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(tenant_id,idempotency_key),
 UNIQUE(tenant_id,action,source_system,external_id)
);
CREATE TABLE public.sc_source_mappings (
 id uuid PRIMARY KEY,tenant_id uuid NOT NULL,entity text NOT NULL CHECK(entity IN ('facility','sku')),
 source_system text NOT NULL,source_external_id text NOT NULL CHECK(length(source_external_id) BETWEEN 1 AND 160),
 facility_id uuid,sku_id uuid,actor_id uuid NOT NULL,idempotency_key uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((entity='facility' AND facility_id IS NOT NULL AND sku_id IS NULL) OR (entity='sku' AND sku_id IS NOT NULL AND facility_id IS NULL)),
 UNIQUE(tenant_id,entity,source_system,source_external_id),
 FOREIGN KEY(tenant_id,facility_id) REFERENCES public.sc_facilities(tenant_id,id),
 FOREIGN KEY(tenant_id,sku_id) REFERENCES public.sc_skus(tenant_id,id),
 FOREIGN KEY(actor_id,tenant_id) REFERENCES public.sc_api_keys(id,tenant_id),
 FOREIGN KEY(tenant_id,idempotency_key) REFERENCES public.sc_integration_commands DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE public.sc_exchange_documents (
 id uuid PRIMARY KEY,tenant_id uuid NOT NULL,kind text NOT NULL CHECK(kind IN ('import','export')),
 state text NOT NULL CHECK(state IN ('validated','rejected','exported')),document jsonb NOT NULL,
 actor_id uuid NOT NULL,idempotency_key uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id),UNIQUE(tenant_id,idempotency_key),
 FOREIGN KEY(actor_id,tenant_id) REFERENCES public.sc_api_keys(id,tenant_id),
 FOREIGN KEY(tenant_id,idempotency_key) REFERENCES public.sc_integration_commands DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE public.sc_import_record_identities (
 tenant_id uuid NOT NULL,source_system text NOT NULL,record_id text NOT NULL,
 document_id uuid NOT NULL,PRIMARY KEY(tenant_id,source_system,record_id),
 FOREIGN KEY(tenant_id,document_id) REFERENCES public.sc_exchange_documents(tenant_id,id)
);
CREATE INDEX sc_mapping_pages ON public.sc_source_mappings(tenant_id,id);
CREATE INDEX sc_exchange_pages ON public.sc_exchange_documents(tenant_id,id);
ALTER TABLE public.sc_audit_events DROP CONSTRAINT sc_audit_events_entity_type_check;
ALTER TABLE public.sc_audit_events ADD CHECK(entity_type IN ('facility','sku','inventory_movement','reservation','order','allocation','shipment','source_mapping','exchange_document'));
ALTER TABLE public.sc_audit_events DROP CONSTRAINT sc_audit_events_action_check;
ALTER TABLE public.sc_audit_events ADD CHECK(action IN ('created','received','reserved','released','consumed','ordered','allocated','picked','packed','cancelled','dispatched','delivered','mapped','validated','rejected','exported'));
ALTER TABLE public.sc_audit_events ADD COLUMN integration_command_key uuid;
ALTER TABLE public.sc_audit_events ADD FOREIGN KEY(tenant_id,integration_command_key) REFERENCES public.sc_integration_commands DEFERRABLE INITIALLY DEFERRED;
DO $$
DECLARE table_name text;
BEGIN
 FOREACH table_name IN ARRAY ARRAY['sc_integration_commands','sc_source_mappings','sc_exchange_documents','sc_import_record_identities'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
  EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',table_name);
  EXECUTE format($policy$CREATE POLICY %I ON public.%I USING(tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid) WITH CHECK(tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid)$policy$,table_name||'_tenant',table_name);
  EXECUTE format('CREATE TRIGGER history_guard BEFORE UPDATE OR DELETE OR TRUNCATE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.sc_reject_inventory_changes()',table_name);
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='snapshot_reader') THEN EXECUTE format('REVOKE ALL ON public.%I FROM snapshot_reader',table_name); END IF;
 END LOOP;
END $$;
