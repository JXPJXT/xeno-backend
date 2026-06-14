-- CreateTable
CREATE TABLE "customer_category_affinities" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "affinity_score" DECIMAL(5,4) NOT NULL,
    "total_spend" DECIMAL(12,2) NOT NULL,
    "purchase_count" INTEGER NOT NULL DEFAULT 0,
    "avg_item_value" DECIMAL(12,2),
    "last_purchased_at" TIMESTAMPTZ,
    "is_preferred" BOOLEAN NOT NULL DEFAULT false,
    "computed_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_category_affinities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_versions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "offer_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "offer_type" "OfferType" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "conditions" JSONB,
    "changelog" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_category_affinities_tenant_id_customer_id_idx" ON "customer_category_affinities"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "customer_category_affinities_affinity_score_idx" ON "customer_category_affinities"("affinity_score");

-- CreateIndex
CREATE INDEX "customer_category_affinities_category_idx" ON "customer_category_affinities"("category");

-- CreateIndex
CREATE UNIQUE INDEX "customer_category_affinities_tenant_id_customer_id_category_key" ON "customer_category_affinities"("tenant_id", "customer_id", "category");

-- CreateIndex
CREATE INDEX "offer_versions_tenant_id_offer_id_idx" ON "offer_versions"("tenant_id", "offer_id");

-- CreateIndex
CREATE UNIQUE INDEX "offer_versions_tenant_id_offer_id_version_key" ON "offer_versions"("tenant_id", "offer_id", "version");

-- AddForeignKey
ALTER TABLE "customer_category_affinities" ADD CONSTRAINT "customer_category_affinities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_category_affinities" ADD CONSTRAINT "customer_category_affinities_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_versions" ADD CONSTRAINT "offer_versions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_versions" ADD CONSTRAINT "offer_versions_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
