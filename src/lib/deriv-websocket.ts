import { getAppId } from '@deriv/shared';

type TCallback = (data: any) => void;

class DerivWebSocket {
    private ws: WebSocket | null = null;
    private appId: string;
    private listeners: Map<string, Set<TCallback>> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private endpoint = 'wss://ws.derivws.com/websockets/v3';

    constructor(appId?: string) {
        this.appId = String(appId || getAppId());
    }

    public connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                if (this.ws) {
                    this.disconnect();
                }

                console.log(`[DerivWebSocket] Connecting with App ID: ${this.appId}`);
                this.ws = new WebSocket(`${this.endpoint}?app_id=${this.appId}`);

                this.ws.onopen = () => {
                    console.log('[DerivWebSocket] Connected');
                    this.reconnectAttempts = 0;
                    this.startHeartbeat();
                    resolve();
                };

                this.ws.onmessage = event => {
                    const data = JSON.parse(event.data);
                    const msgType = data.msg_type;
                    if (msgType && this.listeners.has(msgType)) {
                        this.listeners.get(msgType)?.forEach(callback => callback(data));
                    }
                };

                this.ws.onerror = error => {
                    // Only log/reject if we are still active
                    if (this.ws) {
                        console.error('[DerivWebSocket] Error:', error);
                        reject(error);
                    }
                };

                this.ws.onclose = event => {
                    console.log('[DerivWebSocket] Disconnected', event.wasClean ? 'Cleanly' : 'Abruptly');
                    this.stopHeartbeat();
                    if (this.ws) {
                        this.handleReconnect();
                    }
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    private heartbeatInterval: NodeJS.Timeout | null = null;

    private startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            this.send({ ping: 1 });
        }, 30000); // 30 seconds
    }

    private stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    private handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            // Exponential backoff with jitter
            const baseDelay = 1000 * Math.pow(2, this.reconnectAttempts);
            const jitter = Math.random() * 1000;
            const delay = Math.min(baseDelay + jitter, 30000);
            
            console.log(`[DerivWebSocket] Reconnecting in ${Math.round(delay)}ms (Attempt ${this.reconnectAttempts})`);
            setTimeout(() => this.connect(), delay);
        } else {
             console.error('[DerivWebSocket] Max reconnect attempts reached');
        }
    }

    public async getActiveSymbols(active_symbols = 'brief', product_type = 'basic'): Promise<any> {
        return this.send({ active_symbols, product_type });
    }

    public disconnect(): void {
        this.stopHeartbeat();
        if (this.ws) {
            const tempWs = this.ws;
            this.ws = null; // Prevent reconnect loop
            
            tempWs.onclose = null;
            tempWs.onopen = null;
            tempWs.onerror = null;
            tempWs.onmessage = null;

            if (tempWs.readyState === WebSocket.OPEN || tempWs.readyState === WebSocket.CONNECTING) {
                tempWs.close();
            }
        }
    }

    public subscribeTicks(symbol: string): void {
        this.send({
            ticks: symbol,
            subscribe: 1,
        });
    }

    public unsubscribeTicks(): void {
        this.send({
            forget_all: 'ticks',
        });
    }

    public send(message: any): void {
        if (this.isConnected()) {
            this.ws?.send(JSON.stringify(message));
        } else {
            console.warn('[DerivWebSocket] Cannot send message: Not connected');
        }
    }

    public subscribe(msgType: string, callback: TCallback): () => void {
        if (!this.listeners.has(msgType)) {
            this.listeners.set(msgType, new Set());
        }
        this.listeners.get(msgType)?.add(callback);

        return () => {
            this.listeners.get(msgType)?.delete(callback);
        };
    }

    public isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}

export default DerivWebSocket;
