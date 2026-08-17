export const GET_APP_EVENTS_QUERY = `
  query getAppEvents($appId: ID!, $after: String) {
    app(id: $appId) {
      id
      name
      events(first: 100, after: $after) {
        pageInfo {
          hasNextPage
        }
        edges {
          cursor
          node {
            type
            occurredAt
            shop {
              id
              myshopifyDomain
            }
            ... on SubscriptionChargeActivated {
              charge {
                name
                amount {
                  amount
                  currencyCode
                }
              }
            }
            ... on SubscriptionChargeCanceled {
              charge {
                name
                amount {
                  amount
                  currencyCode
                }
              }
            }
            ... on SubscriptionChargeExpired {
              charge {
                name
                amount {
                  amount
                  currencyCode
                }
              }
            }
            ... on SubscriptionChargeFrozen {
              charge {
                name
                amount {
                  amount
                  currencyCode
                }
              }
            }
            ... on SubscriptionChargeUnfrozen {
              charge {
                name
                amount {
                  amount
                  currencyCode
                }
              }
            }
            ... on SubscriptionChargeDeclined {
              charge {
                name
                amount {
                  amount
                  currencyCode
                }
              }
            }
            ... on SubscriptionChargeAccepted {
              charge {
                name
                amount {
                  amount
                  currencyCode
                }
              }
            }
            ... on OneTimeChargeActivated {
              charge {
                name
                amount {
                  amount
                  currencyCode
                }
              }
            }
            ... on OneTimeChargeExpired {
              charge {
                name
                amount {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    }
  }
`;

