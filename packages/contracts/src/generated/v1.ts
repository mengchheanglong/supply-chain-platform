export interface paths {
    "/api/health/live": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["HealthController_live"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/health/ready": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["HealthController_ready"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/context": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ContextController_context"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/facilities": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["FacilityController_list"];
        put?: never;
        post: operations["FacilityController_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/fulfillment/allocate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["FulfillmentController_allocate"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/fulfillment/allocations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["FulfillmentController_allocations"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/fulfillment/cancel-allocation": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["FulfillmentController_cancelAllocation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/fulfillment/cancel-order": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["FulfillmentController_cancelOrder"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/fulfillment/order": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["FulfillmentController_detail"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/fulfillment/orders": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["FulfillmentController_list"];
        put?: never;
        post: operations["FulfillmentController_order"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/fulfillment/pack": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["FulfillmentController_pack"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/fulfillment/pick": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["FulfillmentController_pick"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/integrations/document": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ExchangeController_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/integrations/documents": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ExchangeController_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/integrations/exports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["ExchangeController_export"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/integrations/imports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["ExchangeController_import"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/integrations/mappings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ExchangeController_mappings"];
        put?: never;
        post: operations["ExchangeController_map"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/integrations/snapshot": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ExchangeController_getSnapshot"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/integrations/snapshot/artifact": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ExchangeController_getArtifact"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/integrations/snapshots": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ExchangeController_snapshots"];
        put?: never;
        post: operations["ExchangeController_snapshot"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/inventory/balance": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["InventoryController_balance"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/inventory/movements": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["InventoryController_movements"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/inventory/receive": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["InventoryController_receive"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/inventory/reconciliation": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["InventoryController_reconcile"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/inventory/release": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["InventoryController_release"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/inventory/reservations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["InventoryController_reservations"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/inventory/reserve": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["InventoryController_reserve"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/inventory/ship": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["InventoryController_ship"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/shipping/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["ShippingController_cancel"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/shipping/create": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["ShippingController_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/shipping/deliver": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["ShippingController_deliver"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/shipping/dispatch": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["ShippingController_dispatch"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/shipping/shipments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ShippingController_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/skus": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["SkuController_list"];
        put?: never;
        post: operations["SkuController_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        AllocateInputDto: {
            /** @description Source event/document identity, unique per tenant and action */
            externalId: string;
            /**
             * Format: uuid
             * @description Retain this key and identical input when retrying an unconfirmed command
             */
            idempotencyKey: string;
            /** Format: uuid */
            lineId: string;
            /** Format: uuid */
            orderId: string;
            quantity: string;
            sourceSystem: string;
        };
        AllocationDto: {
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            lineId: string;
            /** Format: uuid */
            orderId: string;
            quantity: string;
            quantityPrecision: number;
            /** Format: uuid */
            reservationId: string;
            /** Format: uuid */
            shipmentId: string | null;
            /** @enum {string} */
            state: "allocated" | "picked" | "packed" | "shipped" | "cancelled";
            /** Format: uuid */
            tenantId: string;
            /** @enum {string} */
            unit: "each" | "kg" | "m3" | "litre";
            /** Format: date-time */
            updatedAt: string;
        };
        AllocationInputDto: {
            /** Format: uuid */
            allocationId: string;
            /** @description Source event/document identity, unique per tenant and action */
            externalId: string;
            /**
             * Format: uuid
             * @description Retain this key and identical input when retrying an unconfirmed command
             */
            idempotencyKey: string;
            sourceSystem: string;
        };
        AllocationPageDto: {
            /** Format: date-time */
            generatedAt: string;
            items: components["schemas"]["AllocationDto"][];
            nextCursor: string | null;
            /** @enum {number} */
            schemaVersion: 1;
            /** @enum {string} */
            source: "operational";
            /** Format: uuid */
            tenantId: string;
        };
        BalanceDto: {
            /** Format: date-time */
            generatedAt: string;
            /** @enum {number} */
            schemaVersion: 1;
            /** @enum {string} */
            source: "operational";
            stock: components["schemas"]["StockDto"];
            /** Format: uuid */
            tenantId: string;
        };
        CancelOrderInputDto: {
            /** @description Source event/document identity, unique per tenant and action */
            externalId: string;
            /**
             * Format: uuid
             * @description Retain this key and identical input when retrying an unconfirmed command
             */
            idempotencyKey: string;
            /** Format: uuid */
            orderId: string;
            sourceSystem: string;
        };
        ChecksDto: {
            database: boolean;
            migrations: boolean;
            postgis: boolean;
            restrictedRole: boolean;
        };
        ContextDto: {
            actorId: string;
            /** @enum {string} */
            role: "operator" | "reader";
            /** @enum {number} */
            schemaVersion: 1;
            /** Format: uuid */
            tenantId: string;
            tenantName: string;
            timezone: string;
        };
        CreateFacilityDto: {
            code: string;
            externalId: string;
            /** @enum {string} */
            kind: "warehouse" | "depot";
            latitude: number;
            /** @enum {string} */
            locationSource: "surveyed" | "imported" | "estimated";
            longitude: number;
            name: string;
            sourceSystem: string;
            timezone: string;
        };
        CreateSkuDto: {
            code: string;
            externalId: string;
            name: string;
            quantityPrecision: number;
            sourceSystem: string;
            /** @enum {string} */
            unit: "each" | "kg" | "m3" | "litre";
        };
        CreatedDto: {
            /** Format: uuid */
            id: string;
            /** @enum {number} */
            schemaVersion: 1;
            /** @enum {string} */
            source: "operational";
            /** Format: uuid */
            tenantId: string;
        };
        DeliveryInputDto: {
            /** @description Source event/document identity, unique per tenant and action */
            externalId: string;
            /**
             * Format: uuid
             * @description Retain this key and identical input when retrying an unconfirmed command
             */
            idempotencyKey: string;
            /**
             * Format: date-time
             * @description Observed UTC delivery time; externalId identifies delivery evidence
             */
            observedAt: string;
            /** Format: uuid */
            shipmentId: string;
            sourceSystem: string;
        };
        DemandLineDto: {
            quantity: string;
            /** Format: uuid */
            skuId: string;
            /** @enum {string} */
            unit: "each" | "kg" | "m3" | "litre";
        };
        DocumentPageDto: {
            /** Format: date-time */
            generatedAt: string;
            items: components["schemas"]["DocumentSummaryDto"][];
            nextCursor: string | null;
            /** @enum {number} */
            schemaVersion: 1;
            /** @enum {string} */
            source: "operational";
            /** Format: uuid */
            tenantId: string;
        };
        DocumentSummaryDto: {
            acceptedRows: number;
            externalId: string;
            /** Format: date-time */
            generatedAt: string;
            /** Format: uuid */
            id: string;
            /** @enum {string} */
            kind: "import" | "export";
            sourceSystem: string;
            /** @enum {string} */
            state: "validated" | "rejected" | "exported";
            totalRows: number;
        };
        ErrorDto: {
            /** Format: uuid */
            correlationId: string;
            error: string | components["schemas"]["ErrorMessageDto"];
            /** @enum {number} */
            schemaVersion: 1;
            statusCode: number;
        };
        ErrorMessageDto: {
            error?: string;
            message: string | string[];
            statusCode?: number;
        };
        ExchangeDocumentDto: {
            acceptedRows: number;
            /** Format: uuid */
            actorId: string;
            contentSha256: string;
            csv: string | null;
            externalId: string;
            fileName: string;
            /** Format: date-time */
            generatedAt: string;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            idempotencyKey: string;
            issues: components["schemas"]["QualityIssueDto"][];
            /** @enum {string} */
            kind: "import" | "export";
            nextCursor: string | null;
            /** @enum {boolean} */
            planningApproved: false;
            records: components["schemas"]["StagedStockDto"][];
            /** @enum {string} */
            resource: "stock-observations" | "facilities" | "skus" | "stock";
            /** @enum {number} */
            schemaVersion: 1;
            /** @enum {string} */
            source: "external" | "operational";
            sourceSystem: string;
            spreadsheetSafe: boolean;
            /** @enum {string} */
            state: "validated" | "rejected" | "exported";
            /** Format: uuid */
            tenantId: string;
            totalRows: number;
        };
        ExportInputDto: {
            cursor?: string;
            /** @description Source event/document identity, unique per tenant and action */
            externalId: string;
            /**
             * Format: uuid
             * @description Required only for stock export
             */
            facilityId?: string;
            /**
             * Format: uuid
             * @description Retain this key and identical input when retrying an unconfirmed command
             */
            idempotencyKey: string;
            /** @description Master-data page size 1–200; default 50 */
            limit?: string;
            /** @enum {string} */
            resource: "facilities" | "skus" | "stock";
            /**
             * Format: uuid
             * @description Required only for stock export
             */
            skuId?: string;
            sourceSystem: string;
        };
        FacilityDto: {
            code: string;
            /** Format: date-time */
            createdAt: string;
            externalId: string;
            /** Format: uuid */
            id: string;
            /** @enum {string} */
            kind: "warehouse" | "depot";
            latitude: number;
            /** @enum {string} */
            locationSource: "surveyed" | "imported" | "estimated";
            longitude: number;
            name: string;
            sourceSystem: string;
            /** Format: uuid */
            tenantId: string;
            timezone: string;
        };
        FacilityPageDto: {
            /** Format: date-time */
            generatedAt: string;
            items: components["schemas"]["FacilityDto"][];
            nextCursor: string | null;
            /** @enum {number} */
            schemaVersion: 1;
            /** @enum {string} */
            source: "operational";
            /** Format: uuid */
            tenantId: string;
        };
        FulfillmentResultDto: {
            /** @enum {string} */
            action: "order" | "allocate" | "pick" | "pack" | "cancel-allocation" | "cancel-order";
            /** Format: uuid */
            allocationId: string | null;
            /** Format: uuid */
            idempotencyKey: string;
            /** Format: uuid */
            orderId: string;
            /** @enum {number} */
            schemaVersion: 1;
            /** @enum {string} */
            source: "operational";
            /** Format: uuid */
            tenantId: string;
        };
        ImportInputDto: {
            /** @description Stock observation CSV v1; at most 200 records. Validation never changes operational stock. */
            csv: string;
            /** @description Source event/document identity, unique per tenant and action */
            externalId: string;
            fileName: string;
            /**
             * Format: uuid
             * @description Retain this key and identical input when retrying an unconfirmed command
             */
            idempotencyKey: string;
            /** @enum {number} */
            schemaVersion: 1;
            sourceSystem: string;
        };
        InventoryCommandResultDto: {
            /** @enum {string} */
            action: "receive" | "reserve" | "release" | "ship";
            /** Format: uuid */
            idempotencyKey: string;
            /** Format: uuid */
            movementId: string | null;
            /** Format: uuid */
            reservationId: string | null;
            /** @enum {number} */
            schemaVersion: 1;
            /** @enum {string} */
            source: "operational";
            stock: components["schemas"]["StockDto"];
            /** Format: uuid */
            tenantId: string;
        };
        LivenessDto: {
            /** @enum {number} */
            schemaVersion: 1;
            /** @enum {string} */
            status: "alive";
        };
        MappingDto: {
            /** Format: date-time */
            createdAt: string;
            /** @enum {string} */
            entity: "facility" | "sku";
            /** Format: uuid */
            id: string;
            sourceExternalId: string;
            sourceSystem: string;
            /** Format: uuid */
            targetId: string;
            /** Format: uuid */
            tenantId: string;
        };
        MappingInputDto: {
            /** @enum {string} */
            entity: "facility" | "sku";
            /** @description Source event/document identity, unique per tenant and action */
            externalId: string;
            /**
             * Format: uuid
             * @description Retain this key and identical input when retrying an unconfirmed command
             */
            idempotencyKey: string;
            sourceExternalId: string;
            sourceSystem: string;
            /** Format: uuid */
            targetId: string;
        };
        MappingPageDto: {
            /** Format: date-time */
            generatedAt: string;
            items: components["schemas"]["MappingDto"][];
            nextCursor: string | null;
            /** @enum {number} */
            schemaVersion: 1;
            /** @enum {string} */
            source: "operational";
            /** Format: uuid */
            tenantId: string;
        };
        MappingReceiptDto: {
            /** Format: uuid */
            idempotencyKey: string;
            mapping: components["schemas"]["MappingDto"];
            /** @enum {number} */
            schemaVersion: 1;
            /** @enum {string} */
            source: "operational";
            /** Format: uuid */
            tenantId: string;
        };
        MovementDto: {
            /** @enum {string} */
            action: "receive" | "ship";
            /** Format: uuid */
            actorId: string;
            /** Format: date-time */
            createdAt: string;
            /** @description Signed physical stock change */
            delta: string;
            externalId: string;
            /** Format: uuid */
            facilityId: string;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            idempotencyKey: string;
            quantityPrecision: number;
            /** Format: uuid */
            reservationId: string | null;
            /** Format: uuid */
            skuId: string;
            sourceSystem: string;
            /** Format: uuid */
            tenantId: string;
            /** @enum {string} */
            unit: "each" | "kg" | "m3" | "litre";
        };
        MovementPageDto: {
            /** Format: date-time */
            generatedAt: string;
            items: components["schemas"]["MovementDto"][];
            nextCursor: string | null;
            /** @enum {number} */
            schemaVersion: 1;
            /** @enum {string} */
            source: "operational";
            /** Format: uuid */
            tenantId: string;
        };
        OrderDetailDto: {
            /** Format: date-time */
            generatedAt: string;
            lines: components["schemas"]["OrderLineDto"][];
            order: components["schemas"]["OrderDto"];
            /** @enum {number} */
            schemaVersion: 1;
            /** @enum {string} */
            source: "operational";
            /** Format: uuid */
            tenantId: string;
        };
        OrderDto: {
            /** Format: date-time */
            createdAt: string;
            customerReference: string;
            externalId: string;
            /** Format: uuid */
            facilityId: string;
            /** Format: uuid */
            id: string;
            sourceSystem: string;
            /** @enum {string} */
            state: "open" | "partially_shipped" | "fulfilled" | "cancelled";
            /** Format: uuid */
            tenantId: string;
            /** Format: date-time */
            updatedAt: string;
        };
        OrderInputDto: {
            /** @description Opaque customer reference; no pricing or personal data required */
            customerReference: string;
            /** @description Source event/document identity, unique per tenant and action */
            externalId: string;
            /** Format: uuid */
            facilityId: string;
            /**
             * Format: uuid
             * @description Retain this key and identical input when retrying an unconfirmed command
             */
            idempotencyKey: string;
            lines: components["schemas"]["DemandLineDto"][];
            sourceSystem: string;
        };
        OrderLineDto: {
            allocated: string;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            orderId: string;
            quantityPrecision: number;
            remaining: string;
            requested: string;
            shipped: string;
            skuCode: string;
            /** Format: uuid */
            skuId: string;
            skuName: string;
            /** @enum {string} */
            unit: "each" | "kg" | "m3" | "litre";
        };
        OrderPageDto: {
            /** Format: date-time */
            generatedAt: string;
            items: components["schemas"]["OrderDto"][];
            nextCursor: string | null;
            /** @enum {number} */
            schemaVersion: 1;
            /** @enum {string} */
            source: "operational";
            /** Format: uuid */
            tenantId: string;
        };
        QualityIssueDto: {
            code: string;
            field: string;
            message: string;
            row: number;
        };
        ReadinessDto: {
            checks: components["schemas"]["ChecksDto"];
            /** @enum {number} */
            schemaVersion: 1;
            /** @enum {string} */
            status: "ready" | "unavailable";
        };
        ReconciliationDto: {
            activeReserved: string;
            consistent: boolean;
            /** Format: uuid */
            facilityId: string;
            /** Format: date-time */
            generatedAt: string;
            ledgerOnHand: string;
            onHand: string;
            quantityPrecision: number;
            reserved: string;
            /** @enum {number} */
            schemaVersion: 1;
            /** Format: uuid */
            skuId: string;
            /** @enum {string} */
            source: "operational";
            /** Format: uuid */
            tenantId: string;
            /** @enum {string} */
            unit: "each" | "kg" | "m3" | "litre";
        };
        ReservationCommandDto: {
            /** @description Source event/document identity, unique per tenant and action */
            externalId: string;
            /**
             * Format: uuid
             * @description Retain this key and identical input when retrying an unconfirmed command
             */
            idempotencyKey: string;
            /** Format: uuid */
            reservationId: string;
            sourceSystem: string;
        };
        ReservationDto: {
            /** Format: uuid */
            actorId: string;
            /** Format: date-time */
            createdAt: string;
            externalId: string;
            /** Format: uuid */
            facilityId: string;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            idempotencyKey: string;
            /** Format: uuid */
            ownerId: string | null;
            /** @enum {string|null} */
            ownerType: "fulfillment" | null;
            quantity: string;
            quantityPrecision: number;
            /** Format: uuid */
            skuId: string;
            sourceSystem: string;
            /** @enum {string} */
            state: "active" | "released" | "consumed";
            /** Format: uuid */
            tenantId: string;
            /** @enum {string} */
            unit: "each" | "kg" | "m3" | "litre";
            /** Format: date-time */
            updatedAt: string;
        };
        ReservationPageDto: {
            /** Format: date-time */
            generatedAt: string;
            items: components["schemas"]["ReservationDto"][];
            nextCursor: string | null;
            /** @enum {number} */
            schemaVersion: 1;
            /** @enum {string} */
            source: "operational";
            /** Format: uuid */
            tenantId: string;
        };
        ShipmentDto: {
            /** Format: uuid */
            allocationId: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            deliveredAt: string | null;
            deliveryReference: string | null;
            deliverySource: string | null;
            /** Format: date-time */
            dispatchedAt: string | null;
            externalId: string;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            orderId: string;
            sourceSystem: string;
            /** @enum {string} */
            state: "draft" | "dispatched" | "delivered" | "cancelled";
            /** Format: uuid */
            tenantId: string;
            /** Format: date-time */
            updatedAt: string;
        };
        ShipmentInputDto: {
            /** Format: uuid */
            allocationId: string;
            /** @description Source event/document identity, unique per tenant and action */
            externalId: string;
            /**
             * Format: uuid
             * @description Retain this key and identical input when retrying an unconfirmed command
             */
            idempotencyKey: string;
            sourceSystem: string;
        };
        ShipmentPageDto: {
            /** Format: date-time */
            generatedAt: string;
            items: components["schemas"]["ShipmentDto"][];
            nextCursor: string | null;
            /** @enum {number} */
            schemaVersion: 1;
            /** @enum {string} */
            source: "operational";
            /** Format: uuid */
            tenantId: string;
        };
        ShipmentTransitionDto: {
            /** @description Source event/document identity, unique per tenant and action */
            externalId: string;
            /**
             * Format: uuid
             * @description Retain this key and identical input when retrying an unconfirmed command
             */
            idempotencyKey: string;
            /** Format: uuid */
            shipmentId: string;
            sourceSystem: string;
        };
        ShippingResultDto: {
            /** @enum {string} */
            action: "create" | "dispatch" | "deliver" | "cancel";
            /** Format: uuid */
            idempotencyKey: string;
            /** Format: uuid */
            movementId: string | null;
            /** Format: uuid */
            orderId: string;
            /** @enum {number} */
            schemaVersion: 1;
            /** Format: uuid */
            shipmentId: string;
            /** @enum {string} */
            source: "operational";
            /** @enum {string} */
            state: "draft" | "dispatched" | "delivered" | "cancelled";
            /** Format: uuid */
            tenantId: string;
        };
        SkuDto: {
            code: string;
            /** Format: date-time */
            createdAt: string;
            externalId: string;
            /** Format: uuid */
            id: string;
            name: string;
            quantityPrecision: number;
            sourceSystem: string;
            /** Format: uuid */
            tenantId: string;
            /** @enum {string} */
            unit: "each" | "kg" | "m3" | "litre";
        };
        SkuPageDto: {
            /** Format: date-time */
            generatedAt: string;
            items: components["schemas"]["SkuDto"][];
            nextCursor: string | null;
            /** @enum {number} */
            schemaVersion: 1;
            /** @enum {string} */
            source: "operational";
            /** Format: uuid */
            tenantId: string;
        };
        SnapshotApprovalDto: {
            /** Format: date-time */
            approvedAt: string;
            /** Format: uuid */
            approvedBy: string;
            notes?: string;
        };
        SnapshotArtifactDto: {
            byteSize: number;
            content: string;
            contentSha256: string;
            fileName: string;
            mediaType: string;
            name: string;
            rowCount: number;
        };
        SnapshotArtifactSummaryDto: {
            byteSize: number;
            contentSha256: string;
            fileName: string;
            mediaType: string;
            name: string;
            rowCount: number;
        };
        SnapshotInputDto: {
            /** @description Source event/document identity, unique per tenant and action */
            externalId: string;
            /**
             * Format: uuid
             * @description Retain this key and identical input when retrying an unconfirmed command
             */
            idempotencyKey: string;
            notes?: string;
            /** @enum {number} */
            schemaVersion?: 1;
            sourceSystem: string;
        };
        SnapshotLineageDto: {
            /** Format: uuid */
            actorId: string;
            /** Format: date-time */
            cutoffAt: string;
            externalId: string;
            /** Format: date-time */
            generatedAt: string;
            sourceSystem: string;
            /** Format: uuid */
            tenantId: string;
        };
        SnapshotManifestDto: {
            /** Format: uuid */
            actorId: string;
            approval: components["schemas"]["SnapshotApprovalDto"];
            /** Format: date-time */
            approvedAt: string;
            artifacts: components["schemas"]["SnapshotArtifactSummaryDto"][];
            contentSha256: string;
            externalId: string;
            /** Format: date-time */
            generatedAt: string;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            idempotencyKey: string;
            lineage: components["schemas"]["SnapshotLineageDto"];
            manifestSha256: string;
            /** @enum {number} */
            manifestVersion: 1;
            /** @enum {boolean} */
            planningApproved: true;
            /** @enum {number} */
            schemaVersion: 1;
            /** @enum {string} */
            source: "operational";
            sourceSystem: string;
            /** Format: uuid */
            tenantId: string;
        };
        SnapshotPageDto: {
            /** Format: date-time */
            generatedAt: string;
            items: components["schemas"]["SnapshotSummaryDto"][];
            nextCursor: string | null;
            /** @enum {number} */
            schemaVersion: 1;
            /** @enum {string} */
            source: "operational";
            /** Format: uuid */
            tenantId: string;
        };
        SnapshotSummaryDto: {
            /** Format: date-time */
            approvedAt: string;
            artifactCount: number;
            contentSha256: string;
            externalId: string;
            /** Format: date-time */
            generatedAt: string;
            /** Format: uuid */
            id: string;
            manifestSha256: string;
            /** @enum {boolean} */
            planningApproved: true;
            sourceSystem: string;
        };
        StagedStockDto: {
            available: string;
            /** Format: uuid */
            facilityId: string;
            facilityRef: string;
            /** Format: date-time */
            observedAt: string;
            onHand: string;
            quantityPrecision: number;
            recordId: string;
            reserved: string;
            row: number;
            /** Format: uuid */
            skuId: string;
            skuRef: string;
            /** @enum {string} */
            unit: "each" | "kg" | "m3" | "litre";
        };
        StockCommandDto: {
            /** @description Source event/document identity, unique per tenant and action */
            externalId: string;
            /** Format: uuid */
            facilityId: string;
            /**
             * Format: uuid
             * @description Retain this key and identical input when retrying an unconfirmed command
             */
            idempotencyKey: string;
            /**
             * @description Positive decimal string; must fit SKU precision. No implicit unit conversion.
             * @example 12.500
             */
            quantity: string;
            /** Format: uuid */
            skuId: string;
            sourceSystem: string;
            /** @enum {string} */
            unit: "each" | "kg" | "m3" | "litre";
        };
        StockDto: {
            available: string;
            /** Format: uuid */
            facilityId: string;
            onHand: string;
            quantityPrecision: number;
            reserved: string;
            /** Format: uuid */
            skuId: string;
            /** Format: uuid */
            tenantId: string;
            /** @enum {string} */
            unit: "each" | "kg" | "m3" | "litre";
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    HealthController_live: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LivenessDto"];
                };
            };
        };
    };
    HealthController_ready: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReadinessDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReadinessDto"];
                };
            };
        };
    };
    ContextController_context: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ContextDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    FacilityController_list: {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FacilityPageDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    FacilityController_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateFacilityDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CreatedDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    FulfillmentController_allocate: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AllocateInputDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FulfillmentResultDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    FulfillmentController_allocations: {
        parameters: {
            query: {
                /** @description 1–200; default 50 */
                limit?: string;
                cursor?: string;
                orderId: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AllocationPageDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    FulfillmentController_cancelAllocation: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AllocationInputDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FulfillmentResultDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    FulfillmentController_cancelOrder: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CancelOrderInputDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FulfillmentResultDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    FulfillmentController_detail: {
        parameters: {
            query: {
                orderId: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrderDetailDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    FulfillmentController_list: {
        parameters: {
            query?: {
                /** @description 1–200; default 50 */
                limit?: string;
                cursor?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrderPageDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    FulfillmentController_order: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OrderInputDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FulfillmentResultDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    FulfillmentController_pack: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AllocationInputDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FulfillmentResultDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    FulfillmentController_pick: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AllocationInputDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FulfillmentResultDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    ExchangeController_get: {
        parameters: {
            query: {
                id: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExchangeDocumentDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    ExchangeController_list: {
        parameters: {
            query?: {
                /** @description 1–200; default 50 */
                limit?: string;
                cursor?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DocumentPageDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    ExchangeController_export: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ExportInputDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExchangeDocumentDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    ExchangeController_import: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ImportInputDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExchangeDocumentDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    ExchangeController_mappings: {
        parameters: {
            query?: {
                /** @description 1–200; default 50 */
                limit?: string;
                cursor?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MappingPageDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    ExchangeController_map: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MappingInputDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MappingReceiptDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    ExchangeController_getSnapshot: {
        parameters: {
            query: {
                id: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SnapshotManifestDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    ExchangeController_getArtifact: {
        parameters: {
            query: {
                id: string;
                name: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SnapshotArtifactDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    ExchangeController_snapshots: {
        parameters: {
            query?: {
                /** @description 1–200; default 50 */
                limit?: string;
                cursor?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SnapshotPageDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    ExchangeController_snapshot: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SnapshotInputDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SnapshotManifestDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    InventoryController_balance: {
        parameters: {
            query: {
                facilityId: string;
                skuId: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BalanceDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    InventoryController_movements: {
        parameters: {
            query: {
                facilityId: string;
                skuId: string;
                /** @description 1–200; default 50 */
                limit?: string;
                cursor?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MovementPageDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    InventoryController_receive: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StockCommandDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InventoryCommandResultDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    InventoryController_reconcile: {
        parameters: {
            query: {
                facilityId: string;
                skuId: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReconciliationDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    InventoryController_release: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReservationCommandDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InventoryCommandResultDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    InventoryController_reservations: {
        parameters: {
            query: {
                facilityId: string;
                skuId: string;
                /** @description 1–200; default 50 */
                limit?: string;
                cursor?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReservationPageDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    InventoryController_reserve: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StockCommandDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InventoryCommandResultDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    InventoryController_ship: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReservationCommandDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InventoryCommandResultDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    ShippingController_cancel: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ShipmentTransitionDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ShippingResultDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    ShippingController_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ShipmentInputDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ShippingResultDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    ShippingController_deliver: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DeliveryInputDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ShippingResultDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    ShippingController_dispatch: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ShipmentTransitionDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ShippingResultDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    ShippingController_list: {
        parameters: {
            query: {
                /** @description 1–200; default 50 */
                limit?: string;
                cursor?: string;
                orderId: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ShipmentPageDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    SkuController_list: {
        parameters: {
            query?: {
                limit?: number;
                cursor?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SkuPageDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
    SkuController_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateSkuDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CreatedDto"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorDto"];
                };
            };
        };
    };
}
