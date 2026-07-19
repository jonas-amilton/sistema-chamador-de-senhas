import { Head } from '@inertiajs/react';
import { Clock3, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getJson } from '@/lib/http';
import { subscribeToDisplay } from '@/lib/realtime';
import { state as displayStateRoute } from '@/routes/display';
import type { DisplayCall, DisplayState, Unit } from '@/types';

type Props = {
    unit: Unit;
    displayState: DisplayState;
    pollSeconds: number;
};

const digitNames: Record<string, string> = {
    '0': 'zero',
    '1': 'um',
    '2': 'dois',
    '3': 'três',
    '4': 'quatro',
    '5': 'cinco',
    '6': 'seis',
    '7': 'sete',
    '8': 'oito',
    '9': 'nove',
};

export default function Display({ unit, displayState, pollSeconds }: Props) {
    const [state, setState] = useState(displayState);
    const [connected, setConnected] = useState(false);
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [clock, setClock] = useState(() => new Date());
    const audioEnabledRef = useRef(false);

    useEffect(() => {
        const timer = window.setInterval(() => setClock(new Date()), 1000);

        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        return subscribeToDisplay(
            unit.id,
            (call) => {
                setState((current) => addCall(current, call));

                if (audioEnabledRef.current) {
                    announce(call);
                }
            },
            setConnected,
        );
    }, [unit.id]);

    useEffect(() => {
        const controller = new AbortController();

        async function refresh(): Promise<void> {
            try {
                const fresh = await getJson<DisplayState>(
                    displayStateRoute.url(unit),
                    controller.signal,
                );
                setState(fresh);
            } catch (error) {
                if (!(
                    error instanceof DOMException && error.name === 'AbortError'
                )) {
                    setConnected(false);
                }
            }
        }

        if (connected) {
            void refresh();
        }

        const timer = window.setInterval(
            () => void refresh(),
            Math.max(10, pollSeconds) * 1000,
        );

        return () => {
            controller.abort();
            window.clearInterval(timer);
        };
    }, [connected, pollSeconds, unit]);

    function enableAudio(): void {
        audioEnabledRef.current = !audioEnabled;
        setAudioEnabled(!audioEnabled);
    }

    const current = state.current;
    const formattedClock = new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: unit.timezone,
    }).format(clock);

    return (
        <>
            <Head title={`Painel - ${unit.name}`} />
            <main className="min-h-screen overflow-hidden bg-[#071a2b] text-white">
                <div className="grid min-h-screen lg:grid-cols-[1fr_23rem]">
                    <section className="relative flex min-h-[70vh] flex-col justify-between p-6 sm:p-10 lg:p-14">
                        <div className="absolute inset-0 [background-image:radial-gradient(circle_at_20%_20%,#22d3ee_0,transparent_28%),radial-gradient(circle_at_80%_80%,#f59e0b_0,transparent_25%)] opacity-20" />
                        <header className="relative flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-5">
                            <div>
                                <p className="text-xs font-bold tracking-[0.24em] text-cyan-300 uppercase">
                                    Painel de chamadas
                                </p>
                                <h1 className="mt-1 text-xl font-black sm:text-2xl">
                                    {unit.name}
                                </h1>
                            </div>
                            <div className="flex items-center gap-3">
                                <span
                                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${connected ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-200'}`}
                                >
                                    {connected ? (
                                        <Wifi className="size-4" aria-hidden />
                                    ) : (
                                        <WifiOff
                                            className="size-4"
                                            aria-hidden
                                        />
                                    )}
                                    {connected
                                        ? 'Tempo real'
                                        : 'Atualização automática'}
                                </span>
                                <Button
                                    onClick={enableAudio}
                                    variant="outline"
                                    className="border-white/20 bg-white/5 text-white hover:bg-white/15 hover:text-white"
                                >
                                    {audioEnabled ? (
                                        <Volume2
                                            className="mr-2 size-4"
                                            aria-hidden
                                        />
                                    ) : (
                                        <VolumeX
                                            className="mr-2 size-4"
                                            aria-hidden
                                        />
                                    )}
                                    {audioEnabled
                                        ? 'Som ativado'
                                        : 'Ativar som'}
                                </Button>
                            </div>
                        </header>

                        <div
                            className="relative py-12 text-center"
                            aria-live="assertive"
                            aria-atomic="true"
                        >
                            {current ? (
                                <>
                                    <p className="text-lg font-bold tracking-[0.3em] text-cyan-300 uppercase">
                                        Senha
                                    </p>
                                    <p className="mt-2 font-mono text-[clamp(5rem,17vw,13rem)] leading-none font-black tracking-[-0.08em] text-white drop-shadow-2xl">
                                        {current.code}
                                    </p>
                                    <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
                                        <div className="rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-5">
                                            <p className="text-xs font-bold tracking-widest text-cyan-200 uppercase">
                                                Dirija-se ao
                                            </p>
                                            <p className="mt-1 text-3xl font-black">
                                                {current.counter?.name ??
                                                    'Guichê'}
                                            </p>
                                        </div>
                                        <div className="rounded-3xl border border-white/15 bg-white/5 p-5">
                                            <p className="text-xs font-bold tracking-widest text-slate-300 uppercase">
                                                Serviço
                                            </p>
                                            <p className="mt-1 text-2xl font-bold">
                                                {current.service.name}
                                            </p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="mx-auto max-w-xl rounded-[2rem] border border-white/10 bg-white/5 p-10">
                                    <p className="text-4xl font-black">
                                        Aguardando a próxima chamada
                                    </p>
                                    <p className="mt-4 text-slate-300">
                                        As novas senhas aparecerão aqui
                                        automaticamente.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="relative flex items-center justify-between border-t border-white/15 pt-5 text-slate-300">
                            <span>Acompanhe o código e o guichê.</span>
                            <span className="flex items-center gap-2 font-mono text-xl font-bold text-white">
                                <Clock3
                                    className="size-5 text-cyan-300"
                                    aria-hidden
                                />
                                {formattedClock}
                            </span>
                        </div>
                    </section>

                    <aside className="border-t border-white/15 bg-[#0d2437] p-6 lg:border-t-0 lg:border-l lg:p-8">
                        <h2 className="text-sm font-black tracking-[0.2em] text-slate-300 uppercase">
                            Últimas chamadas
                        </h2>
                        <ol className="mt-6 grid gap-3">
                            {state.recent.length === 0 && (
                                <li className="rounded-2xl border border-white/10 p-5 text-sm text-slate-400">
                                    Nenhuma chamada anterior.
                                </li>
                            )}
                            {state.recent.map((call) => (
                                <li
                                    key={call.event_id}
                                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                                >
                                    <div>
                                        <strong className="font-mono text-2xl">
                                            {call.code}
                                        </strong>
                                        <p className="text-xs text-slate-400">
                                            {call.service.name}
                                        </p>
                                    </div>
                                    <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-sm font-bold text-cyan-200">
                                        {call.counter?.code ?? '-'}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </aside>
                </div>
            </main>
        </>
    );
}

export function addCall(state: DisplayState, call: DisplayCall): DisplayState {
    if (
        state.current?.event_id === call.event_id ||
        state.recent.some((item) => item.event_id === call.event_id)
    ) {
        return state;
    }

    return {
        current: call,
        recent: [state.current, ...state.recent]
            .filter((item): item is DisplayCall => item !== null)
            .slice(0, 5),
    };
}

function announce(call: DisplayCall): void {
    const chime = new Audio('/audio/chamada.wav');
    const code = call.code
        .split('')
        .map((character) => digitNames[character] ?? character)
        .join(' ');
    const text = `Senha ${code}. Dirija-se ao ${call.counter?.name ?? 'guichê'}.`;
    let spoken = false;
    const speak = () => {
        if (
            spoken ||
            !('speechSynthesis' in window) ||
            !('SpeechSynthesisUtterance' in window)
        ) {
            return;
        }

        spoken = true;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    };

    chime.addEventListener('ended', speak, { once: true });
    void chime
        .play()
        .then(() => window.setTimeout(speak, 2500))
        .catch(speak);
}
