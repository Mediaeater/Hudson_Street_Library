import { D as DirectusClient } from '../client-e8d6bf91.js';
import { a as WebSocketConfig, d as WebSocketClient } from '../output-35b496cf.js';
export { R as RemoveEventHandler, S as SubscribeOptions, f as SubscriptionEvents, e as SubscriptionOptionsEvents, g as SubscriptionOutput, h as SubscriptionPayload, W as WebSocketAuthModes, c as WebSocketEventHandler, b as WebSocketEvents } from '../output-35b496cf.js';

interface EmailAuth {
    email: string;
    password: string;
    uid?: string;
}
interface TokenAuth {
    access_token: string;
    uid?: string;
}
interface RefreshAuth {
    refresh_token: string;
    uid?: string;
}
declare function auth(creds: EmailAuth | TokenAuth | RefreshAuth): string;

declare const pong: () => string;

/**
 * Creates a client to communicate with a Directus REST WebSocket.
 *
 * @param config The optional configuration.
 *
 * @returns A Directus realtime client.
 */
declare function realtime(config?: WebSocketConfig): <Schema extends object>(client: DirectusClient<Schema>) => WebSocketClient<Schema>;

/**
 * Fallback generator function to get increment id's for subscriptions
 */
declare function generateUid(): Generator<string, string, unknown>;

/**
 * Wait for a websocket response
 *
 * @param socket WebSocket
 *
 * @returns Incoming message object
 */
declare const messageCallback: (socket: globalThis.WebSocket) => Promise<Record<string, any> | MessageEvent<string>>;

/**
 * Wait for a certain amount of ms
 * @param delay number in MS
 * @returns void
 */
declare const sleep: (delay: number) => Promise<void>;

export { EmailAuth, RefreshAuth, TokenAuth, WebSocketClient, WebSocketConfig, auth, generateUid, messageCallback, pong, realtime, sleep };
