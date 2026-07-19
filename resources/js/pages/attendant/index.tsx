import { Head, Link } from '@inertiajs/react';
import {
    CircleAlert,
    Clock,
    Headphones,
    Play,
    RotateCcw,
    SkipForward,
    SquareCheckBig,
    UserX,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { getJson, HttpError, postJson } from '@/lib/http';
import {
    callNext,
    index as attendantIndex,
    state as attendantStateRoute,
} from '@/routes/attendant';
import {
    cancel,
    complete,
    noShow,
    recall,
    requeue,
    start,
} from '@/routes/attendant/tickets';
import type { Counter, QueueCounts, Ticket, Unit } from '@/types';

type StatePayload = {
    unit: Unit;
    counters: Counter[];
    queueCounts: QueueCounts;
    currentTickets: Ticket[];
};

type Props = StatePayload & { availableUnits: Pick<Unit, 'id' | 'name'>[] };
type OperationResponse = { message: string; ticket: Ticket | null };

export default function Attendant(props: Props) {
    const [queueState, setQueueState] = useState<StatePayload>(props);
    const [counterId, setCounterId] = useState(props.counters[0]?.id ?? '');
    const initialCounter = props.counters.find(
        (counter) => counter.id === counterId,
    );
    const [serviceId, setServiceId] = useState(
        initialCounter?.services[0]?.id ?? '',
    );
    const [busy, setBusy] = useState(false);
    const [feedback, setFeedback] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);
    const requestIds = useRef<Record<string, string>>({});
    const selectedCounter = queueState.counters.find(
        (counter) => counter.id === counterId,
    );
    const currentTicket = queueState.currentTickets.find(
        (ticket) => ticket.counter_id === counterId,
    );
    const counts = queueState.queueCounts[serviceId] ?? {
        standard: 0,
        priority: 0,
    };

    useEffect(() => {
        const controller = new AbortController();
        const timer = window.setInterval(() => {
            void fetchAttendantState(props.unit.id, controller.signal)
                .then(setQueueState)
                .catch((refreshError: unknown) => {
                    if (!(
                        refreshError instanceof DOMException &&
                        refreshError.name === 'AbortError'
                    )) {
                        setFeedback({
                            type: 'error',
                            message: 'Não foi possível atualizar a fila.',
                        });
                    }
                });
        }, 15000);

        return () => {
            controller.abort();
            window.clearInterval(timer);
        };
    }, [props.unit.id]);

    async function refresh(signal?: AbortSignal): Promise<void> {
        try {
            const next = await fetchAttendantState(props.unit.id, signal);
            setQueueState(next);
        } catch (refreshError) {
            if (!(
                refreshError instanceof DOMException &&
                refreshError.name === 'AbortError'
            )) {
                setFeedback({
                    type: 'error',
                    message: 'Não foi possível atualizar a fila.',
                });
            }
        }
    }

    function changeCounter(nextCounterId: string): void {
        setCounterId(nextCounterId);
        const counter = queueState.counters.find(
            (item) => item.id === nextCounterId,
        );
        setServiceId(counter?.services[0]?.id ?? '');
        setFeedback(null);
    }

    async function execute(
        url: string,
        key: string,
        payload: Record<string, unknown>,
    ): Promise<void> {
        if (busy) {
            return;
        }

        const requestId = requestIds.current[key] ?? crypto.randomUUID();
        requestIds.current[key] = requestId;
        setBusy(true);
        setFeedback(null);

        try {
            const response = await postJson<OperationResponse>(url, {
                ...payload,
                request_id: requestId,
            });
            delete requestIds.current[key];
            setFeedback({ type: 'success', message: response.message });
            await refresh();
        } catch (operationError) {
            setFeedback({
                type: 'error',
                message:
                    operationError instanceof HttpError
                        ? operationError.message
                        : 'A conexão falhou. Tente novamente; a mesma operação será reutilizada.',
            });
        } finally {
            setBusy(false);
        }
    }

    async function callNextTicket(): Promise<void> {
        await execute(callNext.url(), `call:${counterId}:${serviceId}`, {
            counter_id: counterId,
            service_id: serviceId,
        });
    }

    async function ticketOperation(name: string, url: string): Promise<void> {
        if (!currentTicket) {
            return;
        }

        await execute(url, `${name}:${currentTicket.id}:${counterId}`, {
            counter_id: counterId,
        });
    }

    return (
        <>
            <Head title="Atendimento" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <header className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-sm font-bold tracking-widest text-emerald-700 uppercase">
                            Operação de fila
                        </p>
                        <h1 className="mt-1 text-3xl font-black tracking-tight">
                            Painel do atendente
                        </h1>
                        <p className="mt-1 text-muted-foreground">
                            {queueState.unit.name}
                        </p>
                    </div>
                    {props.availableUnits.length > 0 && (
                        <div
                            className="flex flex-wrap gap-2"
                            aria-label="Selecionar unidade"
                        >
                            {props.availableUnits.map((unit) => (
                                <Link
                                    key={unit.id}
                                    href={attendantIndex({
                                        query: { unit_id: unit.id },
                                    })}
                                    className={`rounded-full px-4 py-2 text-sm font-bold ${unit.id === props.unit.id ? 'bg-foreground text-background' : 'border'}`}
                                >
                                    {unit.name}
                                </Link>
                            ))}
                        </div>
                    )}
                </header>

                <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle>Posto de trabalho</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <label
                                className="grid gap-2 text-sm font-bold"
                                htmlFor="counter"
                            >
                                Guichê
                                <select
                                    id="counter"
                                    value={counterId}
                                    onChange={(event) =>
                                        changeCounter(event.target.value)
                                    }
                                    className="min-h-12 rounded-lg border bg-background px-3 font-normal"
                                >
                                    {queueState.counters.map((counter) => (
                                        <option
                                            key={counter.id}
                                            value={counter.id}
                                        >
                                            {counter.name} ({counter.code})
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label
                                className="grid gap-2 text-sm font-bold"
                                htmlFor="service"
                            >
                                Serviço
                                <select
                                    id="service"
                                    value={serviceId}
                                    onChange={(event) =>
                                        setServiceId(event.target.value)
                                    }
                                    className="min-h-12 rounded-lg border bg-background px-3 font-normal"
                                >
                                    {selectedCounter?.services.map(
                                        (service) => (
                                            <option
                                                key={service.id}
                                                value={service.id}
                                            >
                                                {service.name}
                                            </option>
                                        ),
                                    )}
                                </select>
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <QueueCount
                                    label="Normais"
                                    value={counts.standard}
                                />
                                <QueueCount
                                    label="Prioritárias"
                                    value={counts.priority}
                                    priority
                                />
                            </div>
                            <Button
                                onClick={callNextTicket}
                                disabled={
                                    busy ||
                                    !counterId ||
                                    !serviceId ||
                                    Boolean(
                                        currentTicket &&
                                        ['called', 'serving'].includes(
                                            currentTicket.status,
                                        ),
                                    )
                                }
                                className="min-h-14 w-full bg-emerald-700 text-base font-black hover:bg-emerald-600"
                            >
                                <SkipForward
                                    className="mr-2 size-5"
                                    aria-hidden
                                />{' '}
                                Chamar próxima senha
                            </Button>
                        </CardContent>
                    </Card>

                    <section
                        aria-labelledby="current-title"
                        className="min-w-0"
                    >
                        <Card className="overflow-hidden border-0 bg-slate-950 text-white shadow-xl">
                            <CardHeader className="border-b border-white/10">
                                <CardTitle
                                    id="current-title"
                                    className="flex items-center gap-2"
                                >
                                    <Headphones
                                        className="size-5 text-emerald-300"
                                        aria-hidden
                                    />{' '}
                                    Senha atual
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 sm:p-8">
                                {currentTicket ? (
                                    <div>
                                        <div className="flex flex-wrap items-end justify-between gap-5">
                                            <div>
                                                <p className="text-sm font-bold tracking-widest text-emerald-300 uppercase">
                                                    {currentTicket.status_label}
                                                </p>
                                                <p className="mt-1 font-mono text-6xl font-black tracking-tight sm:text-8xl">
                                                    {currentTicket.code}
                                                </p>
                                                <p className="mt-3 text-slate-300">
                                                    {currentTicket.service.name}{' '}
                                                    ·{' '}
                                                    {
                                                        currentTicket.priority_label
                                                    }
                                                </p>
                                            </div>
                                            <div className="rounded-2xl bg-white/10 p-4 text-right">
                                                <p className="text-xs text-slate-400 uppercase">
                                                    Guichê
                                                </p>
                                                <p className="text-xl font-bold">
                                                    {selectedCounter?.name}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-8 flex flex-wrap gap-3">
                                            {currentTicket.status ===
                                                'called' && (
                                                <>
                                                    <OperationButton
                                                        disabled={busy}
                                                        onClick={() =>
                                                            ticketOperation(
                                                                'recall',
                                                                recall.url(
                                                                    currentTicket,
                                                                ),
                                                            )
                                                        }
                                                        icon={RotateCcw}
                                                    >
                                                        Repetir chamada
                                                    </OperationButton>
                                                    <OperationButton
                                                        disabled={busy}
                                                        onClick={() =>
                                                            ticketOperation(
                                                                'start',
                                                                start.url(
                                                                    currentTicket,
                                                                ),
                                                            )
                                                        }
                                                        icon={Play}
                                                        primary
                                                    >
                                                        Iniciar atendimento
                                                    </OperationButton>
                                                    <OperationButton
                                                        disabled={busy}
                                                        onClick={() =>
                                                            ticketOperation(
                                                                'no-show',
                                                                noShow.url(
                                                                    currentTicket,
                                                                ),
                                                            )
                                                        }
                                                        icon={UserX}
                                                    >
                                                        Marcar ausência
                                                    </OperationButton>
                                                    <OperationButton
                                                        disabled={busy}
                                                        onClick={() =>
                                                            ticketOperation(
                                                                'requeue',
                                                                requeue.url(
                                                                    currentTicket,
                                                                ),
                                                            )
                                                        }
                                                        icon={Clock}
                                                    >
                                                        Retornar para fila
                                                    </OperationButton>
                                                </>
                                            )}
                                            {currentTicket.status ===
                                                'serving' && (
                                                <OperationButton
                                                    disabled={busy}
                                                    onClick={() =>
                                                        ticketOperation(
                                                            'complete',
                                                            complete.url(
                                                                currentTicket,
                                                            ),
                                                        )
                                                    }
                                                    icon={SquareCheckBig}
                                                    primary
                                                >
                                                    Finalizar atendimento
                                                </OperationButton>
                                            )}
                                            {currentTicket.status ===
                                                'no_show' && (
                                                <OperationButton
                                                    disabled={busy}
                                                    onClick={() =>
                                                        ticketOperation(
                                                            'requeue',
                                                            requeue.url(
                                                                currentTicket,
                                                            ),
                                                        )
                                                    }
                                                    icon={Clock}
                                                    primary
                                                >
                                                    Retornar para fila
                                                </OperationButton>
                                            )}
                                            <CancelDialog
                                                disabled={busy}
                                                onConfirm={() =>
                                                    ticketOperation(
                                                        'cancel',
                                                        cancel.url(
                                                            currentTicket,
                                                        ),
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid min-h-72 place-items-center text-center">
                                        <div>
                                            <Clock
                                                className="mx-auto size-12 text-slate-600"
                                                aria-hidden
                                            />
                                            <p className="mt-4 text-2xl font-black">
                                                Nenhuma senha neste guichê
                                            </p>
                                            <p className="mt-2 text-slate-400">
                                                Selecione um serviço e chame a
                                                próxima pessoa.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </section>
                </div>

                {feedback && (
                    <div
                        role={feedback.type === 'error' ? 'alert' : 'status'}
                        className={`flex items-center gap-3 rounded-xl border p-4 ${feedback.type === 'error' ? 'border-red-300 bg-red-50 text-red-900' : 'border-emerald-300 bg-emerald-50 text-emerald-900'}`}
                    >
                        <CircleAlert className="size-5" aria-hidden />
                        {feedback.message}
                    </div>
                )}
            </div>
        </>
    );
}

function fetchAttendantState(
    unitId: string,
    signal?: AbortSignal,
): Promise<StatePayload> {
    return getJson<StatePayload>(
        attendantStateRoute.url({ query: { unit_id: unitId } }),
        signal,
    );
}

function QueueCount({
    label,
    value,
    priority = false,
}: {
    label: string;
    value: number;
    priority?: boolean;
}) {
    return (
        <div
            className={`rounded-xl border p-4 ${priority ? 'border-amber-300 bg-amber-50' : 'bg-muted/40'}`}
        >
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-3xl font-black">{value}</p>
        </div>
    );
}

function OperationButton({
    children,
    icon: Icon,
    primary = false,
    disabled,
    onClick,
}: {
    children: string;
    icon: typeof Play;
    primary?: boolean;
    disabled: boolean;
    onClick: () => void;
}) {
    return (
        <Button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={
                primary
                    ? 'bg-emerald-500 font-bold text-emerald-950 hover:bg-emerald-400'
                    : 'border-white/20 bg-white/10 font-bold text-white hover:bg-white/20 hover:text-white'
            }
            variant={primary ? 'default' : 'outline'}
        >
            <Icon className="mr-2 size-4" aria-hidden />
            {children}
        </Button>
    );
}

function CancelDialog({
    disabled,
    onConfirm,
}: {
    disabled: boolean;
    onConfirm: () => void;
}) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button type="button" disabled={disabled} variant="destructive">
                    <X className="mr-2 size-4" aria-hidden />
                    Cancelar senha
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>Cancelar esta senha?</DialogTitle>
                <DialogDescription>
                    O cancelamento ficará registrado no histórico e não poderá
                    ser desfeito.
                </DialogDescription>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Voltar</Button>
                    </DialogClose>
                    <DialogClose asChild>
                        <Button variant="destructive" onClick={onConfirm}>
                            Confirmar cancelamento
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
