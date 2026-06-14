-- CreateEnum
CREATE TYPE "IdentityType" AS ENUM ('EMAIL', 'PHONE', 'LOYALTY_ID', 'EXTERNAL_CRM_ID', 'WHATSAPP_ID');

-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('BILLING', 'SHIPPING', 'HOME', 'WORK');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('IOS', 'ANDROID', 'WEB', 'DESKTOP');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('EMAIL_MARKETING', 'SMS_MARKETING', 'WHATSAPP_MARKETING', 'PUSH_MARKETING', 'ANALYTICS', 'PERSONALIZATION');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('GRANTED', 'REVOKED', 'PENDING');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISCONTINUED', 'OUT_OF_STOCK');

-- CreateEnum
CREATE TYPE "FeatureDataType" AS ENUM ('NUMERIC', 'CATEGORICAL', 'BOOLEAN', 'ARRAY', 'JSON');

-- CreateEnum
CREATE TYPE "FeatureStatus" AS ENUM ('ACTIVE', 'DEPRECATED', 'EXPERIMENTAL');

-- CreateEnum
CREATE TYPE "ComputationStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "OfferType" AS ENUM ('PERCENTAGE_DISCOUNT', 'FLAT_DISCOUNT', 'FREE_SHIPPING', 'BUY_X_GET_Y', 'CASHBACK', 'LOYALTY_POINTS', 'BUNDLE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkflowStepType" AS ENUM ('ACTION', 'CONDITION', 'DELAY', 'SPLIT', 'WEBHOOK', 'APPROVAL');

-- CreateEnum
CREATE TYPE "WorkflowExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'PAUSED');

-- CreateEnum
CREATE TYPE "MemoryType" AS ENUM ('FACT', 'PREFERENCE', 'STRATEGY', 'INSIGHT', 'PATTERN');

-- CreateEnum
CREATE TYPE "FeedbackSentiment" AS ENUM ('POSITIVE', 'NEGATIVE', 'NEUTRAL');

-- CreateTable
CREATE TABLE "customer_identities" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "identity_type" "IdentityType" NOT NULL,
    "identity_value" VARCHAR(255) NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_addresses" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "address_type" "AddressType" NOT NULL DEFAULT 'HOME',
    "line1" VARCHAR(255) NOT NULL,
    "line2" VARCHAR(255),
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100),
    "country" VARCHAR(10) NOT NULL,
    "postal_code" VARCHAR(20),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_devices" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "device_type" VARCHAR(50) NOT NULL,
    "device_token" VARCHAR(500) NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "last_seen_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_channels" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "channel_type" "ChannelType" NOT NULL,
    "channel_value" VARCHAR(255) NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_preferences" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sms_enabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsapp_enabled" BOOLEAN NOT NULL DEFAULT true,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "preferred_channel" "ChannelType",
    "preferred_language" VARCHAR(10),
    "quiet_hours_start" VARCHAR(5),
    "quiet_hours_end" VARCHAR(5),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "customer_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_consents" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "consent_type" "ConsentType" NOT NULL,
    "status" "ConsentStatus" NOT NULL DEFAULT 'PENDING',
    "granted_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,
    "source" VARCHAR(100),
    "proof" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "parent_id" UUID,
    "level" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "category_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "sku" VARCHAR(100),
    "description" TEXT,
    "base_price" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "image_url" VARCHAR(500),
    "tags" JSONB DEFAULT '[]',
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attributes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "data_type" VARCHAR(50) NOT NULL,
    "is_filterable" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attribute_values" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "attribute_id" UUID NOT NULL,
    "value" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_attribute_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_product_affinities" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "affinity_score" DECIMAL(5,4) NOT NULL,
    "purchase_count" INTEGER NOT NULL DEFAULT 0,
    "last_purchased_at" TIMESTAMPTZ,
    "computed_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_product_affinities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_definitions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "feature_name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "data_type" "FeatureDataType" NOT NULL DEFAULT 'NUMERIC',
    "owner" VARCHAR(100),
    "status" "FeatureStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "feature_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_versions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "feature_definition_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "formula" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_computation_runs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "feature_definition_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "ComputationStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "records_processed" INTEGER,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_computation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_templates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "goal_type" "GoalType" NOT NULL,
    "template" JSONB NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "decision_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_rules" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "decision_id" UUID NOT NULL,
    "rule_name" VARCHAR(255) NOT NULL,
    "rule_type" VARCHAR(50) NOT NULL,
    "conditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_explanations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "decision_id" UUID NOT NULL,
    "step_name" VARCHAR(100) NOT NULL,
    "explanation" TEXT NOT NULL,
    "evidence" JSONB,
    "confidence" DECIMAL(5,4),
    "step_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_explanations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_experiments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "decision_id_a" UUID NOT NULL,
    "decision_id_b" UUID NOT NULL,
    "traffic_split" DECIMAL(3,2) NOT NULL DEFAULT 0.5,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "winner_decision_id" UUID,
    "results" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "decision_experiments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_templates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "offer_type" "OfferType" NOT NULL,
    "template" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "offer_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "template_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "offer_type" "OfferType" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3),
    "conditions" JSONB,
    "max_redemptions" INTEGER,
    "current_redemptions" INTEGER NOT NULL DEFAULT 0,
    "status" "OfferStatus" NOT NULL DEFAULT 'DRAFT',
    "valid_from" TIMESTAMPTZ,
    "valid_until" TIMESTAMPTZ,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_assignments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "offer_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "decision_id" UUID,
    "campaign_id" UUID,
    "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ,
    "redeemed_at" TIMESTAMPTZ,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ASSIGNED',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_performances" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "offer_id" UUID NOT NULL,
    "total_assigned" INTEGER NOT NULL DEFAULT 0,
    "total_redeemed" INTEGER NOT NULL DEFAULT 0,
    "total_revenue" DECIMAL(12,2),
    "redemption_rate" DECIMAL(5,4),
    "avg_order_value" DECIMAL(12,2),
    "roi" DECIMAL(8,4),
    "computed_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "offer_performances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflows" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "trigger_type" VARCHAR(50) NOT NULL,
    "trigger_config" JSONB,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_steps" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "workflow_id" UUID NOT NULL,
    "step_name" VARCHAR(255) NOT NULL,
    "step_type" "WorkflowStepType" NOT NULL,
    "config" JSONB NOT NULL,
    "next_step_id" UUID,
    "on_fail_step_id" UUID,
    "step_order" INTEGER NOT NULL,
    "timeout_ms" INTEGER,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_executions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "workflow_id" UUID NOT NULL,
    "status" "WorkflowExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "triggered_by" UUID,
    "input" JSONB,
    "output" JSONB,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_execution_steps" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "execution_id" UUID NOT NULL,
    "step_id" UUID NOT NULL,
    "status" "WorkflowExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "input" JSONB,
    "output" JSONB,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "error_message" TEXT,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_execution_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_memories" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "agent_type" "AIAgentType" NOT NULL,
    "memory_type" "MemoryType" NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "value" JSONB NOT NULL,
    "confidence" DECIMAL(5,4),
    "expires_at" TIMESTAMPTZ,
    "access_count" INTEGER NOT NULL DEFAULT 0,
    "last_accessed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "agent_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_observations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "agent_type" "AIAgentType" NOT NULL,
    "observation_type" VARCHAR(100) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "observation" TEXT NOT NULL,
    "evidence" JSONB,
    "confidence" DECIMAL(5,4),
    "actionable" BOOLEAN NOT NULL DEFAULT false,
    "acted_upon" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_feedbacks" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "agent_type" "AIAgentType" NOT NULL,
    "interaction_id" UUID,
    "decision_id" UUID,
    "sentiment" "FeedbackSentiment" NOT NULL,
    "rating" INTEGER,
    "comment" TEXT,
    "feedback_by" UUID,
    "feedback_context" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_definitions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "formula" TEXT,
    "aggregation" VARCHAR(20) NOT NULL DEFAULT 'SUM',
    "unit" VARCHAR(50),
    "category" VARCHAR(100),
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "metric_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_snapshots" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "metric_definition_id" UUID NOT NULL,
    "value" DECIMAL(16,4) NOT NULL,
    "previous_value" DECIMAL(16,4),
    "change_percent" DECIMAL(8,4),
    "dimensions" JSONB,
    "period_start" TIMESTAMPTZ NOT NULL,
    "period_end" TIMESTAMPTZ NOT NULL,
    "computed_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_widgets" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "widget_type" VARCHAR(50) NOT NULL,
    "config" JSONB NOT NULL,
    "position" JSONB,
    "dashboard_id" VARCHAR(100),
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "dashboard_widgets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_identities_tenant_id_customer_id_idx" ON "customer_identities"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "customer_identities_identity_type_idx" ON "customer_identities"("identity_type");

-- CreateIndex
CREATE UNIQUE INDEX "customer_identities_tenant_id_identity_type_identity_value_key" ON "customer_identities"("tenant_id", "identity_type", "identity_value");

-- CreateIndex
CREATE INDEX "customer_addresses_tenant_id_customer_id_idx" ON "customer_addresses"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "customer_addresses_address_type_idx" ON "customer_addresses"("address_type");

-- CreateIndex
CREATE INDEX "customer_devices_tenant_id_customer_id_idx" ON "customer_devices"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "customer_devices_platform_idx" ON "customer_devices"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "customer_devices_tenant_id_customer_id_device_token_key" ON "customer_devices"("tenant_id", "customer_id", "device_token");

-- CreateIndex
CREATE INDEX "customer_channels_tenant_id_customer_id_idx" ON "customer_channels"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "customer_channels_channel_type_idx" ON "customer_channels"("channel_type");

-- CreateIndex
CREATE UNIQUE INDEX "customer_channels_tenant_id_customer_id_channel_type_key" ON "customer_channels"("tenant_id", "customer_id", "channel_type");

-- CreateIndex
CREATE UNIQUE INDEX "customer_preferences_customer_id_key" ON "customer_preferences"("customer_id");

-- CreateIndex
CREATE INDEX "customer_preferences_tenant_id_idx" ON "customer_preferences"("tenant_id");

-- CreateIndex
CREATE INDEX "customer_consents_tenant_id_customer_id_idx" ON "customer_consents"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "customer_consents_consent_type_idx" ON "customer_consents"("consent_type");

-- CreateIndex
CREATE INDEX "customer_consents_status_idx" ON "customer_consents"("status");

-- CreateIndex
CREATE UNIQUE INDEX "customer_consents_tenant_id_customer_id_consent_type_key" ON "customer_consents"("tenant_id", "customer_id", "consent_type");

-- CreateIndex
CREATE INDEX "product_categories_tenant_id_idx" ON "product_categories"("tenant_id");

-- CreateIndex
CREATE INDEX "product_categories_parent_id_idx" ON "product_categories"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_tenant_id_slug_key" ON "product_categories"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "products_tenant_id_idx" ON "products"("tenant_id");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE INDEX "products_tenant_id_name_idx" ON "products"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenant_id_sku_key" ON "products"("tenant_id", "sku");

-- CreateIndex
CREATE INDEX "product_attributes_tenant_id_idx" ON "product_attributes"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_attributes_tenant_id_name_key" ON "product_attributes"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "product_attribute_values_tenant_id_product_id_idx" ON "product_attribute_values"("tenant_id", "product_id");

-- CreateIndex
CREATE INDEX "product_attribute_values_attribute_id_idx" ON "product_attribute_values"("attribute_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_attribute_values_tenant_id_product_id_attribute_id_key" ON "product_attribute_values"("tenant_id", "product_id", "attribute_id");

-- CreateIndex
CREATE INDEX "customer_product_affinities_tenant_id_customer_id_idx" ON "customer_product_affinities"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "customer_product_affinities_tenant_id_product_id_idx" ON "customer_product_affinities"("tenant_id", "product_id");

-- CreateIndex
CREATE INDEX "customer_product_affinities_affinity_score_idx" ON "customer_product_affinities"("affinity_score");

-- CreateIndex
CREATE UNIQUE INDEX "customer_product_affinities_tenant_id_customer_id_product_i_key" ON "customer_product_affinities"("tenant_id", "customer_id", "product_id");

-- CreateIndex
CREATE INDEX "feature_definitions_tenant_id_idx" ON "feature_definitions"("tenant_id");

-- CreateIndex
CREATE INDEX "feature_definitions_status_idx" ON "feature_definitions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "feature_definitions_tenant_id_feature_name_key" ON "feature_definitions"("tenant_id", "feature_name");

-- CreateIndex
CREATE INDEX "feature_versions_tenant_id_feature_definition_id_idx" ON "feature_versions"("tenant_id", "feature_definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "feature_versions_tenant_id_feature_definition_id_version_key" ON "feature_versions"("tenant_id", "feature_definition_id", "version");

-- CreateIndex
CREATE INDEX "feature_computation_runs_tenant_id_feature_definition_id_idx" ON "feature_computation_runs"("tenant_id", "feature_definition_id");

-- CreateIndex
CREATE INDEX "feature_computation_runs_status_idx" ON "feature_computation_runs"("status");

-- CreateIndex
CREATE INDEX "decision_templates_tenant_id_idx" ON "decision_templates"("tenant_id");

-- CreateIndex
CREATE INDEX "decision_templates_goal_type_idx" ON "decision_templates"("goal_type");

-- CreateIndex
CREATE UNIQUE INDEX "decision_templates_tenant_id_name_key" ON "decision_templates"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "decision_rules_tenant_id_decision_id_idx" ON "decision_rules"("tenant_id", "decision_id");

-- CreateIndex
CREATE INDEX "decision_rules_rule_type_idx" ON "decision_rules"("rule_type");

-- CreateIndex
CREATE INDEX "decision_explanations_tenant_id_decision_id_idx" ON "decision_explanations"("tenant_id", "decision_id");

-- CreateIndex
CREATE INDEX "decision_experiments_tenant_id_idx" ON "decision_experiments"("tenant_id");

-- CreateIndex
CREATE INDEX "decision_experiments_status_idx" ON "decision_experiments"("status");

-- CreateIndex
CREATE INDEX "offer_templates_tenant_id_idx" ON "offer_templates"("tenant_id");

-- CreateIndex
CREATE INDEX "offer_templates_offer_type_idx" ON "offer_templates"("offer_type");

-- CreateIndex
CREATE UNIQUE INDEX "offer_templates_tenant_id_name_key" ON "offer_templates"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "offers_tenant_id_idx" ON "offers"("tenant_id");

-- CreateIndex
CREATE INDEX "offers_offer_type_idx" ON "offers"("offer_type");

-- CreateIndex
CREATE INDEX "offers_status_idx" ON "offers"("status");

-- CreateIndex
CREATE INDEX "offers_valid_from_valid_until_idx" ON "offers"("valid_from", "valid_until");

-- CreateIndex
CREATE INDEX "offer_assignments_tenant_id_customer_id_idx" ON "offer_assignments"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "offer_assignments_tenant_id_offer_id_idx" ON "offer_assignments"("tenant_id", "offer_id");

-- CreateIndex
CREATE INDEX "offer_assignments_status_idx" ON "offer_assignments"("status");

-- CreateIndex
CREATE INDEX "offer_performances_computed_at_idx" ON "offer_performances"("computed_at");

-- CreateIndex
CREATE UNIQUE INDEX "offer_performances_tenant_id_offer_id_key" ON "offer_performances"("tenant_id", "offer_id");

-- CreateIndex
CREATE INDEX "workflows_tenant_id_idx" ON "workflows"("tenant_id");

-- CreateIndex
CREATE INDEX "workflows_status_idx" ON "workflows"("status");

-- CreateIndex
CREATE UNIQUE INDEX "workflows_tenant_id_name_key" ON "workflows"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "workflow_steps_tenant_id_workflow_id_idx" ON "workflow_steps"("tenant_id", "workflow_id");

-- CreateIndex
CREATE INDEX "workflow_steps_step_type_idx" ON "workflow_steps"("step_type");

-- CreateIndex
CREATE INDEX "workflow_executions_tenant_id_workflow_id_idx" ON "workflow_executions"("tenant_id", "workflow_id");

-- CreateIndex
CREATE INDEX "workflow_executions_status_idx" ON "workflow_executions"("status");

-- CreateIndex
CREATE INDEX "workflow_executions_started_at_idx" ON "workflow_executions"("started_at");

-- CreateIndex
CREATE INDEX "workflow_execution_steps_tenant_id_execution_id_idx" ON "workflow_execution_steps"("tenant_id", "execution_id");

-- CreateIndex
CREATE INDEX "workflow_execution_steps_step_id_idx" ON "workflow_execution_steps"("step_id");

-- CreateIndex
CREATE INDEX "workflow_execution_steps_status_idx" ON "workflow_execution_steps"("status");

-- CreateIndex
CREATE INDEX "agent_memories_tenant_id_idx" ON "agent_memories"("tenant_id");

-- CreateIndex
CREATE INDEX "agent_memories_agent_type_idx" ON "agent_memories"("agent_type");

-- CreateIndex
CREATE INDEX "agent_memories_memory_type_idx" ON "agent_memories"("memory_type");

-- CreateIndex
CREATE UNIQUE INDEX "agent_memories_tenant_id_agent_type_key_key" ON "agent_memories"("tenant_id", "agent_type", "key");

-- CreateIndex
CREATE INDEX "agent_observations_tenant_id_idx" ON "agent_observations"("tenant_id");

-- CreateIndex
CREATE INDEX "agent_observations_agent_type_idx" ON "agent_observations"("agent_type");

-- CreateIndex
CREATE INDEX "agent_observations_observation_type_idx" ON "agent_observations"("observation_type");

-- CreateIndex
CREATE INDEX "agent_observations_actionable_idx" ON "agent_observations"("actionable");

-- CreateIndex
CREATE INDEX "agent_feedbacks_tenant_id_idx" ON "agent_feedbacks"("tenant_id");

-- CreateIndex
CREATE INDEX "agent_feedbacks_agent_type_idx" ON "agent_feedbacks"("agent_type");

-- CreateIndex
CREATE INDEX "agent_feedbacks_sentiment_idx" ON "agent_feedbacks"("sentiment");

-- CreateIndex
CREATE INDEX "agent_feedbacks_interaction_id_idx" ON "agent_feedbacks"("interaction_id");

-- CreateIndex
CREATE INDEX "metric_definitions_tenant_id_idx" ON "metric_definitions"("tenant_id");

-- CreateIndex
CREATE INDEX "metric_definitions_category_idx" ON "metric_definitions"("category");

-- CreateIndex
CREATE UNIQUE INDEX "metric_definitions_tenant_id_name_key" ON "metric_definitions"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "metric_snapshots_tenant_id_metric_definition_id_idx" ON "metric_snapshots"("tenant_id", "metric_definition_id");

-- CreateIndex
CREATE INDEX "metric_snapshots_period_start_period_end_idx" ON "metric_snapshots"("period_start", "period_end");

-- CreateIndex
CREATE INDEX "metric_snapshots_computed_at_idx" ON "metric_snapshots"("computed_at");

-- CreateIndex
CREATE INDEX "dashboard_widgets_tenant_id_idx" ON "dashboard_widgets"("tenant_id");

-- CreateIndex
CREATE INDEX "dashboard_widgets_dashboard_id_idx" ON "dashboard_widgets"("dashboard_id");

-- CreateIndex
CREATE INDEX "dashboard_widgets_widget_type_idx" ON "dashboard_widgets"("widget_type");

-- AddForeignKey
ALTER TABLE "customer_identities" ADD CONSTRAINT "customer_identities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_identities" ADD CONSTRAINT "customer_identities_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_devices" ADD CONSTRAINT "customer_devices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_devices" ADD CONSTRAINT "customer_devices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_channels" ADD CONSTRAINT "customer_channels_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_channels" ADD CONSTRAINT "customer_channels_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_preferences" ADD CONSTRAINT "customer_preferences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_preferences" ADD CONSTRAINT "customer_preferences_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_consents" ADD CONSTRAINT "customer_consents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_consents" ADD CONSTRAINT "customer_consents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attributes" ADD CONSTRAINT "product_attributes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "product_attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_product_affinities" ADD CONSTRAINT "customer_product_affinities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_product_affinities" ADD CONSTRAINT "customer_product_affinities_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_product_affinities" ADD CONSTRAINT "customer_product_affinities_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_definitions" ADD CONSTRAINT "feature_definitions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_versions" ADD CONSTRAINT "feature_versions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_versions" ADD CONSTRAINT "feature_versions_feature_definition_id_fkey" FOREIGN KEY ("feature_definition_id") REFERENCES "feature_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_computation_runs" ADD CONSTRAINT "feature_computation_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_computation_runs" ADD CONSTRAINT "feature_computation_runs_feature_definition_id_fkey" FOREIGN KEY ("feature_definition_id") REFERENCES "feature_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_templates" ADD CONSTRAINT "decision_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_rules" ADD CONSTRAINT "decision_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_rules" ADD CONSTRAINT "decision_rules_decision_id_fkey" FOREIGN KEY ("decision_id") REFERENCES "decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_explanations" ADD CONSTRAINT "decision_explanations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_explanations" ADD CONSTRAINT "decision_explanations_decision_id_fkey" FOREIGN KEY ("decision_id") REFERENCES "decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_experiments" ADD CONSTRAINT "decision_experiments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_templates" ADD CONSTRAINT "offer_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "offer_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_assignments" ADD CONSTRAINT "offer_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_assignments" ADD CONSTRAINT "offer_assignments_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_assignments" ADD CONSTRAINT "offer_assignments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_performances" ADD CONSTRAINT "offer_performances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_performances" ADD CONSTRAINT "offer_performances_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_execution_steps" ADD CONSTRAINT "workflow_execution_steps_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_execution_steps" ADD CONSTRAINT "workflow_execution_steps_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "workflow_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_execution_steps" ADD CONSTRAINT "workflow_execution_steps_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "workflow_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_memories" ADD CONSTRAINT "agent_memories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_observations" ADD CONSTRAINT "agent_observations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_feedbacks" ADD CONSTRAINT "agent_feedbacks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_definitions" ADD CONSTRAINT "metric_definitions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_snapshots" ADD CONSTRAINT "metric_snapshots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_snapshots" ADD CONSTRAINT "metric_snapshots_metric_definition_id_fkey" FOREIGN KEY ("metric_definition_id") REFERENCES "metric_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
