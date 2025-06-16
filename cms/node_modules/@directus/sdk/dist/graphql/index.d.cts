import { D as DirectusClient } from '../client-e8d6bf91.js';

interface GraphqlClient<_Schema extends object> {
    query<Output extends object = Record<string, any>>(query: string, variables?: Record<string, unknown>, scope?: 'items' | 'system'): Promise<Output>;
}
type GqlResult<Schema extends object, Collection extends keyof Schema> = {
    [Key in Collection]: Schema[Collection][];
};

/**
 * Creates a client to communicate with Directus GraphQL.
 *
 * @returns A Directus GraphQL client.
 */
declare const graphql: () => <Schema extends object>(client: DirectusClient<Schema>) => GraphqlClient<Schema>;

export { GqlResult, GraphqlClient, graphql };
