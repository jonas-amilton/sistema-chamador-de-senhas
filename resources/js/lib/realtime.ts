import { configureEcho, echo } from '@laravel/echo-react';
import type { DisplayCall } from '@/types';

type Connection = {
    bind(event: string, callback: () => void): void;
    unbind(event: string, callback: () => void): void;
};

type ReverbConnector = {
    pusher: { connection: Connection };
};

let configured = false;

export function initializeRealtime(): void {
    if (configured || typeof window === 'undefined') {
        return;
    }

    configureEcho({ broadcaster: 'reverb' });
    configured = true;
}

export function subscribeToDisplay(
    unitId: string,
    onCall: (call: DisplayCall) => void,
    onConnection: (connected: boolean) => void,
): () => void {
    initializeRealtime();

    const client = echo<'reverb'>();
    const channelName = `units.${unitId}.display`;
    const eventName = '.ticket.display.updated';
    const channel = client.channel(channelName);
    const connection = (client.connector as unknown as ReverbConnector).pusher
        .connection;
    const connected = () => onConnection(true);
    const disconnected = () => onConnection(false);

    channel.listen(eventName, onCall);
    connection.bind('connected', connected);
    connection.bind('disconnected', disconnected);
    connection.bind('unavailable', disconnected);

    return () => {
        channel.stopListening(eventName, onCall);
        connection.unbind('connected', connected);
        connection.unbind('disconnected', disconnected);
        connection.unbind('unavailable', disconnected);
        client.leaveChannel(channelName);
    };
}
