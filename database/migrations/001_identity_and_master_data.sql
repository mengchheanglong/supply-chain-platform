CREATE TABLE public.sc_tenants (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 160),
  timezone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.sc_api_keys (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.sc_tenants(id),
  token_hash text NOT NULL UNIQUE CHECK (length(token_hash) = 64),
  role text NOT NULL CHECK (role IN ('operator','reader')),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id,tenant_id)
);
CREATE TABLE public.sc_facilities (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.sc_tenants(id),
  code text NOT NULL CHECK (length(code) BETWEEN 1 AND 64),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 160),
  kind text NOT NULL CHECK (kind IN ('warehouse','depot')),
  timezone text NOT NULL,
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  location_source text NOT NULL CHECK (location_source IN ('surveyed','imported','estimated')),
  location geography(Point,4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude,latitude),4326)::geography) STORED,
  source_system text NOT NULL CHECK (length(source_system) BETWEEN 1 AND 80),
  external_id text NOT NULL CHECK (length(external_id) BETWEEN 1 AND 160),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,code), UNIQUE(tenant_id,source_system,external_id)
);
CREATE INDEX sc_facilities_location ON public.sc_facilities USING gist(location);
CREATE TABLE public.sc_skus (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.sc_tenants(id),
  code text NOT NULL CHECK (length(code) BETWEEN 1 AND 64),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 160),
  unit text NOT NULL CHECK (unit IN ('each','kg','m3','litre')),
  quantity_precision integer NOT NULL CHECK (quantity_precision BETWEEN 0 AND 6 AND (unit <> 'each' OR quantity_precision = 0)),
  source_system text NOT NULL CHECK (length(source_system) BETWEEN 1 AND 80),
  external_id text NOT NULL CHECK (length(external_id) BETWEEN 1 AND 160),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,code), UNIQUE(tenant_id,source_system,external_id)
);
CREATE TABLE public.sc_audit_events (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.sc_tenants(id),
  actor_id uuid NOT NULL,
  correlation_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('facility','sku')),
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (action = 'created'),
  source_system text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(actor_id,tenant_id) REFERENCES public.sc_api_keys(id,tenant_id)
);
CREATE FUNCTION public.sc_reject_audit_changes() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Audit events are append-only'; END;
$$;
CREATE TRIGGER sc_audit_append_only BEFORE UPDATE OR DELETE ON public.sc_audit_events
FOR EACH ROW EXECUTE FUNCTION public.sc_reject_audit_changes();
ALTER TABLE public.sc_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sc_facilities FORCE ROW LEVEL SECURITY;
CREATE POLICY sc_facilities_tenant ON public.sc_facilities
USING (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid)
WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid);
ALTER TABLE public.sc_skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sc_skus FORCE ROW LEVEL SECURITY;
CREATE POLICY sc_skus_tenant ON public.sc_skus
USING (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid)
WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid);
ALTER TABLE public.sc_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sc_audit_events FORCE ROW LEVEL SECURITY;
CREATE POLICY sc_audit_tenant ON public.sc_audit_events
USING (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid)
WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid);
-- Parent default grants are for snapshots. Credentials and identities are excluded.
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'snapshot_reader') THEN
  REVOKE ALL ON public.sc_api_keys,public.sc_tenants,public.sc_audit_events,public.sc_schema_migrations FROM snapshot_reader;
END IF;
END $$;
