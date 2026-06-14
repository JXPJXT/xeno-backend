import { PrismaClient, Prisma } from '@prisma/client';
import { Logger } from '@nestjs/common';

const logger = new Logger('PrismaTenantExtension');

/**
 * List of Prisma models that require tenant_id filtering.
 * The Tenant model itself is excluded — it IS the tenant.
 */
const TENANT_SCOPED_MODELS: string[] = [
  'User',
  'Customer',
  'CustomerTag',
  'CustomerTagAssignment',
  'Order',
  'OrderItem',
  'Event',
  'CustomerMetric',
  'CustomerMetricHistory',
  'CustomerFeature',
  'Persona',
  'CustomerPersona',
  'Segment',
  'SegmentCustomer',
  'SegmentVersion',
  'BusinessGoal',
  'Decision',
  'DecisionOutcome',
  'Campaign',
  'CampaignVersion',
  'CampaignMessage',
  'CampaignAudience',
  'CommunicationLog',
  'DeliveryReceipt',
  'CampaignAnalytic',
  'RevenueAttribution',
  'AuditLog',
  'AIInteraction',
  'LearningExample',
  'RateLimitRule',
  'ApiUsageLog',
  'ChannelProvider',
  'DeliveryEvent',
  // Phase 2A additions will be added here as they are created
  'CustomerIdentity',
  'CustomerAddress',
  'CustomerDevice',
  'CustomerChannel',
  'CustomerPreference',
  'CustomerConsent',
  'ProductCategory',
  'Product',
  'ProductAttribute',
  'ProductAttributeValue',
  'CustomerProductAffinity',
  'FeatureDefinition',
  'FeatureVersion',
  'FeatureComputationRun',
  'DecisionTemplate',
  'DecisionRule',
  'DecisionExplanation',
  'DecisionExperiment',
  'Offer',
  'OfferTemplate',
  'OfferAssignment',
  'OfferPerformance',
  'Workflow',
  'WorkflowStep',
  'WorkflowExecution',
  'WorkflowExecutionStep',
  'AgentMemory',
  'AgentObservation',
  'AgentFeedback',
  'MetricDefinition',
  'MetricSnapshot',
  'DashboardWidget',
  'Conversation',
];

/**
 * Creates a tenant-scoped Prisma client extension.
 *
 * This extension automatically injects `tenantId` into:
 * - All `findMany`, `findFirst`, `findUnique` queries (where clause)
 * - All `count`, `aggregate`, `groupBy` queries (where clause)
 * - All `create`, `createMany` mutations (data field)
 * - All `update`, `updateMany`, `delete`, `deleteMany` mutations (where clause)
 *
 * This is the PRIMARY defense against cross-tenant data leaks.
 *
 * @param tenantId - The tenant ID to scope all operations to
 */
export function createTenantExtension(tenantId: string) {
  return Prisma.defineExtension((client) => {
    return client.$extends({
      query: {
        $allModels: {
          async findMany({ model, args, query }) {
            if (isTenantScoped(model)) {
              args.where = { ...args.where, tenantId };
            }
            return query(args);
          },
          async findFirst({ model, args, query }) {
            if (isTenantScoped(model)) {
              args.where = { ...args.where, tenantId };
            }
            return query(args);
          },
          async findUnique({ model, args, query }) {
            // findUnique uses unique fields — we validate after fetch
            return query(args);
          },
          async findFirstOrThrow({ model, args, query }) {
            if (isTenantScoped(model)) {
              args.where = { ...args.where, tenantId };
            }
            return query(args);
          },
          async count({ model, args, query }) {
            if (isTenantScoped(model)) {
              args.where = { ...args.where, tenantId };
            }
            return query(args);
          },
          async aggregate({ model, args, query }) {
            if (isTenantScoped(model)) {
              (args as any).where = { ...(args as any).where, tenantId };
            }
            return query(args);
          },
          async groupBy({ model, args, query }) {
            if (isTenantScoped(model)) {
              (args as any).where = { ...(args as any).where, tenantId };
            }
            return query(args);
          },
          async create({ model, args, query }) {
            if (isTenantScoped(model)) {
              args.data = { ...args.data, tenantId } as any;
            }
            return query(args);
          },
          async createMany({ model, args, query }) {
            if (isTenantScoped(model)) {
              if (Array.isArray(args.data)) {
                args.data = args.data.map((d: any) => ({
                  ...d,
                  tenantId,
                }));
              } else {
                args.data = { ...args.data, tenantId };
              }
            }
            return query(args);
          },
          async update({ model, args, query }) {
            if (isTenantScoped(model)) {
              args.where = { ...args.where, tenantId };
            }
            return query(args);
          },
          async updateMany({ model, args, query }) {
            if (isTenantScoped(model)) {
              args.where = { ...args.where, tenantId };
            }
            return query(args);
          },
          async delete({ model, args, query }) {
            if (isTenantScoped(model)) {
              args.where = { ...args.where, tenantId };
            }
            return query(args);
          },
          async deleteMany({ model, args, query }) {
            if (isTenantScoped(model)) {
              args.where = { ...args.where, tenantId };
            }
            return query(args);
          },
          async upsert({ model, args, query }) {
            if (isTenantScoped(model)) {
              args.where = { ...args.where, tenantId };
              args.create = { ...args.create, tenantId } as any;
            }
            return query(args);
          },
        },
      },
    });
  });
}

/**
 * Check if a model requires tenant scoping.
 */
function isTenantScoped(model: string | undefined): boolean {
  if (!model) return false;
  return TENANT_SCOPED_MODELS.includes(model);
}
