export const mockDiscounts = [
  {
    _id: "store_1",
    storeDomain: "alpha-store.myshopify.com",
    ownerName: "Sarah Jenkins",
    ownerEmail: "sarah@alphastore.com",
    storeEmail: "support@alphastore.com",
    isActive: true,
    isStoreClosed: false,
    onboardingStatus: true,
    createdAt: "2026-01-15T08:30:00.000Z",
    updatedAt: "2026-02-01T10:15:00.000Z",
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
    storeDomain: "beta-fashion.myshopify.com",
    ownerName: "Michael Chang",
    ownerEmail: "michael@betafashion.com",
    storeEmail: "contact@betafashion.com",
    isActive: true,
    isStoreClosed: false,
    onboardingStatus: true,
    createdAt: "2026-01-20T14:00:00.000Z",
    updatedAt: "2026-02-03T16:20:00.000Z",
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
    storeDomain: "gamma-gadgets.myshopify.com",
    ownerName: "Elena Rostova",
    ownerEmail: "elena@gammagadgets.io",
    storeEmail: "info@gammagadgets.io",
    isActive: false,
    isStoreClosed: false,
    onboardingStatus: false,
    createdAt: "2026-02-01T09:12:00.000Z",
    updatedAt: "2026-02-05T12:00:00.000Z",
    pastEvents: [
      { eventName: "Installed", timestamp: "2026-02-01T09:12:00.000Z" },
      { eventName: "Uninstalled", timestamp: "2026-02-05T12:00:00.000Z" }
    ],
    discounts: []
  },
  {
    _id: "store_4",
    storeDomain: "delta-decor.myshopify.com",
    ownerName: "David Miller",
    ownerEmail: "david@deltadecor.com",
    storeEmail: "sales@deltadecor.com",
    isActive: true,
    isStoreClosed: false,
    onboardingStatus: true,
    createdAt: "2026-02-02T11:45:00.000Z",
    updatedAt: "2026-02-06T15:30:00.000Z",
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
    storeDomain: "epsilon-organic.myshopify.com",
    ownerName: "Rachel Green",
    ownerEmail: "rachel@epsilonorganic.com",
    storeEmail: "hello@epsilonorganic.com",
    isActive: false,
    isStoreClosed: true,
    onboardingStatus: false,
    createdAt: "2026-02-04T10:00:00.000Z",
    updatedAt: "2026-02-07T08:00:00.000Z",
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
