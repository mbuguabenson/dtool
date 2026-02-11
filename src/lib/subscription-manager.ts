/**
 * Centralized WebSocket Subscription Manager
 * Prevents duplicate subscriptions and manages cleanup when switching tabs
 */

type SubscriptionCallback = (data: unknown) => void;

interface ActiveSubscription {
    symbol: string;
    id: string | null;
    callbacks: Set<SubscriptionCallback>;
    unsubscribe: (() => void) | null;
}

class SubscriptionManager {
    private activeSubscriptions: Map<string, ActiveSubscription> = new Map();
    private api: { 
        send: (data: unknown) => Promise<unknown>; 
        onMessage: () => { 
            subscribe: (callback: (data: unknown) => void) => { 
                unsubscribe: () => void; 
            } 
        };
        connection: { readyState: number };
    } | null = null;

    setApi(api: any) {
        this.api = api;
    }

    /**
     * Subscribe to ticks_history for a symbol
     * Returns unsubscribe function
     */
    async subscribeToTicks(symbol: string, callback: SubscriptionCallback, count: number = 1000): Promise<() => void> {
        const key = `ticks_${symbol}`;

        // If already subscribed, just add callback
        if (this.activeSubscriptions.has(key)) {
            const sub = this.activeSubscriptions.get(key)!;
            sub.callbacks.add(callback);

            // Return unsubscribe function for this specific callback
            return () => {
                sub.callbacks.delete(callback);
                // If no more callbacks, unsubscribe completely
                if (sub.callbacks.size === 0) {
                    this.unsubscribe(key);
                }
            };
        }

        // Create new subscription
        const subscription: ActiveSubscription = {
            symbol,
            id: null,
            callbacks: new Set([callback]),
            unsubscribe: null,
        };

        this.activeSubscriptions.set(key, subscription);

        try {
            if (!this.api) {
                console.warn('[SubscriptionManager] API not initialized');
                return () => this.unsubscribe(key);
            }

            if (this.api.connection.readyState !== 1) {
                console.warn('[SubscriptionManager] WebSocket not in OPEN state (readyState:', this.api.connection.readyState, ')');
                this.activeSubscriptions.delete(key);
                throw new Error('Connection not ready. Please wait or refresh.');
            }

            // Subscribe to ticks_history
            let response;
            try {
                response = await this.api.send({
                    ticks_history: symbol,
                    count,
                    end: 'latest',
                    style: 'ticks',
                    subscribe: 1,
                });
            } catch (error: unknown) {
                // If already subscribed error, we can safely ignore and proceed to listen
                const err = error as { error?: { code: string }; code?: string };
                if (err?.error?.code === 'AlreadySubscribed' || err?.code === 'AlreadySubscribed') {
                    console.log(`[SubscriptionManager] Already subscribed to ${symbol} (ignoring error)`);
                } else {
                    throw error;
                }
            }

            if (response && response.error) {
                // If already subscribed error, we can safely ignore and use existing subscription
                if (response.error.code === 'AlreadySubscribed') {
                    console.log(`[SubscriptionManager] Using existing subscription for ${symbol}`);
                    // The subscription already exists on the server, so we just track it locally
                } else {
                    console.error('[SubscriptionManager] Subscription error:', response.error);
                    this.activeSubscriptions.delete(key);
                    throw new Error(response.error.message);
                }
            }

            if (response.subscription) {
                subscription.id = response.subscription.id;
            }

            // Set up message listener
            const messageHandler = (data: any) => {
                // Basic filtering to ensure we only process messages for this symbol
                const msgSymbol = data.tick?.symbol || data.echo_req?.ticks_history;
                if (msgSymbol && msgSymbol !== symbol) return;

                if (data.msg_type === 'tick' || data.msg_type === 'history') {
                    const sub = this.activeSubscriptions.get(key);
                    if (sub) {
                        sub.callbacks.forEach(cb => cb(data));
                    }
                }
            };

            // Store unsubscribe function
            subscription.unsubscribe = this.api.onMessage().subscribe(messageHandler).unsubscribe;
        } catch (error) {
            console.error('[SubscriptionManager] Failed to subscribe:', error);
            this.activeSubscriptions.delete(key);
            throw error;
        }

        // Return unsubscribe function
        return () => {
            const sub = this.activeSubscriptions.get(key);
            if (sub) {
                sub.callbacks.delete(callback);
                if (sub.callbacks.size === 0) {
                    this.unsubscribe(key);
                }
            }
        };
    }

    /**
     * Unsubscribe from a specific symbol
     */
    private unsubscribe(key: string) {
        const subscription = this.activeSubscriptions.get(key);
        if (!subscription) return;

        // Call unsubscribe for message handler
        if (subscription.unsubscribe) {
            subscription.unsubscribe();
        }

        // Forget subscription on server if we have an ID
        if (subscription.id && this.api) {
            this.api.send({ forget: subscription.id }).catch((err: unknown) => {
                console.warn('[SubscriptionManager] Failed to forget subscription:', err);
            });
        }

        this.activeSubscriptions.delete(key);
    }

    /**
     * Unsubscribe from all active subscriptions
     */
    unsubscribeAll() {
        const keys = Array.from(this.activeSubscriptions.keys());
        keys.forEach(key => this.unsubscribe(key));
    }

    /**
     * Reset manager state (useful on connection loss/reset)
     * Clears all subscriptions without attempting to send forget requests
     */
    reset() {
        this.activeSubscriptions.clear();
    }

    /**
     * Get active subscriptions count
     */
    getActiveCount(): number {
        return this.activeSubscriptions.size;
    }

    /**
     * Check if subscribed to a symbol
     */
    isSubscribed(symbol: string): boolean {
        return this.activeSubscriptions.has(`ticks_${symbol}`);
    }
}

// Export singleton instance
export const subscriptionManager = new SubscriptionManager();
export default subscriptionManager;
