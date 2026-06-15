# 📦 StyleHub Xeno CRM — Backend API Server

The backend of the **StyleHub Xeno CRM** is an enterprise-grade customer intelligence and marketing decisioning platform built on top of **NestJS**, **Prisma**, and **PostgreSQL**. It operates as the brain of the CRM, handling tenant-isolated storage, computing customer metrics, generating AI marketing strategies, and orchestrating multi-channel campaigns.

---

## 🏗️ Architecture & Core Decisions

```mermaid
graph TD
    Client[Client Apps / Vercel Frontend] -->|HTTP Request| API[NestJS API Gateway]
    API -->|Validation & Auth| JwtGuard[JwtAuthGuard]
    JwtGuard -->|Tenant Isolation| TenantGuard[TenantGuard]
    TenantGuard -->|Route Dispatch| Controller[Controller Layer]
    Controller -->|Business Logic| Service[Service Layer]
    Service -->|Database ORM| Prisma[Prisma Client]
    Prisma -->|PostgreSQL Query| DB[(PostgreSQL Database)]
    Service -->|Enqueue Jobs| BullMQ[BullMQ Message Queue]
    BullMQ -->|Async Dispatch| Channel[Mock Channel Service]
```

### Key Technical Decisions:
1. **NestJS Framework**: Leveraged for its robust modular architecture, typed dependency injection, and scalable routing structure.
2. **Prisma ORM**: Hand-picked for strict, type-safe database queries, automated migrations, and high-performance Postgres connections.
3. **Tenant Isolation (`x-tenant-id`)**: Multitenancy is strictly enforced at the database level. Every request requires a valid JWT token combined with a `x-tenant-id` header validation executed via a custom `TenantGuard`.
4. **BullMQ / Queue-Based Processing**: Campaign message dispatches and background intelligence calculations are processed asynchronously via BullMQ to avoid request-response bottlenecks.
5. **Decoupled Delivery Service**: Real carrier dispatches (SMS/WhatsApp/Email) are delegated to an external carrier simulation server, allowing the backend to scale independently of external network latency.

---

## 📂 File Structure Hierarchy

The backend follows NestJS modular guidelines, separating modules, controllers, and services:

```
deploy-ready/backend/
├── prisma/
│   ├── migrations/             # SQL migration files
│   ├── schema.prisma           # Prisma database schema definition
│   └── seed.ts                 # Complex seed data script (StyleHub India)
├── src/
│   ├── main.ts                 # Application entry point (Swagger config & Boot)
│   ├── app.module.ts           # Root module importing all subsystems
│   ├── common/                 # Shared decorators, guards, and interceptors
│   │   ├── decorators/         # @TenantId() and @CurrentUser() decorators
│   │   ├── guards/             # JwtAuthGuard, TenantGuard, and RolesGuard
│   │   └── interceptors/       # HTTP Response envelope TransformInterceptor
│   ├── core/                   # Shared core configuration
│   │   ├── prisma/             # Prisma client connection provider
│   │   └── queue/              # BullMQ Redis configuration provider
│   └── modules/                # Core business domains
│       ├── auth/               # User Authentication & Tenant discovery
│       ├── campaign/           # Campaign creation, preview, and results
│       ├── communication/      # Webhook callback handler & delivery queue
│       ├── customer/           # Customer management and profile ingestion
│       ├── decisioning/        # AI Decisioning Engine (Goal -> Strategy)
│       └── intelligence/       # Customer 360, metrics, personas, and segments
├── package.json                # Project dependencies and script runner
└── tsconfig.json               # TypeScript compiler options
```

---

## 🚀 Key Feature Functionality

### 1. Multi-Tenant Customer 360 View
* Aggregate complete shopper records including profile metadata, purchase history, metrics (LTV, Recency, Frequency, AOV), features, and persona affinities.
* Securely scope queries to the current tenant to prevent cross-tenant data leaks.

### 2. AI Decisioning Engine (`DecisioningService`)
* Takes any marketing goal (e.g. *“reactivate dormant high-value customers”*) and automatically generates a recommended campaign.
* Matches keywords to goals, selects the best target segment, chooses the optimal offer (flat discount, percentage, points), selects the highest-performing channel based on customer preferences, and builds personalized copy drafts.

### 3. Dynamic Segment Resolver (`SegmentResolverService`)
* Resolves customer list dynamics based on custom boolean rule logic:
  * **Metric-based rules**: Spend, order count, days since last purchase.
  * **Feature-based rules**: Weekend buyer scores, discount affinity.
  * **Persona-based rules**: Loyalists, at-risk repeaters, bargain hunters.
* Computed segment memberships are snapshotted on launch to ensure Campaign metrics consistency.

### 4. Async Campaign Dispatch & Delivery Lifecycle
* On launch, it snapshots the audience, schedules async delivery logs, and submits jobs to the redis queue.
* Exposes a webhook endpoint (`/api/v1/communication/webhooks/delivery`) for real-time delivery lifecycle updates (Sent → Delivered → Opened → Clicked).

---

## 🛠️ Deployment Instructions (Render + Neon)

### 1. Database Setup
1. Create a serverless PostgreSQL instance on **Neon.tech**.
2. Retrieve your connection string. E.g.:
   `postgresql://xeno:password@ep-snowflake-123456.neon.tech/xeno_db?sslmode=require`

### 2. Build & Deploy Settings on Render.com
* **Runtime**: `Node`
* **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
* **Start Command**: `npm run start:prod`
* **Environment Variables**:
  * `DATABASE_URL`: `(Your Neon Connection String)`
  * `PORT`: `3000`
  * `REDIS_URL`: `(Your Upstash Redis connection URL)`
  * `JWT_SECRET`: `(Secure production JWT secret)`
  * `CORS_ORIGINS`: `(Vercel frontend production URL)`
