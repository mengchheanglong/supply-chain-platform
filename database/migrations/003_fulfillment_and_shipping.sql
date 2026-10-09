CREATE TABLE public.sc_fulfillment_commands (
 tenant_id uuid NOT NULL REFERENCES public.sc_tenants(id), idempotency_key uuid NOT NULL,
 action text NOT NULL CHECK(action IN ('order','allocate','pick','pack','cancel-allocation','cancel-order')),
 fingerprint text NOT NULL, source_system text NOT NULL, external_id text NOT NULL, result jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(tenant_id,idempotency_key),
 UNIQUE(tenant_id,action,source_system,external_id)
);
CREATE TABLE public.sc_shipping_commands (
 tenant_id uuid NOT NULL REFERENCES public.sc_tenants(id), idempotency_key uuid NOT NULL,
 action text NOT NULL CHECK(action IN ('create','dispatch','deliver','cancel')),
 fingerprint text NOT NULL, source_system text NOT NULL, external_id text NOT NULL, result jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(tenant_id,idempotency_key),
 UNIQUE(tenant_id,action,source_system,external_id)
);
CREATE TABLE public.sc_orders (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL, facility_id uuid NOT NULL,
 customer_reference text NOT NULL CHECK(length(customer_reference) BETWEEN 1 AND 160),
 state text NOT NULL CHECK(state IN ('open','partially_shipped','fulfilled','cancelled')),
 source_system text NOT NULL, external_id text NOT NULL, actor_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,source_system,external_id),
 FOREIGN KEY(tenant_id,facility_id) REFERENCES public.sc_facilities(tenant_id,id),
 FOREIGN KEY(actor_id,tenant_id) REFERENCES public.sc_api_keys(id,tenant_id)
);
CREATE TABLE public.sc_order_lines (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL, order_id uuid NOT NULL, sku_id uuid NOT NULL,
 sku_code text NOT NULL, sku_name text NOT NULL, unit text NOT NULL, quantity_precision integer NOT NULL,
 requested numeric(18,0) NOT NULL CHECK(requested>0),
 allocated numeric(18,0) NOT NULL DEFAULT 0, shipped numeric(18,0) NOT NULL DEFAULT 0,
 CHECK(allocated>=0 AND shipped>=0 AND allocated+shipped<=requested),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,order_id,sku_id), UNIQUE(tenant_id,id,order_id),
 FOREIGN KEY(tenant_id,order_id) REFERENCES public.sc_orders(tenant_id,id),
 FOREIGN KEY(tenant_id,sku_id,unit,quantity_precision) REFERENCES public.sc_skus(tenant_id,id,unit,quantity_precision)
);
CREATE TABLE public.sc_allocations (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL, order_id uuid NOT NULL, line_id uuid NOT NULL,
 reservation_id uuid NOT NULL, quantity numeric(18,0) NOT NULL CHECK(quantity>0),
 state text NOT NULL CHECK(state IN ('allocated','picked','packed','shipped','cancelled')),
 shipment_id uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,id,order_id), UNIQUE(tenant_id,reservation_id),
 FOREIGN KEY(tenant_id,line_id,order_id) REFERENCES public.sc_order_lines(tenant_id,id,order_id),
 FOREIGN KEY(tenant_id,reservation_id) REFERENCES public.sc_inventory_reservations(tenant_id,id) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE public.sc_shipments (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL, order_id uuid NOT NULL, allocation_id uuid NOT NULL,
 state text NOT NULL CHECK(state IN ('draft','dispatched','delivered','cancelled')),
 source_system text NOT NULL, external_id text NOT NULL, actor_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 dispatched_at timestamptz, delivered_at timestamptz, delivery_source text, delivery_reference text,
 CHECK((state IN ('draft','cancelled') AND dispatched_at IS NULL AND delivered_at IS NULL) OR
       (state='dispatched' AND dispatched_at IS NOT NULL AND delivered_at IS NULL) OR
       (state='delivered' AND dispatched_at IS NOT NULL AND delivered_at>=dispatched_at AND delivery_source IS NOT NULL AND delivery_reference IS NOT NULL)),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,source_system,external_id),
 FOREIGN KEY(tenant_id,order_id) REFERENCES public.sc_orders(tenant_id,id),
 FOREIGN KEY(tenant_id,allocation_id,order_id) REFERENCES public.sc_allocations(tenant_id,id,order_id),
 FOREIGN KEY(actor_id,tenant_id) REFERENCES public.sc_api_keys(id,tenant_id)
);
CREATE UNIQUE INDEX sc_shipment_active_allocation ON public.sc_shipments(tenant_id,allocation_id) WHERE state<>'cancelled';
ALTER TABLE public.sc_allocations ADD FOREIGN KEY(tenant_id,shipment_id) REFERENCES public.sc_shipments(tenant_id,id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public.sc_inventory_reservations ADD COLUMN owner_type text, ADD COLUMN owner_id uuid;
ALTER TABLE public.sc_inventory_reservations ADD CHECK((owner_type IS NULL AND owner_id IS NULL) OR (owner_type='fulfillment' AND owner_id IS NOT NULL));
ALTER TABLE public.sc_inventory_reservations ADD FOREIGN KEY(tenant_id,owner_id) REFERENCES public.sc_allocations(tenant_id,id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public.sc_audit_events DROP CONSTRAINT sc_audit_events_entity_type_check;
ALTER TABLE public.sc_audit_events ADD CHECK(entity_type IN ('facility','sku','inventory_movement','reservation','order','allocation','shipment'));
ALTER TABLE public.sc_audit_events DROP CONSTRAINT sc_audit_events_action_check;
ALTER TABLE public.sc_audit_events ADD CHECK(action IN ('created','received','reserved','released','consumed','ordered','allocated','picked','packed','cancelled','dispatched','delivered'));
ALTER TABLE public.sc_audit_events ADD COLUMN fulfillment_command_key uuid, ADD COLUMN shipping_command_key uuid;
ALTER TABLE public.sc_audit_events ADD FOREIGN KEY(tenant_id,fulfillment_command_key) REFERENCES public.sc_fulfillment_commands DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public.sc_audit_events ADD FOREIGN KEY(tenant_id,shipping_command_key) REFERENCES public.sc_shipping_commands DEFERRABLE INITIALLY DEFERRED;
CREATE INDEX sc_order_pages ON public.sc_orders(tenant_id,id);
CREATE INDEX sc_order_lines_lookup ON public.sc_order_lines(tenant_id,order_id,id);
CREATE INDEX sc_allocation_pages ON public.sc_allocations(tenant_id,order_id,id);
CREATE INDEX sc_shipment_pages ON public.sc_shipments(tenant_id,order_id,id);
CREATE FUNCTION public.sc_workflow_transition() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE mutable text[]; valid boolean;
BEGIN
 IF TG_OP<>'UPDATE' THEN RAISE EXCEPTION 'Workflow history cannot be deleted'; END IF;
 IF TG_TABLE_NAME='sc_orders' THEN
  mutable:=ARRAY['state','updated_at'];
  valid:=(OLD.state='open' AND NEW.state IN ('open','partially_shipped','fulfilled','cancelled')) OR
         (OLD.state='partially_shipped' AND NEW.state IN ('partially_shipped','fulfilled'));
 ELSIF TG_TABLE_NAME='sc_order_lines' THEN
  mutable:=ARRAY['allocated','shipped']; valid:=true;
 ELSIF TG_TABLE_NAME='sc_allocations' THEN
  mutable:=ARRAY['state','shipment_id','updated_at'];
  valid:=(OLD.state='allocated' AND NEW.state IN ('picked','cancelled')) OR
         (OLD.state='picked' AND NEW.state IN ('packed','cancelled')) OR
         (OLD.state='packed' AND NEW.state IN ('packed','shipped','cancelled'));
 ELSE
  mutable:=ARRAY['state','updated_at','dispatched_at','delivered_at','delivery_source','delivery_reference'];
  valid:=(OLD.state='draft' AND NEW.state IN ('dispatched','cancelled')) OR (OLD.state='dispatched' AND NEW.state='delivered');
 END IF;
 IF NOT valid OR (to_jsonb(OLD)-mutable) IS DISTINCT FROM (to_jsonb(NEW)-mutable) THEN RAISE EXCEPTION 'Invalid workflow transition'; END IF;
 RETURN NEW;
END $$;
DO $$
DECLARE table_name text;
BEGIN
 FOREACH table_name IN ARRAY ARRAY['sc_fulfillment_commands','sc_shipping_commands','sc_orders','sc_order_lines','sc_allocations','sc_shipments'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
  EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',table_name);
  EXECUTE format($policy$CREATE POLICY %I ON public.%I USING(tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid) WITH CHECK(tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid)$policy$,table_name||'_tenant',table_name);
  IF table_name IN ('sc_fulfillment_commands','sc_shipping_commands') THEN
   EXECUTE format('CREATE TRIGGER history_guard BEFORE UPDATE OR DELETE OR TRUNCATE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.sc_reject_inventory_changes()',table_name);
  ELSE
   EXECUTE format('CREATE TRIGGER state_guard BEFORE UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.sc_workflow_transition()',table_name);
   EXECUTE format('CREATE TRIGGER truncate_guard BEFORE TRUNCATE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.sc_reject_inventory_changes()',table_name);
  END IF;
 END LOOP;
END $$;
