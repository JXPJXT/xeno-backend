-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TRIAL');

-- CreateEnum
CREATE TYPE "TenantPlan" AS ENUM ('FREE', 'STARTER', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'MARKETER', 'VIEWER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'INVITED');

-- CreateEnum
CREATE TYPE "CustomerGender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('SYSTEM', 'USER', 'API');

-- CreateEnum
CREATE TYPE "PersonaAssignedBy" AS ENUM ('SYSTEM', 'MANUAL', 'AI');

-- CreateEnum
CREATE TYPE "PersonaStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SegmentType" AS ENUM ('STATIC', 'DYNAMIC', 'AI_GENERATED');

-- CreateEnum
CREATE TYPE "SegmentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('REACTIVATION', 'RETENTION', 'ACQUISITION', 'UPSELL', 'CROSS_SELL', 'ENGAGEMENT', 'WIN_BACK', 'LOYALTY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DecisionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('ONE_TIME', 'RECURRING', 'TRIGGERED', 'AI_GENERATED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'WHATSAPP', 'MULTI_CHANNEL');

-- CreateEnum
CREATE TYPE "CampaignAudienceStatus" AS ENUM ('INCLUDED', 'EXCLUDED', 'SENT', 'SKIPPED');

-- CreateEnum
CREATE TYPE "CommunicationStatus" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "DeliveryEventType" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'COMPLAINED', 'UNSUBSCRIBED', 'FAILED');

-- CreateEnum
CREATE TYPE "AttributionModel" AS ENUM ('FIRST_TOUCH', 'LAST_TOUCH', 'LINEAR', 'TIME_DECAY');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT', 'APPROVE', 'REJECT', 'LAUNCH', 'PAUSE', 'CANCEL');

-- CreateEnum
CREATE TYPE "AIAgentType" AS ENUM ('INTENT', 'CONTENT', 'INSIGHTS', 'DECISION');

-- CreateEnum
CREATE TYPE "AIInteractionStatus" AS ENUM ('SUCCESS', 'ERROR', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "ChannelProviderStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DEGRADED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "domain" VARCHAR(255),
    "settings" JSONB DEFAULT '{}',
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "plan" "TenantPlan" NOT NULL DEFAULT 'FREE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "external_id" VARCHAR(255),
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "gender" "CustomerGender" NOT NULL DEFAULT 'UNKNOWN',
    "date_of_birth" DATE,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "country" VARCHAR(10),
    "metadata" JSONB DEFAULT '{}',
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "acquisition_source" VARCHAR(100),
    "acquisition_date" TIMESTAMPTZ,
    "first_seen_at" TIMESTAMPTZ,
    "last_seen_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_tags" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "color" VARCHAR(7),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_tag_assignments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_tag_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "external_id" VARCHAR(255),
    "order_number" VARCHAR(100),
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "total_amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "discount_amount" DECIMAL(12,2),
    "tax_amount" DECIMAL(12,2),
    "channel" VARCHAR(50),
    "metadata" JSONB DEFAULT '{}',
    "ordered_at" TIMESTAMPTZ NOT NULL,
    "delivered_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" VARCHAR(255) NOT NULL,
    "product_name" VARCHAR(255) NOT NULL,
    "category" VARCHAR(100),
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "event_data" JSONB NOT NULL,
    "actor_type" "ActorType" NOT NULL DEFAULT 'SYSTEM',
    "actor_id" UUID,
    "correlation_id" UUID,
    "idempotency_key" VARCHAR(255),
    "version" INTEGER NOT NULL DEFAULT 1,
    "occurred_at" TIMESTAMPTZ NOT NULL,
    "processed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_metrics" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "total_revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "avg_order_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "first_order_at" TIMESTAMPTZ,
    "last_order_at" TIMESTAMPTZ,
    "days_since_last_order" INTEGER,
    "order_frequency_days" DECIMAL(8,2),
    "rfm_recency_score" INTEGER,
    "rfm_frequency_score" INTEGER,
    "rfm_monetary_score" INTEGER,
    "rfm_combined_score" INTEGER,
    "engagement_score" DECIMAL(5,2),
    "churn_risk_score" DECIMAL(5,4),
    "lifetime_value" DECIMAL(12,2),
    "predicted_next_order_at" TIMESTAMPTZ,
    "computed_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "customer_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_metrics_history" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "metrics_snapshot" JSONB NOT NULL,
    "computed_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_metrics_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_features" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "feature_name" VARCHAR(100) NOT NULL,
    "feature_value" JSONB NOT NULL,
    "feature_version" INTEGER NOT NULL DEFAULT 1,
    "computed_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "criteria" JSONB,
    "color" VARCHAR(7),
    "icon" VARCHAR(50),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "status" "PersonaStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_personas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "confidence" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ,
    "assigned_by" "PersonaAssignedBy" NOT NULL DEFAULT 'SYSTEM',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "segments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" "SegmentType" NOT NULL DEFAULT 'DYNAMIC',
    "rules" JSONB,
    "customer_count" INTEGER NOT NULL DEFAULT 0,
    "status" "SegmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_computed_at" TIMESTAMPTZ,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "segment_customers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "segment_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "added_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "segment_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "segment_versions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "segment_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "rules" JSONB,
    "customer_count" INTEGER NOT NULL DEFAULT 0,
    "change_reason" TEXT,
    "changed_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "segment_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_goals" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "goal_type" "GoalType" NOT NULL DEFAULT 'CUSTOM',
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB DEFAULT '{}',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "business_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decisions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "goal_id" UUID,
    "goal" TEXT NOT NULL,
    "intent" JSONB,
    "status" "DecisionStatus" NOT NULL DEFAULT 'PENDING',
    "audience" JSONB,
    "channel_recommendation" JSONB,
    "offer_recommendation" JSONB,
    "timing_recommendation" JSONB,
    "content_recommendation" JSONB,
    "reasoning" TEXT,
    "confidence" DECIMAL(5,4),
    "model_used" VARCHAR(100),
    "tokens_used" INTEGER,
    "cost" DECIMAL(8,4),
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_outcomes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "decision_id" UUID NOT NULL,
    "campaign_id" UUID,
    "metrics" JSONB,
    "effectiveness_score" DECIMAL(5,4),
    "feedback" TEXT,
    "feedback_by" UUID,
    "evaluated_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" "CampaignType" NOT NULL DEFAULT 'ONE_TIME',
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "channel" "ChannelType" NOT NULL DEFAULT 'EMAIL',
    "segment_id" UUID,
    "decision_id" UUID,
    "goal" TEXT,
    "schedule" JSONB,
    "budget" JSONB,
    "metadata" JSONB DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "scheduled_at" TIMESTAMPTZ,
    "launched_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_versions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "change_reason" TEXT,
    "changed_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_messages" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "variant_name" VARCHAR(100) NOT NULL,
    "channel" "ChannelType" NOT NULL,
    "subject" VARCHAR(500),
    "body" TEXT NOT NULL,
    "template_data" JSONB,
    "metadata" JSONB DEFAULT '{}',
    "is_control" BOOLEAN NOT NULL DEFAULT false,
    "weight" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "campaign_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_audiences" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "segment_id" UUID,
    "status" "CampaignAudienceStatus" NOT NULL DEFAULT 'INCLUDED',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_audiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "campaign_id" UUID,
    "message_id" UUID,
    "customer_id" UUID NOT NULL,
    "channel" "ChannelType" NOT NULL,
    "status" "CommunicationStatus" NOT NULL DEFAULT 'QUEUED',
    "provider" VARCHAR(50),
    "provider_message_id" VARCHAR(255),
    "error_code" VARCHAR(50),
    "error_message" TEXT,
    "attempt_count" INTEGER NOT NULL DEFAULT 1,
    "cost" DECIMAL(8,4),
    "sent_at" TIMESTAMPTZ,
    "delivered_at" TIMESTAMPTZ,
    "failed_at" TIMESTAMPTZ,
    "metadata" JSONB DEFAULT '{}',
    "idempotency_key" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "communication_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_receipts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "communication_log_id" UUID NOT NULL,
    "event_type" "DeliveryEventType" NOT NULL,
    "raw_payload" JSONB,
    "metadata" JSONB,
    "occurred_at" TIMESTAMPTZ NOT NULL,
    "processed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_analytics" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "total_sent" INTEGER NOT NULL DEFAULT 0,
    "total_delivered" INTEGER NOT NULL DEFAULT 0,
    "total_opened" INTEGER NOT NULL DEFAULT 0,
    "total_clicked" INTEGER NOT NULL DEFAULT 0,
    "total_converted" INTEGER NOT NULL DEFAULT 0,
    "total_bounced" INTEGER NOT NULL DEFAULT 0,
    "total_failed" INTEGER NOT NULL DEFAULT 0,
    "total_unsubscribed" INTEGER NOT NULL DEFAULT 0,
    "delivery_rate" DECIMAL(5,4),
    "open_rate" DECIMAL(5,4),
    "click_rate" DECIMAL(5,4),
    "conversion_rate" DECIMAL(5,4),
    "revenue_generated" DECIMAL(12,2),
    "cost_incurred" DECIMAL(12,2),
    "roi" DECIMAL(8,4),
    "computed_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "campaign_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_attributions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "revenue" DECIMAL(12,2) NOT NULL,
    "attribution_model" "AttributionModel" NOT NULL DEFAULT 'LAST_TOUCH',
    "attribution_weight" DECIMAL(5,4) NOT NULL DEFAULT 1,
    "attributed_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_attributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "action" "AuditAction" NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_interactions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "agent_type" "AIAgentType" NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT,
    "tokens_input" INTEGER,
    "tokens_output" INTEGER,
    "cost" DECIMAL(8,6),
    "latency_ms" INTEGER,
    "status" "AIInteractionStatus" NOT NULL DEFAULT 'SUCCESS',
    "error_message" TEXT,
    "context" JSONB,
    "correlation_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_examples" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "context" JSONB NOT NULL,
    "decision" JSONB NOT NULL,
    "outcome" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_examples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_rules" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "endpoint" VARCHAR(255),
    "max_requests" INTEGER NOT NULL,
    "window_ms" INTEGER NOT NULL,
    "scope" VARCHAR(20) NOT NULL DEFAULT 'TENANT',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "rate_limit_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_usage_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "endpoint" VARCHAR(255) NOT NULL,
    "method" VARCHAR(10) NOT NULL,
    "status_code" INTEGER NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_providers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "channel" "ChannelType" NOT NULL,
    "config" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "ChannelProviderStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "channel_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "channel_provider_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "campaign_id" UUID,
    "event_type" "DeliveryEventType" NOT NULL,
    "message_content" TEXT,
    "simulated_delay" INTEGER,
    "metadata" JSONB,
    "occurred_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "customers_tenant_id_idx" ON "customers"("tenant_id");

-- CreateIndex
CREATE INDEX "customers_tenant_id_email_idx" ON "customers"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "customers_status_idx" ON "customers"("status");

-- CreateIndex
CREATE INDEX "customers_city_idx" ON "customers"("city");

-- CreateIndex
CREATE INDEX "customers_country_idx" ON "customers"("country");

-- CreateIndex
CREATE INDEX "customers_acquisition_source_idx" ON "customers"("acquisition_source");

-- CreateIndex
CREATE UNIQUE INDEX "customers_tenant_id_external_id_key" ON "customers"("tenant_id", "external_id");

-- CreateIndex
CREATE INDEX "customer_tags_tenant_id_idx" ON "customer_tags"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_tags_tenant_id_name_key" ON "customer_tags"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "customer_tag_assignments_tenant_id_idx" ON "customer_tag_assignments"("tenant_id");

-- CreateIndex
CREATE INDEX "customer_tag_assignments_customer_id_idx" ON "customer_tag_assignments"("customer_id");

-- CreateIndex
CREATE INDEX "customer_tag_assignments_tag_id_idx" ON "customer_tag_assignments"("tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_tag_assignments_customer_id_tag_id_key" ON "customer_tag_assignments"("customer_id", "tag_id");

-- CreateIndex
CREATE INDEX "orders_tenant_id_idx" ON "orders"("tenant_id");

-- CreateIndex
CREATE INDEX "orders_tenant_id_customer_id_idx" ON "orders"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "orders_tenant_id_external_id_idx" ON "orders"("tenant_id", "external_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_ordered_at_idx" ON "orders"("ordered_at");

-- CreateIndex
CREATE INDEX "orders_tenant_id_ordered_at_idx" ON "orders"("tenant_id", "ordered_at");

-- CreateIndex
CREATE INDEX "order_items_tenant_id_order_id_idx" ON "order_items"("tenant_id", "order_id");

-- CreateIndex
CREATE INDEX "order_items_product_id_idx" ON "order_items"("product_id");

-- CreateIndex
CREATE INDEX "order_items_category_idx" ON "order_items"("category");

-- CreateIndex
CREATE UNIQUE INDEX "events_idempotency_key_key" ON "events"("idempotency_key");

-- CreateIndex
CREATE INDEX "events_tenant_id_idx" ON "events"("tenant_id");

-- CreateIndex
CREATE INDEX "events_tenant_id_entity_type_entity_id_idx" ON "events"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "events_event_type_idx" ON "events"("event_type");

-- CreateIndex
CREATE INDEX "events_tenant_id_event_type_idx" ON "events"("tenant_id", "event_type");

-- CreateIndex
CREATE INDEX "events_correlation_id_idx" ON "events"("correlation_id");

-- CreateIndex
CREATE INDEX "events_occurred_at_idx" ON "events"("occurred_at");

-- CreateIndex
CREATE INDEX "events_tenant_id_occurred_at_idx" ON "events"("tenant_id", "occurred_at");

-- CreateIndex
CREATE INDEX "customer_metrics_rfm_combined_score_idx" ON "customer_metrics"("rfm_combined_score");

-- CreateIndex
CREATE INDEX "customer_metrics_churn_risk_score_idx" ON "customer_metrics"("churn_risk_score");

-- CreateIndex
CREATE INDEX "customer_metrics_engagement_score_idx" ON "customer_metrics"("engagement_score");

-- CreateIndex
CREATE INDEX "customer_metrics_computed_at_idx" ON "customer_metrics"("computed_at");

-- CreateIndex
CREATE UNIQUE INDEX "customer_metrics_tenant_id_customer_id_key" ON "customer_metrics"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "customer_metrics_history_tenant_id_customer_id_idx" ON "customer_metrics_history"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "customer_metrics_history_computed_at_idx" ON "customer_metrics_history"("computed_at");

-- CreateIndex
CREATE INDEX "customer_features_tenant_id_customer_id_idx" ON "customer_features"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "customer_features_feature_name_idx" ON "customer_features"("feature_name");

-- CreateIndex
CREATE INDEX "customer_features_computed_at_idx" ON "customer_features"("computed_at");

-- CreateIndex
CREATE UNIQUE INDEX "customer_features_tenant_id_customer_id_feature_name_key" ON "customer_features"("tenant_id", "customer_id", "feature_name");

-- CreateIndex
CREATE INDEX "personas_tenant_id_idx" ON "personas"("tenant_id");

-- CreateIndex
CREATE INDEX "personas_status_idx" ON "personas"("status");

-- CreateIndex
CREATE UNIQUE INDEX "personas_tenant_id_name_key" ON "personas"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "customer_personas_tenant_id_persona_id_idx" ON "customer_personas"("tenant_id", "persona_id");

-- CreateIndex
CREATE INDEX "customer_personas_confidence_idx" ON "customer_personas"("confidence");

-- CreateIndex
CREATE INDEX "customer_personas_assigned_at_idx" ON "customer_personas"("assigned_at");

-- CreateIndex
CREATE UNIQUE INDEX "customer_personas_tenant_id_customer_id_persona_id_key" ON "customer_personas"("tenant_id", "customer_id", "persona_id");

-- CreateIndex
CREATE INDEX "segments_tenant_id_idx" ON "segments"("tenant_id");

-- CreateIndex
CREATE INDEX "segments_type_idx" ON "segments"("type");

-- CreateIndex
CREATE INDEX "segments_status_idx" ON "segments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "segments_tenant_id_name_key" ON "segments"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "segment_customers_tenant_id_customer_id_idx" ON "segment_customers"("tenant_id", "customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "segment_customers_tenant_id_segment_id_customer_id_key" ON "segment_customers"("tenant_id", "segment_id", "customer_id");

-- CreateIndex
CREATE INDEX "segment_versions_tenant_id_segment_id_idx" ON "segment_versions"("tenant_id", "segment_id");

-- CreateIndex
CREATE UNIQUE INDEX "segment_versions_tenant_id_segment_id_version_key" ON "segment_versions"("tenant_id", "segment_id", "version");

-- CreateIndex
CREATE INDEX "business_goals_tenant_id_idx" ON "business_goals"("tenant_id");

-- CreateIndex
CREATE INDEX "business_goals_goal_type_idx" ON "business_goals"("goal_type");

-- CreateIndex
CREATE INDEX "business_goals_status_idx" ON "business_goals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "business_goals_tenant_id_name_key" ON "business_goals"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "decisions_tenant_id_idx" ON "decisions"("tenant_id");

-- CreateIndex
CREATE INDEX "decisions_status_idx" ON "decisions"("status");

-- CreateIndex
CREATE INDEX "decisions_tenant_id_status_idx" ON "decisions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "decisions_created_at_idx" ON "decisions"("created_at");

-- CreateIndex
CREATE INDEX "decision_outcomes_tenant_id_decision_id_idx" ON "decision_outcomes"("tenant_id", "decision_id");

-- CreateIndex
CREATE INDEX "decision_outcomes_tenant_id_campaign_id_idx" ON "decision_outcomes"("tenant_id", "campaign_id");

-- CreateIndex
CREATE INDEX "campaigns_tenant_id_idx" ON "campaigns"("tenant_id");

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");

-- CreateIndex
CREATE INDEX "campaigns_type_idx" ON "campaigns"("type");

-- CreateIndex
CREATE INDEX "campaigns_channel_idx" ON "campaigns"("channel");

-- CreateIndex
CREATE INDEX "campaigns_tenant_id_status_idx" ON "campaigns"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "campaigns_segment_id_idx" ON "campaigns"("segment_id");

-- CreateIndex
CREATE INDEX "campaigns_decision_id_idx" ON "campaigns"("decision_id");

-- CreateIndex
CREATE INDEX "campaigns_launched_at_idx" ON "campaigns"("launched_at");

-- CreateIndex
CREATE INDEX "campaign_versions_tenant_id_campaign_id_idx" ON "campaign_versions"("tenant_id", "campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_versions_tenant_id_campaign_id_version_key" ON "campaign_versions"("tenant_id", "campaign_id", "version");

-- CreateIndex
CREATE INDEX "campaign_messages_tenant_id_campaign_id_idx" ON "campaign_messages"("tenant_id", "campaign_id");

-- CreateIndex
CREATE INDEX "campaign_messages_channel_idx" ON "campaign_messages"("channel");

-- CreateIndex
CREATE INDEX "campaign_audiences_campaign_id_idx" ON "campaign_audiences"("campaign_id");

-- CreateIndex
CREATE INDEX "campaign_audiences_customer_id_idx" ON "campaign_audiences"("customer_id");

-- CreateIndex
CREATE INDEX "campaign_audiences_tenant_id_idx" ON "campaign_audiences"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_audiences_tenant_id_campaign_id_customer_id_key" ON "campaign_audiences"("tenant_id", "campaign_id", "customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "communication_logs_idempotency_key_key" ON "communication_logs"("idempotency_key");

-- CreateIndex
CREATE INDEX "communication_logs_tenant_id_idx" ON "communication_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "communication_logs_tenant_id_campaign_id_idx" ON "communication_logs"("tenant_id", "campaign_id");

-- CreateIndex
CREATE INDEX "communication_logs_tenant_id_customer_id_idx" ON "communication_logs"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "communication_logs_status_idx" ON "communication_logs"("status");

-- CreateIndex
CREATE INDEX "communication_logs_channel_idx" ON "communication_logs"("channel");

-- CreateIndex
CREATE INDEX "communication_logs_sent_at_idx" ON "communication_logs"("sent_at");

-- CreateIndex
CREATE INDEX "delivery_receipts_tenant_id_communication_log_id_idx" ON "delivery_receipts"("tenant_id", "communication_log_id");

-- CreateIndex
CREATE INDEX "delivery_receipts_event_type_idx" ON "delivery_receipts"("event_type");

-- CreateIndex
CREATE INDEX "delivery_receipts_occurred_at_idx" ON "delivery_receipts"("occurred_at");

-- CreateIndex
CREATE INDEX "campaign_analytics_computed_at_idx" ON "campaign_analytics"("computed_at");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_analytics_tenant_id_campaign_id_key" ON "campaign_analytics"("tenant_id", "campaign_id");

-- CreateIndex
CREATE INDEX "revenue_attributions_tenant_id_campaign_id_idx" ON "revenue_attributions"("tenant_id", "campaign_id");

-- CreateIndex
CREATE INDEX "revenue_attributions_tenant_id_order_id_idx" ON "revenue_attributions"("tenant_id", "order_id");

-- CreateIndex
CREATE INDEX "revenue_attributions_tenant_id_customer_id_idx" ON "revenue_attributions"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_entity_type_entity_id_idx" ON "audit_logs"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_user_id_idx" ON "audit_logs"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_created_at_idx" ON "audit_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_interactions_tenant_id_idx" ON "ai_interactions"("tenant_id");

-- CreateIndex
CREATE INDEX "ai_interactions_agent_type_idx" ON "ai_interactions"("agent_type");

-- CreateIndex
CREATE INDEX "ai_interactions_status_idx" ON "ai_interactions"("status");

-- CreateIndex
CREATE INDEX "ai_interactions_correlation_id_idx" ON "ai_interactions"("correlation_id");

-- CreateIndex
CREATE INDEX "ai_interactions_created_at_idx" ON "ai_interactions"("created_at");

-- CreateIndex
CREATE INDEX "learning_examples_tenant_id_idx" ON "learning_examples"("tenant_id");

-- CreateIndex
CREATE INDEX "learning_examples_created_at_idx" ON "learning_examples"("created_at");

-- CreateIndex
CREATE INDEX "rate_limit_rules_tenant_id_idx" ON "rate_limit_rules"("tenant_id");

-- CreateIndex
CREATE INDEX "rate_limit_rules_is_active_idx" ON "rate_limit_rules"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limit_rules_tenant_id_name_key" ON "rate_limit_rules"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "api_usage_logs_tenant_id_idx" ON "api_usage_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "api_usage_logs_tenant_id_endpoint_idx" ON "api_usage_logs"("tenant_id", "endpoint");

-- CreateIndex
CREATE INDEX "api_usage_logs_tenant_id_user_id_idx" ON "api_usage_logs"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "api_usage_logs_created_at_idx" ON "api_usage_logs"("created_at");

-- CreateIndex
CREATE INDEX "channel_providers_tenant_id_idx" ON "channel_providers"("tenant_id");

-- CreateIndex
CREATE INDEX "channel_providers_channel_idx" ON "channel_providers"("channel");

-- CreateIndex
CREATE INDEX "channel_providers_status_idx" ON "channel_providers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "channel_providers_tenant_id_name_channel_key" ON "channel_providers"("tenant_id", "name", "channel");

-- CreateIndex
CREATE INDEX "delivery_events_tenant_id_idx" ON "delivery_events"("tenant_id");

-- CreateIndex
CREATE INDEX "delivery_events_channel_provider_id_idx" ON "delivery_events"("channel_provider_id");

-- CreateIndex
CREATE INDEX "delivery_events_recipient_id_idx" ON "delivery_events"("recipient_id");

-- CreateIndex
CREATE INDEX "delivery_events_event_type_idx" ON "delivery_events"("event_type");

-- CreateIndex
CREATE INDEX "delivery_events_occurred_at_idx" ON "delivery_events"("occurred_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_tag_assignments" ADD CONSTRAINT "customer_tag_assignments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_tag_assignments" ADD CONSTRAINT "customer_tag_assignments_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "customer_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_metrics" ADD CONSTRAINT "customer_metrics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_metrics" ADD CONSTRAINT "customer_metrics_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_metrics_history" ADD CONSTRAINT "customer_metrics_history_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_metrics_history" ADD CONSTRAINT "customer_metrics_history_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_features" ADD CONSTRAINT "customer_features_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_features" ADD CONSTRAINT "customer_features_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personas" ADD CONSTRAINT "personas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_personas" ADD CONSTRAINT "customer_personas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_personas" ADD CONSTRAINT "customer_personas_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_personas" ADD CONSTRAINT "customer_personas_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segments" ADD CONSTRAINT "segments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segments" ADD CONSTRAINT "segments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segment_customers" ADD CONSTRAINT "segment_customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segment_customers" ADD CONSTRAINT "segment_customers_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segment_customers" ADD CONSTRAINT "segment_customers_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segment_versions" ADD CONSTRAINT "segment_versions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segment_versions" ADD CONSTRAINT "segment_versions_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segment_versions" ADD CONSTRAINT "segment_versions_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_goals" ADD CONSTRAINT "business_goals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_goals" ADD CONSTRAINT "business_goals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "business_goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_outcomes" ADD CONSTRAINT "decision_outcomes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_outcomes" ADD CONSTRAINT "decision_outcomes_decision_id_fkey" FOREIGN KEY ("decision_id") REFERENCES "decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_outcomes" ADD CONSTRAINT "decision_outcomes_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_outcomes" ADD CONSTRAINT "decision_outcomes_feedback_by_fkey" FOREIGN KEY ("feedback_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "segments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_decision_id_fkey" FOREIGN KEY ("decision_id") REFERENCES "decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_versions" ADD CONSTRAINT "campaign_versions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_versions" ADD CONSTRAINT "campaign_versions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_versions" ADD CONSTRAINT "campaign_versions_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_messages" ADD CONSTRAINT "campaign_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_messages" ADD CONSTRAINT "campaign_messages_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_audiences" ADD CONSTRAINT "campaign_audiences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_audiences" ADD CONSTRAINT "campaign_audiences_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_audiences" ADD CONSTRAINT "campaign_audiences_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_audiences" ADD CONSTRAINT "campaign_audiences_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "segments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "campaign_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_receipts" ADD CONSTRAINT "delivery_receipts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_receipts" ADD CONSTRAINT "delivery_receipts_communication_log_id_fkey" FOREIGN KEY ("communication_log_id") REFERENCES "communication_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_analytics" ADD CONSTRAINT "campaign_analytics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_analytics" ADD CONSTRAINT "campaign_analytics_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_attributions" ADD CONSTRAINT "revenue_attributions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_attributions" ADD CONSTRAINT "revenue_attributions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_attributions" ADD CONSTRAINT "revenue_attributions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_attributions" ADD CONSTRAINT "revenue_attributions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_interactions" ADD CONSTRAINT "ai_interactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_examples" ADD CONSTRAINT "learning_examples_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_limit_rules" ADD CONSTRAINT "rate_limit_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_usage_logs" ADD CONSTRAINT "api_usage_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_providers" ADD CONSTRAINT "channel_providers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_events" ADD CONSTRAINT "delivery_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_events" ADD CONSTRAINT "delivery_events_channel_provider_id_fkey" FOREIGN KEY ("channel_provider_id") REFERENCES "channel_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
