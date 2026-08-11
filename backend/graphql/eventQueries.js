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
          }
        }
      }
    }
  }
`;

