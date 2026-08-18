export const mockDiscounts = [
  {
    _id: "store_1",
    storeName: "Alpha Store Official",
    storeDomain: "alpha-store.myshopify.com",
    ownerName: "Sarah Jenkins",
    ownerEmail: "sarah@alphastore.com",
    storeEmail: "support@alphastore.com",
    country: "US",
    phoneNumber: "+1 (555) 234-5678",
    storeType: "Basic",
    isActive: true,
    isStoreClosed: false,
    createdAt: "2026-01-15T08:30:00.000Z",
    updatedAt: "2026-02-01T10:15:00.000Z",
    plan: "Basic - $8.00 Usd",
    pastEvents: [
      { eventName: "Installed", timestamp: "2026-01-15T08:30:00.000Z" }
    ],
    discounts: [
      {
        id: "disc_101",
        name: "Welcome 10% Off",
        discountType: "Percentage",
        totalSavingGiven: 1250,
        status: "active",
        createdAt: "2026-01-16T09:00:00.000Z"
      },
      {
        id: "disc_102",
        name: "BOGO Summer Special",
        discountType: "Buy X Get Y",
        totalSavingGiven: 3400,
        status: "active",
        createdAt: "2026-01-20T11:00:00.000Z"
      }
    ]
  },
  {
    _id: "store_2",
    storeName: "Beta Fashion AU",
    storeDomain: "beta-fashion.myshopify.com",
    ownerName: "Michael Chang",
    ownerEmail: "michael@betafashion.com",
    storeEmail: "contact@betafashion.com",
    country: "AU",
    phoneNumber: "+61 2 9876 5432",
    storeType: "Grow",
    isActive: true,
    isStoreClosed: false,
    createdAt: "2026-01-20T14:00:00.000Z",
    updatedAt: "2026-02-03T16:20:00.000Z",
    plan: "1500+ Customers - $9.99",
    pastEvents: [
      { eventName: "Installed", timestamp: "2026-01-20T14:00:00.000Z" }
    ],
    discounts: [
      {
        id: "disc_201",
        name: "VIP Exclusive $20 Off",
        discountType: "Fixed Amount",
        totalSavingGiven: 4800,
        status: "active",
        createdAt: "2026-01-22T10:00:00.000Z"
      }
    ]
  },
  {
    _id: "store_3",
    storeName: "Gamma Gadgets Dev",
    storeDomain: "gamma-gadgets.myshopify.com",
    ownerName: "Elena Rostova",
    ownerEmail: "elena@gammagadgets.io",
    storeEmail: "info@gammagadgets.io",
    country: "UK",
    phoneNumber: "+44 20 7946 0912",
    storeType: "Basic",
    isActive: false,
    isStoreClosed: false,
    createdAt: "2026-02-01T09:12:00.000Z",
    updatedAt: "2026-02-05T12:00:00.000Z",
    plan: "No Plan",
    pastEvents: [
      { eventName: "Installed", timestamp: "2026-02-01T09:12:00.000Z" },
      { eventName: "Uninstalled", timestamp: "2026-02-05T12:00:00.000Z" }
    ],
    discounts: []
  },
  {
    _id: "store_4",
    storeName: "Delta Decor B2B",
    storeDomain: "delta-decor.myshopify.com",
    ownerName: "David Miller",
    ownerEmail: "david@deltadecor.com",
    storeEmail: "sales@deltadecor.com",
    country: "CA",
    phoneNumber: "+1 (416) 555-8910",
    storeType: "Trial",
    isActive: true,
    isStoreClosed: false,
    createdAt: "2026-02-02T11:45:00.000Z",
    updatedAt: "2026-02-06T15:30:00.000Z",
    plan: "Trial",
    pastEvents: [
      { eventName: "Installed", timestamp: "2026-02-02T11:45:00.000Z" }
    ],
    discounts: [
      {
        id: "disc_401",
        name: "Free Shipping Orders over $50",
        discountType: "Free Shipping",
        totalSavingGiven: 920,
        status: "active",
        createdAt: "2026-02-03T14:00:00.000Z"
      }
    ]
  },
  {
    _id: "store_5",
    storeName: "Epsilon Organic",
    storeDomain: "epsilon-organic.myshopify.com",
    ownerName: "Rachel Green",
    ownerEmail: "rachel@epsilonorganic.com",
    storeEmail: "hello@epsilonorganic.com",
    country: "NZ",
    phoneNumber: "+64 9 123 7890",
    storeType: "Advanced",
    isActive: false,
    isStoreClosed: true,
    createdAt: "2026-02-04T10:00:00.000Z",
    updatedAt: "2026-02-07T08:00:00.000Z",
    plan: "No Plan",
    pastEvents: [
      { eventName: "Installed", timestamp: "2026-02-04T10:00:00.000Z" },
      { eventName: "Closed", timestamp: "2026-02-07T08:00:00.000Z" }
    ],
    discounts: []
  }
];

export const mockMonthlyTrends = [
  { key: "2026-01", label: "Jan 2026", installed: 2, uninstalled: 0, discountsCreated: 3 },
  { key: "2026-02", label: "Feb 2026", installed: 3, uninstalled: 1, discountsCreated: 1 }
];
