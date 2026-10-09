CREATE TABLE public.sc_planning_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.sc_tenants(id),
  idempotency_key uuid NOT NULL,
  actor_id uuid NOT NULL,
  source_system text NOT NULL CHECK(length(source_system) BETWEEN 1 AND 80),
  external_id text NOT NULL CHECK(length(external_id) BETWEEN 1 AND 160),
  manifest_version int NOT NULL CHECK(manifest_version = 1),
  manifest_sha256 text NOT NULL CHECK(length(manifest_sha256) = 64),
  content_sha256 text NOT NULL CHECK(length(content_sha256) = 64),
  generated_at timestamptz NOT NULL,
  approved_at timestamptz NOT NULL,
  notes text,
  manifest jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, id),
  UNIQUE(tenant_id, idempotency_key),
  UNIQUE(tenant_id, source_system, external_id),
  FOREIGN KEY(actor_id, tenant_id) REFERENCES public.sc_api_keys(id, tenant_id),
  FOREIGN KEY(tenant_id, idempotency_key) REFERENCES public.sc_integration_commands DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE public.sc_snapshot_artifacts (
  tenant_id uuid NOT NULL REFERENCES public.sc_tenants(id),
  snapshot_id uuid NOT NULL,
  artifact_name text NOT NULL CHECK(length(artifact_name) BETWEEN 1 AND 64),
  file_name text NOT NULL CHECK(length(file_name) BETWEEN 1 AND 160),
  media_type text NOT NULL CHECK(length(media_type) BETWEEN 1 AND 64),
  content_sha256 text NOT NULL CHECK(length(content_sha256) = 64),
  row_count int NOT NULL CHECK(row_count >= 0),
  byte_size int NOT NULL CHECK(byte_size >= 0),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, snapshot_id, artifact_name),
  FOREIGN KEY(tenant_id, snapshot_id) REFERENCES public.sc_planning_snapshots(tenant_id, id)
);

CREATE INDEX sc_snapshot_pages ON public.sc_planning_snapshots(tenant_id, id);

ALTER TABLE public.sc_integration_commands DROP CONSTRAINT sc_integration_commands_action_check;
ALTER TABLE public.sc_integration_commands ADD CHECK(action IN ('mapping','import','export','snapshot'));

ALTER TABLE public.sc_audit_events DROP CONSTRAINT sc_audit_events_entity_type_check;
ALTER TABLE public.sc_audit_events ADD CHECK(entity_type IN ('facility','sku','inventory_movement','reservation','order','allocation','shipment','source_mapping','exchange_document','planning_snapshot'));

ALTER TABLE public.sc_audit_events DROP CONSTRAINT sc_audit_events_action_check;
ALTER TABLE public.sc_audit_events ADD CHECK(action IN ('created','received','reserved','released','consumed','ordered','allocated','picked','packed','cancelled','dispatched','delivered','mapped','validated','rejected','exported','snapshot_approved'));

DO $$
DECLARE table_name text;
BEGIN
 FOREACH table_name IN ARRAY ARRAY['sc_planning_snapshots','sc_snapshot_artifacts'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
  EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',table_name);
  EXECUTE format($policy$CREATE POLICY %I ON public.%I USING(tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid) WITH CHECK(tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid)$policy$,table_name||'_tenant',table_name);
  EXECUTE format('CREATE TRIGGER history_guard BEFORE UPDATE OR DELETE OR TRUNCATE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.sc_reject_inventory_changes()',table_name);
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='snapshot_reader') THEN
   EXECUTE format('GRANT SELECT ON public.%I TO snapshot_reader',table_name);
  END IF;
 END LOOP;
END $$;
