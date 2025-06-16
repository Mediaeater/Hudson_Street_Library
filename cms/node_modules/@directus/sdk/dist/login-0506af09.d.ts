type AuthenticationMode = 'json' | 'cookie';
interface AuthenticationData {
    access_token: string | null;
    refresh_token: string | null;
    expires: number | null;
    expires_at: number | null;
}
interface AuthenticationStorage {
    get: () => Promise<AuthenticationData | null> | AuthenticationData | null;
    set: (value: AuthenticationData | null) => Promise<void> | void;
}
interface AuthenticationConfig {
    autoRefresh?: boolean;
    msRefreshBeforeExpires?: number;
    storage?: AuthenticationStorage;
}
interface AuthenticationClient<_Schema extends object> {
    login(email: string, password: string, options: loginOptions): Promise<AuthenticationData>;
    refresh(): Promise<AuthenticationData>;
    logout(): Promise<void>;
    getToken(): Promise<string | null>;
    setToken(access_token: string | null): void;
}
interface StaticTokenClient<_Schema extends object> {
    getToken(): Promise<string | null>;
    setToken(access_token: string | null): void;
}

type HttpMethod = 'GET' | 'SEARCH' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
interface RequestOptions {
    path: string;
    method?: HttpMethod;
    params?: Record<string, any>;
    headers?: Record<string, string>;
    body?: string | FormData;
    onRequest?: RequestTransformer;
    onResponse?: ResponseTransformer;
}
interface RequestTransformer {
    (options: RequestInit): RequestInit | Promise<RequestInit>;
}
interface ResponseTransformer {
    <Output = any>(data: any): Output | Promise<Output>;
}

interface RestCommand<_Output extends object | unknown, _Schema extends object> {
    (): RequestOptions;
}
interface RestClient<Schema extends object> {
    request<Output extends object>(options: RestCommand<Output, Schema>): Promise<Output>;
}
interface RestConfig {
    onRequest?: RequestTransformer;
    onResponse?: ResponseTransformer;
}

interface loginOptions {
    otp?: string;
    provider?: string;
    mode?: AuthenticationMode;
}
/**
 * Retrieve a temporary access token and refresh token.
 *
 * @param email Email address of the user you're retrieving the access token for.
 * @param password Password of the user.
 * @param options Optional login settings
 *
 * @returns The access and refresh tokens for the session
 */
declare const login: <Schema extends object>(email: string, password: string, options?: loginOptions) => RestCommand<AuthenticationData, Schema>;

export { AuthenticationMode as A, HttpMethod as H, RestCommand as R, StaticTokenClient as S, AuthenticationData as a, AuthenticationStorage as b, AuthenticationConfig as c, AuthenticationClient as d, login as e, RestClient as f, RestConfig as g, RequestOptions as h, RequestTransformer as i, ResponseTransformer as j, loginOptions as l };
