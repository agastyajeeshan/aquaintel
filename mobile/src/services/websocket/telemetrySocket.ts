import { ENV } from '../../constants';
import { secureStorage } from '../storage/secureStore';

export type SocketConnectionState = 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED' | 'ERROR';

type TelemetryHandler = (data: any) => void;

class TelemetrySocketManager {
  private ws: WebSocket | null = null;
  private state: SocketConnectionState = 'DISCONNECTED';
  private listeners: Map<string, Set<TelemetryHandler>> = new Map();
  private stateListeners: Set<(state: SocketConnectionState) => void> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: any = null;
  private pingInterval: any = null;
  private isIntentionallyClosed = false;

  public getState(): SocketConnectionState {
    return this.state;
  }

  private setState(newState: SocketConnectionState) {
    this.state = newState;
    this.stateListeners.forEach((fn) => {
      try {
        fn(newState);
      } catch (e) {
        console.error('Error in socket state listener:', e);
      }
    });
  }

  public onStateChange(listener: (state: SocketConnectionState) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => this.stateListeners.delete(listener);
  }

  public subscribe(event: string, handler: TelemetryHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  public async connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isIntentionallyClosed = false;
    this.setState('CONNECTING');

    try {
      const token = await secureStorage.getAccessToken();
      const deviceId = await secureStorage.getDeviceUUID();
      const wsUrl = `${ENV.WS_BASE_URL}?client_id=${deviceId}${token ? `&token=${token}` : ''}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setState('CONNECTED');
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          const rawEvent = parsed.type || parsed.event || 'TELEMETRY_UPDATE';
          const normalizedEvent = String(rawEvent).toUpperCase();
          const payload = parsed.data || parsed;

          const handlers = this.listeners.get(rawEvent) || this.listeners.get(normalizedEvent);
          if (handlers) {
            handlers.forEach((h) => h(payload));
          }
          // Notify lowercase alias if different
          if (normalizedEvent === 'TELEMETRY_UPDATE' && rawEvent !== 'telemetry_update') {
            this.listeners.get('telemetry_update')?.forEach((h) => h(payload));
          }
          // Also notify generic wildcard listeners
          this.listeners.get('*')?.forEach((h) => h(parsed));
        } catch (e) {
          console.warn('Error parsing websocket telemetry payload:', e);
        }
      };

      this.ws.onerror = (e) => {
        console.warn('WebSocket error:', e);
        this.setState('ERROR');
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        if (!this.isIntentionallyClosed) {
          this.scheduleReconnect();
        } else {
          this.setState('DISCONNECTED');
        }
      };
    } catch (e) {
      this.setState('ERROR');
      this.scheduleReconnect();
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: 'ping', client_time: new Date().toISOString() }));
      }
    }, 20000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setState('DISCONNECTED');
      return;
    }
    this.setState('RECONNECTING');
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 30000) + Math.random() * 500;
    this.reconnectAttempts++;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  public disconnect() {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setState('DISCONNECTED');
  }
}

export const telemetrySocket = new TelemetrySocketManager();
