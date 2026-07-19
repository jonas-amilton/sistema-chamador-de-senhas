import { Head, Link } from '@inertiajs/react';
import {
    CheckCircle2,
    Printer,
    RotateCcw,
    ShieldCheck,
    Ticket,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { HttpError, postJson } from '@/lib/http';
import { show as kioskShow } from '@/routes/kiosk';
import { store as ticketStore } from '@/routes/kiosk/tickets';
import type {
    Service,
    Ticket as TicketType,
    TicketPriority,
    Unit,
} from '@/types';

type Props = { unit: Unit; services: Service[] };
type IssueResponse = {
    message: string;
    ticket: TicketType;
    receipt_url: string;
};

export default function Kiosk({ unit, services }: Props) {
    const [serviceId, setServiceId] = useState<string | null>(null);
    const [priority, setPriority] = useState<TicketPriority | null>(null);
    const [requestId, setRequestId] = useState<string | null>(null);
    const [result, setResult] = useState<IssueResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function issueTicket(): Promise<void> {
        if (!serviceId || !priority || submitting) {
            return;
        }

        const idempotencyKey = requestId ?? crypto.randomUUID();
        setRequestId(idempotencyKey);
        setSubmitting(true);
        setError(null);

        try {
            const response = await postJson<IssueResponse>(
                ticketStore.url(unit),
                {
                    service_id: serviceId,
                    priority,
                    client_request_id: idempotencyKey,
                },
            );
            setResult(response);
            setRequestId(null);
        } catch (issueError) {
            setError(
                issueError instanceof HttpError
                    ? issueError.message
                    : 'A conexão falhou. Tente novamente para reutilizar a mesma emissão.',
            );
        } finally {
            setSubmitting(false);
        }
    }

    function reset(): void {
        setServiceId(null);
        setPriority(null);
        setRequestId(null);
        setResult(null);
        setError(null);
    }

    if (result) {
        return <Confirmation unit={unit} result={result} onReset={reset} />;
    }

    return (
        <>
            <Head title={`Retirar senha - ${unit.name}`} />
            <main className="min-h-screen bg-[#062f2b] px-5 py-8 text-white sm:px-8">
                <div className="mx-auto max-w-5xl">
                    <header className="mb-10 flex items-start justify-between gap-6 border-b border-white/15 pb-7">
                        <div>
                            <p className="text-sm font-bold tracking-[0.2em] text-emerald-300 uppercase">
                                Autoatendimento
                            </p>
                            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                                {unit.name}
                            </h1>
                        </div>
                        <span className="hidden items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm sm:flex">
                            <ShieldCheck className="size-4" aria-hidden /> Sem
                            dados pessoais
                        </span>
                    </header>

                    <section aria-labelledby="service-title">
                        <p className="text-sm font-bold text-emerald-300">
                            ETAPA 1 DE 2
                        </p>
                        <h2
                            id="service-title"
                            className="mt-2 text-3xl font-black"
                        >
                            Qual serviço você procura?
                        </h2>
                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                            {services.map((service) => (
                                <button
                                    key={service.id}
                                    type="button"
                                    aria-pressed={serviceId === service.id}
                                    onClick={() => setServiceId(service.id)}
                                    className={`min-h-28 rounded-3xl border-2 p-6 text-left text-xl font-bold transition-colors focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-emerald-300 ${serviceId === service.id ? 'border-amber-300 bg-amber-300 text-slate-950' : 'border-white/20 bg-white/8 hover:bg-white/15'}`}
                                >
                                    {service.name}
                                </button>
                            ))}
                        </div>
                    </section>

                    <section aria-labelledby="priority-title" className="mt-10">
                        <p className="text-sm font-bold text-emerald-300">
                            ETAPA 2 DE 2
                        </p>
                        <h2
                            id="priority-title"
                            className="mt-2 text-3xl font-black"
                        >
                            Escolha o tipo de atendimento
                        </h2>
                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                            <PriorityButton
                                label="Atendimento normal"
                                value="standard"
                                selected={priority === 'standard'}
                                onSelect={setPriority}
                            />
                            <PriorityButton
                                label="Atendimento prioritário"
                                value="priority"
                                selected={priority === 'priority'}
                                onSelect={setPriority}
                            />
                        </div>
                    </section>

                    {error && (
                        <p
                            role="alert"
                            className="mt-6 rounded-2xl border border-red-300/40 bg-red-950/40 p-4 text-red-100"
                        >
                            {error}
                        </p>
                    )}

                    <Button
                        type="button"
                        size="lg"
                        disabled={!serviceId || !priority || submitting}
                        onClick={issueTicket}
                        className="mt-8 min-h-16 w-full rounded-2xl bg-white text-lg font-black text-emerald-950 hover:bg-emerald-50 disabled:opacity-40"
                    >
                        <Ticket className="mr-2 size-6" aria-hidden />
                        {submitting
                            ? 'Emitindo sua senha...'
                            : error
                              ? 'Tentar novamente'
                              : 'Emitir minha senha'}
                    </Button>
                </div>
            </main>
        </>
    );
}

function PriorityButton({
    label,
    value,
    selected,
    onSelect,
}: {
    label: string;
    value: TicketPriority;
    selected: boolean;
    onSelect: (value: TicketPriority) => void;
}) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(value)}
            className={`min-h-24 rounded-3xl border-2 p-6 text-left text-lg font-bold focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-emerald-300 ${selected ? 'border-amber-300 bg-amber-300 text-slate-950' : 'border-white/20 bg-white/8 hover:bg-white/15'}`}
        >
            {label}
        </button>
    );
}

function Confirmation({
    unit,
    result,
    onReset,
}: {
    unit: Unit;
    result: IssueResponse;
    onReset: () => void;
}) {
    const ticket = result.ticket;

    return (
        <>
            <Head title={`Senha ${ticket.code}`} />
            <main className="grid min-h-screen place-items-center bg-[#f6f1e7] p-5 text-slate-950">
                <article className="w-full max-w-xl overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-slate-950/15">
                    <div className="bg-emerald-900 p-7 text-white">
                        <CheckCircle2
                            className="size-10 text-emerald-300"
                            aria-hidden
                        />
                        <h1 className="mt-4 text-2xl font-black">
                            Senha emitida
                        </h1>
                        <p className="mt-1 text-emerald-100">
                            Aguarde a chamada no painel.
                        </p>
                    </div>
                    <div className="p-7 text-center">
                        <p className="text-sm font-bold tracking-[0.2em] text-slate-500 uppercase">
                            Sua senha
                        </p>
                        <p className="mt-2 font-mono text-7xl font-black tracking-tight text-emerald-900">
                            {ticket.code}
                        </p>
                        <dl className="mt-7 grid gap-3 rounded-2xl bg-slate-50 p-5 text-left text-sm">
                            <ReceiptRow label="Unidade" value={unit.name} />
                            <ReceiptRow
                                label="Serviço"
                                value={ticket.service.name}
                            />
                            <ReceiptRow
                                label="Tipo"
                                value={ticket.priority_label}
                            />
                            <ReceiptRow
                                label="Emissão"
                                value={new Intl.DateTimeFormat('pt-BR', {
                                    dateStyle: 'short',
                                    timeStyle: 'short',
                                    timeZone: unit.timezone,
                                }).format(new Date(ticket.issued_at))}
                            />
                        </dl>
                        <div className="mt-7 grid gap-3 sm:grid-cols-2">
                            <Link
                                href={result.receipt_url}
                                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-4 font-bold"
                            >
                                <Printer className="mr-2 size-5" aria-hidden />{' '}
                                Ver comprovante
                            </Link>
                            <Button
                                onClick={onReset}
                                className="min-h-12 bg-emerald-900 font-bold hover:bg-emerald-800"
                            >
                                <RotateCcw
                                    className="mr-2 size-5"
                                    aria-hidden
                                />{' '}
                                Nova emissão
                            </Button>
                        </div>
                        <Link
                            href={kioskShow(unit)}
                            className="mt-5 inline-block text-sm text-slate-500 underline underline-offset-4"
                        >
                            Voltar ao início do totem
                        </Link>
                    </div>
                </article>
            </main>
        </>
    );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-4">
            <dt className="text-slate-500">{label}</dt>
            <dd className="text-right font-bold">{value}</dd>
        </div>
    );
}
