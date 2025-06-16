/**
 * empty directus client
 */
interface DirectusClient<Schema extends object> {
    url: URL;
    with: <Extension extends object>(createExtension: (client: DirectusClient<Schema>) => Extension) => this & Extension;
}

export { DirectusClient as D };
