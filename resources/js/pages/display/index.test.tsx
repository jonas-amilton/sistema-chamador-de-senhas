import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { subscribeToDisplay } from '@/lib/realtime';
import type { DisplayCall, DisplayState, Unit } from '@/types';
import Display from './index';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
}));

vi.mock('@/lib/realtime', () => ({
    subscribeToDisplay: vi.fn(),
}));

const fetchMock = vi.fn<typeof fetch>();
const subscribeMock = vi.mocked(subscribeToDisplay);
const unsubscribeMock = vi.fn<() => void>();
let realtimeCall: ((call: DisplayCall) => void) | null = null;
let audioPlayImplementation: () => Promise<void> = () => Promise.resolve();
let audioInstances: AudioMock[] = [];

class AudioMock {
    readonly addEventListener =
        vi.fn<
            (
                type: string,
                listener: EventListenerOrEventListenerObject,
                options?: boolean | AddEventListenerOptions,
            ) => void
        >();
    readonly play = vi.fn(() => audioPlayImplementation());

    constructor(readonly src?: string) {
        audioInstances.push(this);
    }
}

class SpeechSynthesisUtteranceMock {
    lang = '';

    constructor(readonly text: string) {}
}

const unit: Unit = {
    id: 'unit-1',
    name: 'Unidade Centro',
    slug: 'centro',
    timezone: 'America/Sao_Paulo',
};

function makeCall(eventId: string, code: string): DisplayCall {
    return {
        event_id: eventId,
        ticket_id: `ticket-${eventId}`,
        unit_id: unit.id,
        code,
        priority: 'standard',
        service: { id: 'service-1', name: 'Atendimento geral' },
        counter: { id: 'counter-1', name: 'Guichê 1', code: 'G1' },
        type: 'called',
        called_at: '2026-07-19T12:00:00.000Z',
    };
}

function jsonResponse(payload: unknown): Response {
    return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}

function renderDisplay(displayState: DisplayState, pollSeconds = 30): void {
    render(
        <Display
            unit={unit}
            displayState={displayState}
            pollSeconds={pollSeconds}
        />,
    );
}

function emitRealtimeCall(call: DisplayCall): void {
    const callback = realtimeCall;

    if (!callback) {
        throw new Error('The realtime subscription was not initialized.');
    }

    act(() => callback(call));
}

function emitAudioEnded(audio: AudioMock): void {
    const registration = audio.addEventListener.mock.calls.find(
        ([type]) => type === 'ended',
    );
    const listener = registration?.[1];

    if (!listener) {
        throw new Error('The audio ended listener was not registered.');
    }

    const event = new Event('ended');

    act(() => {
        if (typeof listener === 'function') {
            listener(event);
        } else {
            listener.handleEvent(event);
        }
    });
}

beforeEach(() => {
    realtimeCall = null;
    audioInstances = [];
    audioPlayImplementation = () => Promise.resolve();
    fetchMock.mockReset();
    subscribeMock.mockReset();
    unsubscribeMock.mockReset();
    subscribeMock.mockImplementation((_unitId, onCall) => {
        realtimeCall = onCall;

        return unsubscribeMock;
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('Audio', AudioMock);
});

describe('Display', () => {
    it('applies realtime calls, deduplicates event IDs, and keeps recent calls in the live display', () => {
        const previous = makeCall('event-1', 'A100');
        const older = makeCall('event-0', 'A099');
        const incoming = makeCall('event-2', 'B200');
        renderDisplay({ current: previous, recent: [older] });

        expect(subscribeMock).toHaveBeenCalledWith(
            unit.id,
            expect.any(Function),
            expect.any(Function),
        );
        emitRealtimeCall(incoming);
        emitRealtimeCall({ ...incoming, code: 'DUPLICADA' });

        const currentCode = screen.getByText('B200');
        expect(currentCode.closest('[aria-live="assertive"]')).toHaveAttribute(
            'aria-atomic',
            'true',
        );
        expect(screen.queryByText('DUPLICADA')).not.toBeInTheDocument();

        const recentHeading = screen.getByRole('heading', {
            name: 'Últimas chamadas',
        });
        const recentPanel = recentHeading.closest('aside');

        if (!recentPanel) {
            throw new Error('The recent calls panel was not rendered.');
        }

        expect(within(recentPanel).getByText('A100')).toBeInTheDocument();
        expect(within(recentPanel).getByText('A099')).toBeInTheDocument();
        expect(within(recentPanel).getAllByRole('listitem')).toHaveLength(2);
    });

    it('uses HTTP polling as a fallback while realtime is disconnected', async () => {
        vi.useFakeTimers();
        const polledCall = makeCall('event-poll', 'P300');
        fetchMock.mockResolvedValueOnce(
            jsonResponse({ current: polledCall, recent: [] }),
        );
        renderDisplay({ current: null, recent: [] }, 1);

        expect(screen.getByText('Atualização automática')).toBeInTheDocument();

        await act(async () => {
            await vi.advanceTimersByTimeAsync(10_000);
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
            '/display/centro/state',
            expect.objectContaining({
                credentials: 'same-origin',
                signal: expect.any(AbortSignal),
            }),
        );
        expect(screen.getByText('P300')).toBeInTheDocument();
    });

    it('enables audio and announces the next realtime call with speech synthesis', async () => {
        const user = userEvent.setup();
        const cancelMock = vi.fn<() => void>();
        const speakMock =
            vi.fn<(utterance: SpeechSynthesisUtterance) => void>();
        audioPlayImplementation = () => new Promise<void>(() => undefined);
        vi.stubGlobal('speechSynthesis', {
            cancel: cancelMock,
            speak: speakMock,
        });
        vi.stubGlobal('SpeechSynthesisUtterance', SpeechSynthesisUtteranceMock);
        renderDisplay({ current: null, recent: [] });

        await user.click(screen.getByRole('button', { name: 'Ativar som' }));

        expect(
            screen.getByRole('button', { name: 'Som ativado' }),
        ).toBeInTheDocument();
        expect(audioInstances).toHaveLength(0);

        emitRealtimeCall(makeCall('event-audio', 'A12'));

        expect(audioInstances).toHaveLength(1);
        expect(audioInstances[0]?.src).toBe('/audio/chamada.wav');
        expect(audioInstances[0]?.play).toHaveBeenCalledOnce();
        emitAudioEnded(audioInstances[0]);

        expect(cancelMock).toHaveBeenCalledOnce();
        expect(speakMock).toHaveBeenCalledOnce();
        expect(speakMock.mock.calls[0]?.[0]).toMatchObject({
            text: 'Senha A um dois. Dirija-se ao Guichê 1.',
            lang: 'pt-BR',
        });
    });

    it('keeps the display working when audio playback fails without speech synthesis', async () => {
        const user = userEvent.setup();
        Reflect.deleteProperty(globalThis, 'speechSynthesis');
        Reflect.deleteProperty(globalThis, 'SpeechSynthesisUtterance');
        audioPlayImplementation = () =>
            Promise.reject(new Error('Autoplay unavailable'));
        renderDisplay({ current: null, recent: [] });

        await user.click(screen.getByRole('button', { name: 'Ativar som' }));
        emitRealtimeCall(makeCall('event-silent', 'S400'));
        await act(async () => Promise.resolve());

        expect(audioInstances[0]?.play).toHaveBeenCalledOnce();
        expect(screen.getByText('S400')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Som ativado' }),
        ).toBeEnabled();
    });
});
