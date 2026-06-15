import { PrismaClient, TenantStatus, TenantPlan, UserRole, UserStatus, CustomerGender, CustomerStatus, OrderStatus, PersonaStatus, SegmentType, SegmentStatus, GoalType, GoalStatus, CampaignType, CampaignStatus, ChannelType, ChannelProviderStatus, CampaignAudienceStatus, CommunicationStatus, DeliveryEventType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDecimal(min: number, max: number, decimals: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

// ============================================================
// SEED DATA CONSTANTS
// ============================================================

const FIRST_NAMES = [
  'Aarav', 'Aditi', 'Arjun', 'Diya', 'Ishaan', 'Kavya', 'Krishna', 'Meera',
  'Neha', 'Priya', 'Rahul', 'Riya', 'Rohan', 'Sanya', 'Shreya', 'Tanvi',
  'Varun', 'Vihaan', 'Zara', 'Ananya', 'Dev', 'Nisha', 'Arun', 'Pooja',
  'Sahil', 'Simran', 'Amit', 'Divya', 'Karan', 'Sneha', 'Vikram', 'Anjali',
  'Raj', 'Pallavi', 'Manish', 'Swati', 'Kunal', 'Ritika', 'Harsh', 'Megha',
  'Nikhil', 'Sakshi', 'Siddharth', 'Tanya', 'Gaurav', 'Komal', 'Deepak',
  'Nidhi', 'Akash', 'Bhavna',
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Singh', 'Kumar', 'Gupta', 'Agarwal', 'Mehta', 'Jain',
  'Shah', 'Reddy', 'Nair', 'Iyer', 'Kapoor', 'Malhotra', 'Verma', 'Chopra',
  'Das', 'Bose', 'Sen', 'Roy', 'Bhat', 'Desai', 'Rao', 'Pillai', 'Menon',
];

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune',
  'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Kochi', 'Indore', 'Noida',
  'Gurgaon',
];

const STATES = [
  'Maharashtra', 'Delhi', 'Karnataka', 'Telangana', 'Tamil Nadu', 'West Bengal',
  'Maharashtra', 'Gujarat', 'Rajasthan', 'Uttar Pradesh', 'Punjab', 'Kerala',
  'Madhya Pradesh', 'Uttar Pradesh', 'Haryana',
];

const ACQUISITION_SOURCES = [
  'ORGANIC', 'PAID_SEARCH', 'SOCIAL_MEDIA', 'REFERRAL', 'EMAIL', 'DIRECT',
  'INFLUENCER', 'AFFILIATE',
];

const PRODUCT_CATALOG = [
  { name: 'Premium Wireless Earbuds', category: 'Electronics', price: 2999 },
  { name: 'Organic Green Tea (100g)', category: 'Beverages', price: 449 },
  { name: 'Cotton Crew Neck T-Shirt', category: 'Apparel', price: 799 },
  { name: 'Running Shoes Pro', category: 'Footwear', price: 4499 },
  { name: 'Stainless Steel Water Bottle', category: 'Accessories', price: 599 },
  { name: 'Yoga Mat Premium', category: 'Fitness', price: 1299 },
  { name: 'Smartphone Case', category: 'Electronics', price: 399 },
  { name: 'Organic Face Wash', category: 'Beauty', price: 349 },
  { name: 'Leather Wallet', category: 'Accessories', price: 1499 },
  { name: 'Bluetooth Speaker', category: 'Electronics', price: 1999 },
  { name: 'Protein Bar (Pack of 6)', category: 'Food', price: 599 },
  { name: 'Denim Jeans Slim Fit', category: 'Apparel', price: 1999 },
  { name: 'Sunglasses UV400', category: 'Accessories', price: 899 },
  { name: 'Hand Cream Set', category: 'Beauty', price: 649 },
  { name: 'Notebook Journal A5', category: 'Stationery', price: 299 },
  { name: 'USB-C Charging Cable', category: 'Electronics', price: 249 },
  { name: 'Coffee Mug Ceramic', category: 'Home', price: 399 },
  { name: 'Fitness Tracker Band', category: 'Electronics', price: 3499 },
  { name: 'Backpack 25L', category: 'Accessories', price: 2499 },
  { name: 'Essential Oil Set', category: 'Beauty', price: 899 },
];

// ============================================================
// MAIN SEED FUNCTION
// ============================================================

async function main() {
  console.log('🌱 Starting database seed...');
  console.log('');

  // Clean existing data
  console.log('🧹 Cleaning existing data...');
  await prisma.$transaction([
    // Phase 2A tables
    prisma.dashboardWidget.deleteMany(),
    prisma.metricSnapshot.deleteMany(),
    prisma.metricDefinition.deleteMany(),
    prisma.agentFeedback.deleteMany(),
    prisma.agentObservation.deleteMany(),
    prisma.agentMemory.deleteMany(),
    prisma.workflowExecutionStep.deleteMany(),
    prisma.workflowExecution.deleteMany(),
    prisma.workflowStep.deleteMany(),
    prisma.workflow.deleteMany(),
    prisma.offerPerformance.deleteMany(),
    prisma.offerAssignment.deleteMany(),
    prisma.offer.deleteMany(),
    prisma.offerTemplate.deleteMany(),
    prisma.decisionExperiment.deleteMany(),
    prisma.decisionExplanation.deleteMany(),
    prisma.decisionRule.deleteMany(),
    prisma.decisionTemplate.deleteMany(),
    prisma.featureComputationRun.deleteMany(),
    prisma.featureVersion.deleteMany(),
    prisma.featureDefinition.deleteMany(),
    prisma.customerProductAffinity.deleteMany(),
    prisma.productAttributeValue.deleteMany(),
    prisma.productAttribute.deleteMany(),
    prisma.product.deleteMany(),
    prisma.productCategory.deleteMany(),
    prisma.customerConsent.deleteMany(),
    prisma.customerPreference.deleteMany(),
    prisma.customerChannel.deleteMany(),
    prisma.customerDevice.deleteMany(),
    prisma.customerAddress.deleteMany(),
    prisma.customerIdentity.deleteMany(),
    // Phase 1 tables
    prisma.deliveryEvent.deleteMany(),
    prisma.channelProvider.deleteMany(),
    prisma.apiUsageLog.deleteMany(),
    prisma.rateLimitRule.deleteMany(),
    prisma.learningExample.deleteMany(),
    prisma.aIInteraction.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.revenueAttribution.deleteMany(),
    prisma.campaignAnalytic.deleteMany(),
    prisma.deliveryReceipt.deleteMany(),
    prisma.communicationLog.deleteMany(),
    prisma.campaignAudience.deleteMany(),
    prisma.campaignMessage.deleteMany(),
    prisma.campaignVersion.deleteMany(),
    prisma.campaign.deleteMany(),
    prisma.decisionOutcome.deleteMany(),
    prisma.decision.deleteMany(),
    prisma.businessGoal.deleteMany(),
    prisma.segmentVersion.deleteMany(),
    prisma.segmentCustomer.deleteMany(),
    prisma.segment.deleteMany(),
    prisma.customerPersona.deleteMany(),
    prisma.persona.deleteMany(),
    prisma.customerFeature.deleteMany(),
    prisma.customerMetricHistory.deleteMany(),
    prisma.customerMetric.deleteMany(),
    prisma.event.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.customerTagAssignment.deleteMany(),
    prisma.customerTag.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.user.deleteMany(),
    prisma.tenant.deleteMany(),
  ]);
  console.log('✅ Database cleaned');

  // ==============================
  // 1. TENANT
  // ==============================
  console.log('');
  console.log('📦 Creating tenant...');

  const tenant = await prisma.tenant.create({
    data: {
      id: uuidv4(),
      name: 'StyleHub India',
      slug: 'stylehub-india',
      domain: 'stylehub.in',
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.PRO,
      settings: {
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        locale: 'en-IN',
        features: {
          aiDecisions: true,
          campaignAutomation: true,
          advancedAnalytics: true,
        },
      },
    },
  });
  console.log(`  ✅ Tenant: ${tenant.name} (${tenant.id})`);

  // ==============================
  // 2. USERS
  // ==============================
  console.log('');
  console.log('👤 Creating users...');

  const usersData = [
    { firstName: 'Admin', lastName: 'User', email: 'admin@stylehub.in', role: UserRole.ADMIN },
    { firstName: 'Priya', lastName: 'Sharma', email: 'priya@stylehub.in', role: UserRole.MANAGER },
    { firstName: 'Rahul', lastName: 'Gupta', email: 'rahul@stylehub.in', role: UserRole.MARKETER },
    { firstName: 'Sneha', lastName: 'Patel', email: 'sneha@stylehub.in', role: UserRole.MARKETER },
    { firstName: 'Vikram', lastName: 'Singh', email: 'vikram@stylehub.in', role: UserRole.VIEWER },
  ];

  const passwordHash = await bcrypt.hash('password123', 10);

  const users = await Promise.all(
    usersData.map((u) =>
      prisma.user.create({
        data: {
          id: uuidv4(),
          tenantId: tenant.id,
          email: u.email,
          passwordHash,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          status: UserStatus.ACTIVE,
          lastLoginAt: randomDate(new Date('2024-11-01'), new Date()),
        },
      }),
    ),
  );
  console.log(`  ✅ Created ${users.length} users`);

  // ==============================
  // 3. CUSTOMER TAGS
  // ==============================
  console.log('');
  console.log('🏷️ Creating customer tags...');

  const tagNames = [
    { name: 'VIP', color: '#FFD700' },
    { name: 'High Value', color: '#4CAF50' },
    { name: 'At Risk', color: '#FF5722' },
    { name: 'New Customer', color: '#2196F3' },
    { name: 'Loyal', color: '#9C27B0' },
    { name: 'Discount Seeker', color: '#FF9800' },
    { name: 'Premium Buyer', color: '#E91E63' },
    { name: 'Dormant', color: '#607D8B' },
  ];

  const tags = await Promise.all(
    tagNames.map((t) =>
      prisma.customerTag.create({
        data: {
          id: uuidv4(),
          tenantId: tenant.id,
          name: t.name,
          color: t.color,
        },
      }),
    ),
  );
  console.log(`  ✅ Created ${tags.length} tags`);

  // ==============================
  // 4. CUSTOMERS (50)
  // ==============================
  console.log('');
  console.log('👥 Creating customers...');

  const customers = await Promise.all(
    Array.from({ length: 150 }, (_, i) => {
      const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
      const lastName = randomChoice(LAST_NAMES);
      const cityIdx = randomInt(0, CITIES.length - 1);

      return prisma.customer.create({
        data: {
          id: uuidv4(),
          tenantId: tenant.id,
          externalId: `CUST-${String(i + 1).padStart(4, '0')}`,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(1, 99)}@example.com`,
          phone: `+91${randomInt(7000000000, 9999999999)}`,
          firstName,
          lastName,
          gender: randomChoice([CustomerGender.MALE, CustomerGender.FEMALE, CustomerGender.OTHER]),
          dateOfBirth: randomDate(new Date('1985-01-01'), new Date('2003-12-31')),
          city: CITIES[cityIdx],
          state: STATES[cityIdx],
          country: 'IN',
          status: i < 135 ? CustomerStatus.ACTIVE : CustomerStatus.INACTIVE,
          acquisitionSource: randomChoice(ACQUISITION_SOURCES),
          acquisitionDate: randomDate(new Date('2023-01-01'), new Date('2024-12-31')),
          firstSeenAt: randomDate(new Date('2023-01-01'), new Date('2024-06-30')),
          lastSeenAt: randomDate(new Date('2024-06-01'), new Date()),
          metadata: {
            preferredLanguage: randomChoice(['en', 'hi', 'ta', 'te', 'mr']),
            appVersion: randomChoice(['3.2.1', '3.1.0', '2.9.5']),
          },
        },
      });
    }),
  );
  console.log(`  ✅ Created ${customers.length} customers`);

  // Assign tags to customers
  console.log('  🏷️ Assigning tags...');
  let tagAssignmentCount = 0;
  for (const customer of customers) {
    const numTags = randomInt(1, 3);
    const selectedTags = [...tags].sort(() => Math.random() - 0.5).slice(0, numTags);
    for (const tag of selectedTags) {
      await prisma.customerTagAssignment.create({
        data: {
          id: uuidv4(),
          tenantId: tenant.id,
          customerId: customer.id,
          tagId: tag.id,
        },
      });
      tagAssignmentCount++;
    }
  }
  console.log(`  ✅ Created ${tagAssignmentCount} tag assignments`);

  // ==============================
  // 5. ORDERS (100-200)
  // ==============================
  console.log('');
  console.log('🛒 Creating orders...');

  const orders: any[] = [];
  const orderCount = randomInt(350, 450);

  for (let i = 0; i < orderCount; i++) {
    const customer = randomChoice(customers);
    const numItems = randomInt(1, 4);
    const selectedProducts = [...PRODUCT_CATALOG]
      .sort(() => Math.random() - 0.5)
      .slice(0, numItems);

    let totalAmount = 0;
    const items = selectedProducts.map((p) => {
      const quantity = randomInt(1, 3);
      const itemTotal = p.price * quantity;
      totalAmount += itemTotal;
      return {
        productId: `PROD-${PRODUCT_CATALOG.indexOf(p) + 1}`,
        productName: p.name,
        category: p.category,
        quantity,
        unitPrice: p.price,
        totalPrice: itemTotal,
      };
    });

    const discount = Math.random() > 0.7 ? randomDecimal(50, totalAmount * 0.2) : 0;
    const tax = parseFloat((totalAmount * 0.18).toFixed(2));
    const orderedAt = randomDate(new Date('2023-06-01'), new Date());
    const status = randomChoice([
      OrderStatus.DELIVERED, OrderStatus.DELIVERED, OrderStatus.DELIVERED,
      OrderStatus.DELIVERED, OrderStatus.SHIPPED, OrderStatus.CONFIRMED,
      OrderStatus.CANCELLED, OrderStatus.RETURNED,
    ]);

    const orderId = uuidv4();
    const order = await prisma.order.create({
      data: {
        id: orderId,
        tenantId: tenant.id,
        customerId: customer.id,
        externalId: `ORD-${String(i + 1).padStart(5, '0')}`,
        orderNumber: `SH-${new Date(orderedAt).getFullYear()}-${String(i + 1).padStart(5, '0')}`,
        status,
        totalAmount: totalAmount - discount + tax,
        currency: 'INR',
        discountAmount: discount,
        taxAmount: tax,
        channel: randomChoice(['ONLINE', 'ONLINE', 'APP', 'IN_STORE']),
        orderedAt,
        deliveredAt: status === OrderStatus.DELIVERED
          ? new Date(orderedAt.getTime() + randomInt(2, 7) * 86400000)
          : null,
        metadata: {
          paymentMethod: randomChoice(['UPI', 'CARD', 'COD', 'WALLET']),
        },
      },
    });
    orders.push(order);

    // Create order items
    await Promise.all(
      items.map((item) =>
        prisma.orderItem.create({
          data: {
            id: uuidv4(),
            tenantId: tenant.id,
            orderId: orderId,
            productId: item.productId,
            productName: item.productName,
            category: item.category,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          },
        }),
      ),
    );
  }
  console.log(`  ✅ Created ${orders.length} orders with items`);

  // ==============================
  // 6. CUSTOMER METRICS
  // ==============================
  console.log('');
  console.log('📊 Computing customer metrics...');

  const now = new Date();
  let metricsCount = 0;

  for (const customer of customers) {
    const customerOrders = orders.filter((o) => o.customerId === customer.id);
    const deliveredOrders = customerOrders.filter((o) => o.status === 'DELIVERED');
    const totalRevenue = deliveredOrders.reduce((sum: number, o: any) => sum + parseFloat(o.totalAmount.toString()), 0);
    const totalOrders = deliveredOrders.length;

    if (totalOrders === 0) continue;

    const avgOrderValue = totalRevenue / totalOrders;
    const orderDates = deliveredOrders.map((o: any) => new Date(o.orderedAt).getTime()).sort();
    const firstOrderAt = new Date(orderDates[0]);
    const lastOrderAt = new Date(orderDates[orderDates.length - 1]);
    const daysSinceLastOrder = Math.floor((now.getTime() - lastOrderAt.getTime()) / 86400000);

    let orderFrequencyDays = 0;
    if (totalOrders > 1) {
      orderFrequencyDays = (lastOrderAt.getTime() - firstOrderAt.getTime()) / 86400000 / (totalOrders - 1);
    }

    // Simple RFM scoring (1-5)
    const recencyScore = daysSinceLastOrder < 30 ? 5 : daysSinceLastOrder < 90 ? 4 : daysSinceLastOrder < 180 ? 3 : daysSinceLastOrder < 365 ? 2 : 1;
    const frequencyScore = totalOrders >= 10 ? 5 : totalOrders >= 6 ? 4 : totalOrders >= 3 ? 3 : totalOrders >= 2 ? 2 : 1;
    const monetaryScore = totalRevenue >= 20000 ? 5 : totalRevenue >= 10000 ? 4 : totalRevenue >= 5000 ? 3 : totalRevenue >= 2000 ? 2 : 1;
    const rfmCombined = Math.round((recencyScore * 0.4 + frequencyScore * 0.35 + monetaryScore * 0.25) * 20);

    const engagementScore = Math.min(100, (recencyScore * 20 + frequencyScore * 15 + randomInt(0, 15)));
    const churnRisk = daysSinceLastOrder > 180 ? randomDecimal(0.6, 0.95, 4)
      : daysSinceLastOrder > 90 ? randomDecimal(0.3, 0.6, 4)
      : randomDecimal(0.05, 0.3, 4);

    await prisma.customerMetric.create({
      data: {
        id: uuidv4(),
        tenantId: tenant.id,
        customerId: customer.id,
        totalOrders,
        totalRevenue,
        avgOrderValue,
        firstOrderAt,
        lastOrderAt,
        daysSinceLastOrder,
        orderFrequencyDays,
        rfmRecencyScore: recencyScore,
        rfmFrequencyScore: frequencyScore,
        rfmMonetaryScore: monetaryScore,
        rfmCombinedScore: rfmCombined,
        engagementScore,
        churnRiskScore: churnRisk,
        lifetimeValue: totalRevenue * 1.5,
        computedAt: now,
      },
    });
    metricsCount++;
  }
  console.log(`  ✅ Computed metrics for ${metricsCount} customers`);

  // ==============================
  // 7. CUSTOMER FEATURES
  // ==============================
  console.log('');
  console.log('🧠 Creating customer features...');

  let featureCount = 0;
  for (const customer of customers.slice(0, 90)) {
    const features = [
      { name: 'discount_affinity', value: randomDecimal(0, 1, 4) },
      { name: 'weekend_buyer_score', value: randomDecimal(0, 1, 4) },
      { name: 'purchase_probability_30d', value: randomDecimal(0, 1, 4) },
      { name: 'whatsapp_affinity', value: randomDecimal(0, 1, 4) },
      { name: 'email_open_rate', value: randomDecimal(0, 0.6, 4) },
    ];

    for (const f of features) {
      await prisma.customerFeature.create({
        data: {
          id: uuidv4(),
          tenantId: tenant.id,
          customerId: customer.id,
          featureName: f.name,
          featureValue: f.value,
          featureVersion: 1,
          computedAt: now,
        },
      });
      featureCount++;
    }
  }
  console.log(`  ✅ Created ${featureCount} customer features`);

  // ==============================
  // 8. PERSONAS
  // ==============================
  console.log('');
  console.log('🎭 Creating personas...');

  const personasData = [
    {
      name: 'High-Value Loyalist',
      description: 'Frequent buyers with high spend who consistently return.',
      color: '#4CAF50',
      icon: '👑',
      criteria: { rfmCombinedScore: { min: 70 }, churnRiskScore: { max: 0.3 } },
      priority: 10,
    },
    {
      name: 'At-Risk Repeater',
      description: 'Previously active customers showing signs of disengagement.',
      color: '#FF9800',
      icon: '⚠️',
      criteria: { daysSinceLastOrder: { min: 60 }, totalOrders: { min: 2 }, churnRiskScore: { min: 0.4 } },
      priority: 9,
    },
    {
      name: 'Bargain Hunter',
      description: 'Customers who primarily buy during discounts and promotions.',
      color: '#FF5722',
      icon: '🏷️',
      criteria: { discountAffinity: { min: 0.6 } },
      priority: 7,
    },
    {
      name: 'New Explorer',
      description: 'Recent first-time buyers exploring the brand.',
      color: '#2196F3',
      icon: '🆕',
      criteria: { totalOrders: { max: 2 }, daysSinceFirstOrder: { max: 90 } },
      priority: 8,
    },
    {
      name: 'Dormant Customer',
      description: 'Customers who haven\'t purchased in over 6 months.',
      color: '#607D8B',
      icon: '💤',
      criteria: { daysSinceLastOrder: { min: 180 } },
      priority: 6,
    },
  ];

  const personas = await Promise.all(
    personasData.map((p) =>
      prisma.persona.create({
        data: {
          id: uuidv4(),
          tenantId: tenant.id,
          name: p.name,
          description: p.description,
          criteria: p.criteria,
          color: p.color,
          icon: p.icon,
          priority: p.priority,
          isSystem: true,
          status: PersonaStatus.ACTIVE,
        },
      }),
    ),
  );
  console.log(`  ✅ Created ${personas.length} personas`);

  // Assign personas to customers
  console.log('  🎭 Assigning personas...');
  let personaAssignmentCount = 0;
  for (const customer of customers) {
    const persona = randomChoice(personas);
    await prisma.customerPersona.create({
      data: {
        id: uuidv4(),
        tenantId: tenant.id,
        customerId: customer.id,
        personaId: persona.id,
        confidence: randomDecimal(0.5, 0.95, 4),
        assignedBy: 'SYSTEM',
        expiresAt: new Date(now.getTime() + 30 * 86400000),
      },
    });
    personaAssignmentCount++;
  }
  console.log(`  ✅ Created ${personaAssignmentCount} persona assignments`);

  // ==============================
  // 9. SEGMENTS
  // ==============================
  console.log('');
  console.log('📋 Creating segments...');

  const segmentsData = [
    {
      name: 'High-Value Active Customers',
      description: 'Customers with RFM combined score >= 70 and purchased in last 90 days',
      type: SegmentType.DYNAMIC,
      rules: {
        operator: 'AND',
        conditions: [
          { type: 'metric', field: 'rfmCombinedScore', op: 'gte', value: 70 },
          { type: 'metric', field: 'daysSinceLastOrder', op: 'lte', value: 90 },
        ],
      },
    },
    {
      name: 'Dormant Customers (6+ months)',
      description: 'Customers who haven\'t purchased in 180+ days',
      type: SegmentType.DYNAMIC,
      rules: {
        operator: 'AND',
        conditions: [
          { type: 'metric', field: 'daysSinceLastOrder', op: 'gte', value: 180 },
          { type: 'metric', field: 'totalOrders', op: 'gte', value: 1 },
        ],
      },
    },
    {
      name: 'High Churn Risk',
      description: 'Customers with churn risk score above 0.6',
      type: SegmentType.DYNAMIC,
      rules: {
        operator: 'AND',
        conditions: [
          { type: 'metric', field: 'churnRiskScore', op: 'gte', value: 0.6 },
        ],
      },
    },
    {
      name: 'First-Time Buyers',
      description: 'Customers with exactly 1 completed order',
      type: SegmentType.DYNAMIC,
      rules: {
        operator: 'AND',
        conditions: [
          { type: 'metric', field: 'totalOrders', op: 'eq', value: 1 },
        ],
      },
    },
    {
      name: 'Premium Discount Hunters',
      description: 'High spenders who love discounts',
      type: SegmentType.DYNAMIC,
      rules: {
        operator: 'AND',
        conditions: [
          { type: 'metric', field: 'totalRevenue', op: 'gte', value: 5000 },
          { type: 'feature', field: 'DISCOUNT_AFFINITY', op: 'gte', value: 0.5 },
        ],
      },
    },
    {
      name: 'Dormant High-Value',
      description: 'High spenders who went silent (persona + metric based)',
      type: SegmentType.DYNAMIC,
      rules: {
        operator: 'AND',
        conditions: [
          { type: 'metric', field: 'totalRevenue', op: 'gte', value: 5000 },
          { type: 'metric', field: 'daysSinceLastOrder', op: 'gte', value: 90 },
          { type: 'persona', persona: 'DORMANT_HIGH_VALUE' },
        ],
      },
    },
  ];

  const segmentCounts = [45, 45, 30, 20, 40, 40];
  const segments = await Promise.all(
    segmentsData.map((s, idx) =>
      prisma.segment.create({
        data: {
          id: uuidv4(),
          tenantId: tenant.id,
          name: s.name,
          description: s.description,
          type: s.type,
          rules: s.rules,
          customerCount: segmentCounts[idx],
          status: SegmentStatus.ACTIVE,
          lastComputedAt: now,
          createdBy: users[1].id,
        },
      }),
    ),
  );
  console.log(`  ✅ Created ${segments.length} segments`);

  // ==============================
  // 9B. SEGMENT CUSTOMERS
  // ==============================
  console.log('👥 Seeding segment customers...');
  const segmentSlices = [
    customers.slice(0, 45),  // High-Value Active
    customers.slice(45, 90), // Dormant Customers
    customers.slice(90, 120), // High Churn Risk
    customers.slice(120, 140), // First-Time Buyers
    customers.slice(10, 50),  // Premium Discount Hunters
    customers.slice(50, 90), // Dormant High-Value
  ];

  for (let idx = 0; idx < segments.length; idx++) {
    const segment = segments[idx];
    const segmentCustomersList = segmentSlices[idx];
    await Promise.all(
      segmentCustomersList.map((customer) =>
        prisma.segmentCustomer.create({
          data: {
            id: uuidv4(),
            tenantId: tenant.id,
            segmentId: segment.id,
            customerId: customer.id,
          },
        })
      )
    );
  }
  console.log('  ✅ Created segment customers membership');

  // ==============================
  // 10. BUSINESS GOALS
  // ==============================
  console.log('');
  console.log('🎯 Creating business goals...');

  const goalsData = [
    { name: 'Reactivate Dormant Customers', type: GoalType.REACTIVATION, description: 'Bring back customers who haven\'t purchased in 6+ months' },
    { name: 'Increase Repeat Purchase Rate', type: GoalType.RETENTION, description: 'Convert first-time buyers into repeat customers' },
    { name: 'Reduce Churn Rate', type: GoalType.WIN_BACK, description: 'Reduce monthly churn rate from 8% to 4%' },
    { name: 'Reward Loyal Customers', type: GoalType.LOYALTY, description: 'Recognize and reward top 10% of customers by LTV' },
    { name: 'Increase Average Order Value', type: GoalType.UPSELL, description: 'Increase AOV from ₹2,500 to ₹3,500 through cross-sell' },
  ];

  const goals = await Promise.all(
    goalsData.map((g) =>
      prisma.businessGoal.create({
        data: {
          id: uuidv4(),
          tenantId: tenant.id,
          name: g.name,
          description: g.description,
          goalType: g.type,
          status: GoalStatus.ACTIVE,
          createdBy: users[0].id,
        },
      }),
    ),
  );
  console.log(`  ✅ Created ${goals.length} business goals`);

  // ==============================
  // 11. SAMPLE CAMPAIGNS
  // ==============================
  console.log('');
  console.log('📣 Creating sample campaigns...');

  const campaignsData = [
    {
      name: 'Win-Back: Dormant Customers Q1',
      description: 'Email campaign targeting dormant customers with exclusive discount',
      type: CampaignType.ONE_TIME,
      status: CampaignStatus.COMPLETED,
      channel: ChannelType.EMAIL,
      segmentIdx: 1,
      goal: 'Reactivate dormant customers with personalized offers',
    },
    {
      name: 'Loyalty Reward: Top Customers',
      description: 'WhatsApp campaign rewarding high-value loyal customers',
      type: CampaignType.ONE_TIME,
      status: CampaignStatus.DRAFT,
      channel: ChannelType.WHATSAPP,
      segmentIdx: 0,
      goal: 'Reward and retain top-tier customers',
    },
    {
      name: 'New Customer Welcome Series',
      description: 'Automated email series for first-time buyers',
      type: CampaignType.TRIGGERED,
      status: CampaignStatus.ACTIVE,
      channel: ChannelType.EMAIL,
      segmentIdx: 3,
      goal: 'Onboard and convert first-time buyers into repeat customers',
    },
  ];

  const campaigns = await Promise.all(
    campaignsData.map((c) =>
      prisma.campaign.create({
        data: {
          id: uuidv4(),
          tenantId: tenant.id,
          name: c.name,
          description: c.description,
          type: c.type,
          status: c.status,
          channel: c.channel,
          segmentId: segments[c.segmentIdx].id,
          goal: c.goal,
          version: 1,
          createdBy: users[2].id,
          launchedAt: c.status === CampaignStatus.COMPLETED
            ? randomDate(new Date('2024-10-01'), new Date('2024-12-31'))
            : c.status === CampaignStatus.ACTIVE
              ? randomDate(new Date('2025-01-01'), new Date())
              : null,
          completedAt: c.status === CampaignStatus.COMPLETED
            ? randomDate(new Date('2025-01-01'), new Date())
            : null,
        },
      }),
    ),
  );
  console.log(`  ✅ Created ${campaigns.length} campaigns`);

  // ==============================
  // 11B. CAMPAIGN MESSAGES & PERFORMANCE
  // ==============================
  console.log('📣 Seeding campaign messages and performance data...');

  // Create Campaign Messages
  const campaignMessages = await Promise.all(
    campaigns.map((campaign, idx) => {
      const cData = campaignsData[idx];
      let subject = null;
      let body = '';
      if (cData.channel === ChannelType.EMAIL) {
        subject = `Exclusive Offer for You!`;
        body = `Hi {{firstName}}, we miss you! Use code WINBACK20 for 20% off your next order.`;
      } else if (cData.channel === ChannelType.WHATSAPP) {
        body = `Hi {{firstName}}, as one of our top customers, here is a special gift for you: VIP10.`;
      } else {
        body = `Hi {{firstName}}, welcome to StyleHub!`;
      }
      return prisma.campaignMessage.create({
        data: {
          id: uuidv4(),
          tenantId: tenant.id,
          campaignId: campaign.id,
          variantName: 'default',
          channel: campaign.channel,
          subject,
          body,
        }
      });
    })
  );

  // Completed Campaign Performance (index 0)
  const compCampaign = campaigns[0];
  const compMessage = campaignMessages[0];
  const compSegmentCustomers = segmentSlices[1]; // slice(15, 30) -> 15 customers

  // Distribution of statuses: dynamically scaled
  const statusDistribution = Array.from({ length: compSegmentCustomers.length }, (_, idx) => {
    if (idx < compSegmentCustomers.length * 0.15) return CommunicationStatus.SENT;
    if (idx < compSegmentCustomers.length * 0.35) return CommunicationStatus.DELIVERED;
    if (idx < compSegmentCustomers.length * 0.65) return CommunicationStatus.OPENED;
    if (idx < compSegmentCustomers.length * 0.90) return CommunicationStatus.CLICKED;
    return CommunicationStatus.FAILED;
  });

  for (let idx = 0; idx < compSegmentCustomers.length; idx++) {
    const customer = compSegmentCustomers[idx];
    const status = statusDistribution[idx];
    const logId = uuidv4();
    const sentAt = compCampaign.launchedAt || new Date();
    const deliveredAt = (status === CommunicationStatus.DELIVERED || status === CommunicationStatus.OPENED || status === CommunicationStatus.CLICKED)
      ? new Date(sentAt.getTime() + randomInt(1, 10) * 1000)
      : null;
    const failedAt = (status === CommunicationStatus.FAILED) ? new Date(sentAt.getTime() + 1000) : null;

    // 1. Audience
    await prisma.campaignAudience.create({
      data: {
        id: uuidv4(),
        tenantId: tenant.id,
        campaignId: compCampaign.id,
        customerId: customer.id,
        segmentId: compCampaign.segmentId,
        status: CampaignAudienceStatus.INCLUDED,
      }
    });

    // 2. Comm Log
    const log = await prisma.communicationLog.create({
      data: {
        id: logId,
        tenantId: tenant.id,
        campaignId: compCampaign.id,
        messageId: compMessage.id,
        customerId: customer.id,
        channel: compCampaign.channel,
        status,
        provider: 'SendGrid',
        providerMessageId: `msg-${uuidv4().substring(0, 8)}`,
        sentAt,
        deliveredAt,
        failedAt,
        idempotencyKey: `${compCampaign.id}-${customer.id}-${compMessage.id}`,
      }
    });

    // 3. Delivery receipts
    if (deliveredAt) {
      // Delivered receipt
      await prisma.deliveryReceipt.create({
        data: {
          id: uuidv4(),
          tenantId: tenant.id,
          communicationLogId: logId,
          eventType: DeliveryEventType.DELIVERED,
          occurredAt: deliveredAt,
          processedAt: new Date(deliveredAt.getTime() + 500),
        }
      });

      if (status === CommunicationStatus.OPENED || status === CommunicationStatus.CLICKED) {
        const openedAt = new Date(deliveredAt.getTime() + randomInt(5, 60) * 1000);
        await prisma.deliveryReceipt.create({
          data: {
            id: uuidv4(),
            tenantId: tenant.id,
            communicationLogId: logId,
            eventType: DeliveryEventType.OPENED,
            occurredAt: openedAt,
            processedAt: new Date(openedAt.getTime() + 500),
          }
        });

        if (status === CommunicationStatus.CLICKED) {
          const clickedAt = new Date(openedAt.getTime() + randomInt(5, 60) * 1000);
          await prisma.deliveryReceipt.create({
            data: {
              id: uuidv4(),
              tenantId: tenant.id,
              communicationLogId: logId,
              eventType: DeliveryEventType.CLICKED,
              occurredAt: clickedAt,
              processedAt: new Date(clickedAt.getTime() + 500),
            }
          });
        }
      }
    }
  }

  // Seeding conversions/attributions for Completed Campaign (let's convert 2 of the CLICKED customers)
  const clickedCustomers = compSegmentCustomers.slice(9, 13); // index 9 to 12 are CLICKED
  let attributionCount = 0;
  for (const customer of clickedCustomers.slice(0, 2)) {
    // Find customer's orders
    const customerOrders = orders.filter(o => o.customerId === customer.id);
    if (customerOrders.length > 0) {
      const order = customerOrders[0];
      await prisma.revenueAttribution.create({
        data: {
          id: uuidv4(),
          tenantId: tenant.id,
          campaignId: compCampaign.id,
          orderId: order.id,
          customerId: customer.id,
          revenue: order.totalAmount,
          attributionWeight: 1.0,
          attributedAt: new Date(compCampaign.launchedAt!.getTime() + 2 * 3600000), // 2 hours later
        }
      });
      attributionCount++;
    }
  }
  console.log(`  ✅ Seeded ${attributionCount} revenue attributions for completed campaign`);

  // Active Campaign Performance (index 2) - 8 customers total
  const activeCampaign = campaigns[2];
  const activeMessage = campaignMessages[2];
  const activeSegmentCustomers = segmentSlices[3]; // slice(40, 48) -> 8 customers

  // Distribution: dynamically scaled
  const activeStatusDistribution = Array.from({ length: activeSegmentCustomers.length }, (_, idx) => {
    if (idx < activeSegmentCustomers.length * 0.25) return CommunicationStatus.QUEUED;
    if (idx < activeSegmentCustomers.length * 0.60) return CommunicationStatus.SENT;
    if (idx < activeSegmentCustomers.length * 0.85) return CommunicationStatus.DELIVERED;
    return CommunicationStatus.OPENED;
  });

  for (let idx = 0; idx < activeSegmentCustomers.length; idx++) {
    const customer = activeSegmentCustomers[idx];
    const status = activeStatusDistribution[idx];
    const logId = uuidv4();
    const sentAt = activeCampaign.launchedAt || new Date();
    const deliveredAt = (status === CommunicationStatus.DELIVERED || status === CommunicationStatus.OPENED)
      ? new Date(sentAt.getTime() + randomInt(1, 10) * 1000)
      : null;

    // 1. Audience
    await prisma.campaignAudience.create({
      data: {
        id: uuidv4(),
        tenantId: tenant.id,
        campaignId: activeCampaign.id,
        customerId: customer.id,
        segmentId: activeCampaign.segmentId,
        status: CampaignAudienceStatus.INCLUDED,
      }
    });

    // 2. Comm Log
    await prisma.communicationLog.create({
      data: {
        id: logId,
        tenantId: tenant.id,
        campaignId: activeCampaign.id,
        messageId: activeMessage.id,
        customerId: customer.id,
        channel: activeCampaign.channel,
        status,
        provider: 'SendGrid',
        providerMessageId: `msg-${uuidv4().substring(0, 8)}`,
        sentAt: status === CommunicationStatus.QUEUED ? null : sentAt,
        deliveredAt,
        idempotencyKey: `${activeCampaign.id}-${customer.id}-${activeMessage.id}`,
      }
    });

    // 3. Delivery receipts
    if (deliveredAt) {
      await prisma.deliveryReceipt.create({
        data: {
          id: uuidv4(),
          tenantId: tenant.id,
          communicationLogId: logId,
          eventType: DeliveryEventType.DELIVERED,
          occurredAt: deliveredAt,
          processedAt: new Date(deliveredAt.getTime() + 500),
        }
      });

      if (status === CommunicationStatus.OPENED) {
        const openedAt = new Date(deliveredAt.getTime() + randomInt(5, 60) * 1000);
        await prisma.deliveryReceipt.create({
          data: {
            id: uuidv4(),
            tenantId: tenant.id,
            communicationLogId: logId,
            eventType: DeliveryEventType.OPENED,
            occurredAt: openedAt,
            processedAt: new Date(openedAt.getTime() + 500),
          }
        });
      }
    }
  }
  console.log('  ✅ Seeded active campaign logs and receipts');

  // ==============================
  // 12. CHANNEL PROVIDERS
  // ==============================
  console.log('');
  console.log('📡 Creating channel providers...');

  const providersData = [
    { name: 'SendGrid', channel: ChannelType.EMAIL },
    { name: 'Twilio', channel: ChannelType.SMS },
    { name: 'Firebase', channel: ChannelType.PUSH },
    { name: 'WhatsApp Business', channel: ChannelType.WHATSAPP },
  ];

  await Promise.all(
    providersData.map((p) =>
      prisma.channelProvider.create({
        data: {
          id: uuidv4(),
          tenantId: tenant.id,
          name: p.name,
          channel: p.channel,
          config: { apiKey: 'placeholder_key', sandbox: true },
          status: ChannelProviderStatus.ACTIVE,
        },
      }),
    ),
  );
  console.log(`  ✅ Created ${providersData.length} channel providers`);

  // ==============================
  // 13. SEED EVENTS
  // ==============================
  console.log('');
  console.log('📝 Creating sample events...');

  const eventTypes = [
    'CUSTOMER_CREATED', 'ORDER_CREATED', 'ORDER_DELIVERED',
    'SEGMENT_COMPUTED', 'CAMPAIGN_CREATED',
  ];

  let eventCount = 0;
  for (const customer of customers.slice(0, 60)) {
    await prisma.event.create({
      data: {
        id: uuidv4(),
        tenantId: tenant.id,
        entityType: 'CUSTOMER',
        entityId: customer.id,
        eventType: 'CUSTOMER_CREATED',
        eventData: { source: customer.acquisitionSource },
        actorType: 'SYSTEM',
        occurredAt: customer.createdAt,
      },
    });
    eventCount++;
  }
  console.log(`  ✅ Created ${eventCount} events`);

  // ==============================
  // 14. PHASE 2A: CUSTOMER IDENTITIES & ADDRESSES
  // ==============================
  console.log('');
  console.log('🆔 Creating customer identities & addresses...');

  let identityCount = 0;
  let addressCount = 0;
  for (const customer of customers.slice(0, 90)) {
    // Email identity
    if (customer.email) {
      await prisma.customerIdentity.create({
        data: {
          tenantId: tenant.id,
          customerId: customer.id,
          identityType: 'EMAIL',
          identityValue: customer.email,
          isPrimary: true,
          isVerified: true,
        },
      });
      identityCount++;
    }
    // Phone identity
    if (customer.phone) {
      await prisma.customerIdentity.create({
        data: {
          tenantId: tenant.id,
          customerId: customer.id,
          identityType: 'PHONE',
          identityValue: customer.phone,
          isPrimary: false,
          isVerified: Math.random() > 0.3,
        },
      });
      identityCount++;
    }
    // Address
    await prisma.customerAddress.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        addressType: 'HOME',
        line1: `${randomInt(1, 500)}, ${randomChoice(['MG Road', 'Park Street', 'Brigade Road', 'Link Road', 'Main Street'])}`,
        city: customer.city || 'Mumbai',
        state: customer.state || 'Maharashtra',
        country: 'IN',
        postalCode: `${randomInt(100000, 999999)}`,
        isDefault: true,
      },
    });
    addressCount++;
  }
  console.log(`  ✅ Created ${identityCount} identities, ${addressCount} addresses`);

  // ==============================
  // 15. PHASE 2A: COMMUNICATION PREFERENCES & CONSENT
  // ==============================
  console.log('');
  console.log('📬 Creating communication preferences & consent...');

  let prefCount = 0;
  let consentCount = 0;
  for (const customer of customers.slice(0, 60)) {
    // Preferences
    await prisma.customerPreference.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        emailEnabled: true,
        smsEnabled: Math.random() > 0.3,
        whatsappEnabled: Math.random() > 0.2,
        pushEnabled: Math.random() > 0.5,
        preferredChannel: randomChoice(['EMAIL', 'WHATSAPP', 'SMS'] as any),
        preferredLanguage: randomChoice(['en', 'hi']),
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      },
    });
    prefCount++;

    // Consent records
    await prisma.customerConsent.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        consentType: 'EMAIL_MARKETING',
        status: 'GRANTED',
        grantedAt: customer.createdAt,
        source: 'WEB_FORM',
      },
    });
    await prisma.customerConsent.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        consentType: 'ANALYTICS',
        status: 'GRANTED',
        grantedAt: customer.createdAt,
        source: 'WEB_FORM',
      },
    });
    consentCount += 2;
  }
  console.log(`  ✅ Created ${prefCount} preferences, ${consentCount} consents`);

  // ==============================
  // 16. PHASE 2A: PRODUCT CATALOG
  // ==============================
  console.log('');
  console.log('📦 Creating product catalog...');

  const uniqueCategories = [...new Set(PRODUCT_CATALOG.map(p => p.category))];
  const categoryMap: Record<string, string> = {};

  for (const catName of uniqueCategories) {
    const cat = await prisma.productCategory.create({
      data: {
        tenantId: tenant.id,
        name: catName,
        slug: catName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        isActive: true,
      },
    });
    categoryMap[catName] = cat.id;
  }
  console.log(`  ✅ Created ${uniqueCategories.length} product categories`);

  const productRecords: any[] = [];
  for (const p of PRODUCT_CATALOG) {
    const prod = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        categoryId: categoryMap[p.category],
        name: p.name,
        sku: `SKU-${PRODUCT_CATALOG.indexOf(p) + 1}`,
        basePrice: p.price,
        currency: 'INR',
        status: 'ACTIVE',
      },
    });
    productRecords.push(prod);
  }
  console.log(`  ✅ Created ${productRecords.length} products`);

  // ==============================
  // 17. PHASE 2A: FEATURE DEFINITIONS
  // ==============================
  console.log('');
  console.log('📐 Creating feature definitions...');

  const featureDefsData = [
    { name: 'RFM_SCORE', desc: 'Combined RFM score (0-100)', type: 'NUMERIC' as const, owner: 'intelligence-engine' },
    { name: 'TOTAL_SPEND', desc: 'Total revenue from delivered orders', type: 'NUMERIC' as const, owner: 'intelligence-engine' },
    { name: 'TOTAL_ORDERS', desc: 'Count of delivered orders', type: 'NUMERIC' as const, owner: 'intelligence-engine' },
    { name: 'AVG_ORDER_VALUE', desc: 'Average order value', type: 'NUMERIC' as const, owner: 'intelligence-engine' },
    { name: 'DAYS_SINCE_LAST_PURCHASE', desc: 'Days since most recent order', type: 'NUMERIC' as const, owner: 'intelligence-engine' },
    { name: 'ORDER_FREQUENCY', desc: 'Average days between orders', type: 'NUMERIC' as const, owner: 'intelligence-engine' },
    { name: 'DISCOUNT_AFFINITY', desc: 'Ratio of discounted orders (0-1)', type: 'NUMERIC' as const, owner: 'intelligence-engine' },
    { name: 'PREMIUM_BUYER_SCORE', desc: 'Premium purchase tendency (0-1)', type: 'NUMERIC' as const, owner: 'intelligence-engine' },
    { name: 'CATEGORY_DIVERSITY', desc: 'Shopping category diversity (0-1)', type: 'NUMERIC' as const, owner: 'intelligence-engine' },
    { name: 'WEEKEND_BUYER_SCORE', desc: 'Weekend purchase tendency (0-1)', type: 'NUMERIC' as const, owner: 'intelligence-engine' },
    { name: 'WHATSAPP_ENGAGEMENT', desc: 'WhatsApp channel engagement (0-1)', type: 'NUMERIC' as const, owner: 'communication-engine' },
    { name: 'EMAIL_ENGAGEMENT', desc: 'Email channel engagement (0-1)', type: 'NUMERIC' as const, owner: 'communication-engine' },
    { name: 'PURCHASE_RECENCY', desc: 'Purchase recency score (0-1)', type: 'NUMERIC' as const, owner: 'intelligence-engine' },
    { name: 'LIFETIME_VALUE', desc: 'Predicted customer lifetime value', type: 'NUMERIC' as const, owner: 'intelligence-engine' },
  ];

  for (const fd of featureDefsData) {
    const def = await prisma.featureDefinition.create({
      data: {
        tenantId: tenant.id,
        featureName: fd.name,
        description: fd.desc,
        dataType: fd.type,
        owner: fd.owner,
        status: 'ACTIVE',
      },
    });
    await prisma.featureVersion.create({
      data: {
        tenantId: tenant.id,
        featureDefinitionId: def.id,
        version: 1,
        formula: `compute_${fd.name}(customer_id)`,
        description: `Initial version of ${fd.name}`,
      },
    });
  }
  console.log(`  ✅ Created ${featureDefsData.length} feature definitions with versions`);

  // ==============================
  // SUMMARY
  // ==============================
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('🌱 SEED COMPLETE');
  console.log('═══════════════════════════════════════');
  console.log(`  Tenant:       1 (${tenant.name})`);
  console.log(`  Users:        ${users.length}`);
  console.log(`  Tags:         ${tags.length}`);
  console.log(`  Customers:    ${customers.length}`);
  console.log(`  Orders:       ${orders.length}`);
  console.log(`  Metrics:      ${metricsCount}`);
  console.log(`  Features:     ${featureCount}`);
  console.log(`  Personas:     ${personas.length}`);
  console.log(`  Segments:     ${segments.length}`);
  console.log(`  Goals:        ${goals.length}`);
  console.log(`  Campaigns:    ${campaigns.length}`);
  console.log(`  Events:       ${eventCount}`);
  console.log(`  Providers:    ${providersData.length}`);
  console.log(`  --- Phase 2A ---`);
  console.log(`  Identities:   ${identityCount}`);
  console.log(`  Addresses:    ${addressCount}`);
  console.log(`  Preferences:  ${prefCount}`);
  console.log(`  Consents:     ${consentCount}`);
  console.log(`  Categories:   ${uniqueCategories.length}`);
  console.log(`  Products:     ${productRecords.length}`);
  console.log(`  Feature Defs: ${featureDefsData.length}`);
  console.log('═══════════════════════════════════════');
  console.log('');
  console.log(`  Tenant ID: ${tenant.id}`);
  console.log('  Use this ID in x-tenant-id header for API calls');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
