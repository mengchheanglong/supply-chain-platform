-- Add tenant-safe reference keys without rewriting applied migration 001.
ALTER TABLE public.sc_facilities ADD CONSTRAINT sc_facilities_tenant_id UNIQUE(tenant_id,id);
ALTER TABLE public.sc_skus ADD CONSTRAINT sc_skus_tenant_id UNIQUE(tenant_id,id);
ALTER TABLE public.sc_skus ADD CONSTRAINT sc_skus_stock_metadata UNIQUE(tenant_id,id,unit,quantity_precision);
CREATE TABLE public.sc_inventory_commands (
  tenant_id uuid NOT NULL REFERENCES public.sc_tenants(id),
  idempotency_key uuid NOT NULL,
  action text NOT NULL CHECK(action IN ('receive','reserve','release','ship')),
  fingerprint text NOT NULL,
  source_system text NOT NULL CHECK(length(source_system) BETWEEN 1 AND 80),
  external_id text NOT NULL CHECK(length(external_id) BETWEEN 1 AND 160),
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(tenant_id,idempotency_key),
  UNIQUE(tenant_id,action,source_system,external_id)
);
CREATE TABLE public.sc_inventory_balances (
  tenant_id uuid NOT NULL,
  facility_id uuid NOT NULL,
  sku_id uuid NOT NULL,
  unit text NOT NULL,
  quantity_precision integer NOT NULL,
  on_hand numeric(18,0) NOT NULL DEFAULT 0 CHECK(on_hand >= 0),
  reserved numeric(18,0) NOT NULL DEFAULT 0 CHECK(reserved >= 0 AND reserved <= on_hand),
  PRIMARY KEY(tenant_id,facility_id,sku_id),
  FOREIGN KEY(tenant_id,facility_id) REFERENCES public.sc_facilities(tenant_id,id),
  FOREIGN KEY(tenant_id,sku_id,unit,quantity_precision) REFERENCES public.sc_skus(tenant_id,id,unit,quantity_precision)
);
CREATE TABLE public.sc_inventory_reservations (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  facility_id uuid NOT NULL,
  sku_id uuid NOT NULL,
  quantity numeric(18,0) NOT NULL CHECK(quantity > 0),
  state text NOT NULL CHECK(state IN ('active','released','consumed')),
  source_system text NOT NULL CHECK(length(source_system) BETWEEN 1 AND 80),
  external_id text NOT NULL CHECK(length(external_id) BETWEEN 1 AND 160),
  actor_id uuid NOT NULL,
  idempotency_key uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,id), UNIQUE(tenant_id,id,facility_id,sku_id), UNIQUE(tenant_id,source_system,external_id),
  FOREIGN KEY(tenant_id,facility_id,sku_id) REFERENCES public.sc_inventory_balances,
  FOREIGN KEY(actor_id,tenant_id) REFERENCES public.sc_api_keys(id,tenant_id),
  FOREIGN KEY(tenant_id,idempotency_key) REFERENCES public.sc_inventory_commands DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX sc_inventory_active_reservations ON public.sc_inventory_reservations(tenant_id,facility_id,sku_id) WHERE state='active';
CREATE INDEX sc_inventory_reservation_pages ON public.sc_inventory_reservations(tenant_id,facility_id,sku_id,id);
CREATE TABLE public.sc_inventory_movements (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  facility_id uuid NOT NULL,
  sku_id uuid NOT NULL,
  delta numeric(18,0) NOT NULL,
  action text NOT NULL CHECK(action IN ('receive','ship')),
  reservation_id uuid,
  source_system text NOT NULL CHECK(length(source_system) BETWEEN 1 AND 80),
  external_id text NOT NULL CHECK(length(external_id) BETWEEN 1 AND 160),
  actor_id uuid NOT NULL,
  idempotency_key uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK((action='receive' AND delta>0 AND reservation_id IS NULL) OR (action='ship' AND delta<0 AND reservation_id IS NOT NULL)),
  FOREIGN KEY(tenant_id,facility_id,sku_id) REFERENCES public.sc_inventory_balances,
  FOREIGN KEY(tenant_id,reservation_id,facility_id,sku_id) REFERENCES public.sc_inventory_reservations(tenant_id,id,facility_id,sku_id),
  FOREIGN KEY(actor_id,tenant_id) REFERENCES public.sc_api_keys(id,tenant_id),
  FOREIGN KEY(tenant_id,idempotency_key) REFERENCES public.sc_inventory_commands DEFERRABLE INITIALLY DEFERRED,
  UNIQUE(tenant_id,idempotency_key), UNIQUE(tenant_id,action,source_system,external_id), UNIQUE(tenant_id,reservation_id)
);
CREATE INDEX sc_inventory_movement_pages ON public.sc_inventory_movements(tenant_id,facility_id,sku_id,id);
CREATE FUNCTION public.sc_reject_inventory_changes() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Inventory history is append-only'; END;
$$;
CREATE TRIGGER sc_movements_append_only BEFORE UPDATE OR DELETE OR TRUNCATE ON public.sc_inventory_movements
FOR EACH STATEMENT EXECUTE FUNCTION public.sc_reject_inventory_changes();
CREATE TRIGGER sc_commands_append_only BEFORE UPDATE OR DELETE OR TRUNCATE ON public.sc_inventory_commands
FOR EACH STATEMENT EXECUTE FUNCTION public.sc_reject_inventory_changes();
CREATE FUNCTION public.sc_reservation_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN RAISE EXCEPTION 'Reservation history cannot be deleted'; END IF;
  IF OLD.state <> 'active' OR NEW.state NOT IN ('released','consumed') OR
     (to_jsonb(OLD) - 'state' - 'updated_at') IS DISTINCT FROM (to_jsonb(NEW) - 'state' - 'updated_at') THEN
    RAISE EXCEPTION 'Invalid reservation transition';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER sc_reservation_state BEFORE UPDATE OR DELETE ON public.sc_inventory_reservations
FOR EACH ROW EXECUTE FUNCTION public.sc_reservation_transition();
CREATE TRIGGER sc_reservation_no_truncate BEFORE TRUNCATE ON public.sc_inventory_reservations
FOR EACH STATEMENT EXECUTE FUNCTION public.sc_reject_inventory_changes();
ALTER TABLE public.sc_audit_events DROP CONSTRAINT sc_audit_events_entity_type_check;
ALTER TABLE public.sc_audit_events ADD CHECK(entity_type IN ('facility','sku','inventory_movement','reservation'));
ALTER TABLE public.sc_audit_events DROP CONSTRAINT sc_audit_events_action_check;
ALTER TABLE public.sc_audit_events ADD CHECK(action IN ('created','received','reserved','released','consumed'));
ALTER TABLE public.sc_audit_events ADD COLUMN idempotency_key uuid;
ALTER TABLE public.sc_audit_events ADD FOREIGN KEY(tenant_id,idempotency_key) REFERENCES public.sc_inventory_commands DEFERRABLE INITIALLY DEFERRED;
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['sc_inventory_commands','sc_inventory_balances','sc_inventory_reservations','sc_inventory_movements'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',table_name);
    EXECUTE format($policy$CREATE POLICY %I ON public.%I USING (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid)$policy$,table_name||'_tenant',table_name);
  END LOOP;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='snapshot_reader') THEN
    REVOKE ALL ON public.sc_inventory_commands FROM snapshot_reader;
  END IF;
END $$;
