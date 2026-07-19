import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    CalendarDays,
    Clock3,
    History,
    MapPin,
    Ticket as TicketIcon,
    UserRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import admin from '@/routes/admin';
import type { Ticket, TicketEvent, TicketStatus } from '@/types';

type Props = {
    ticket: Ticket;
    events: TicketEvent[];
};

const eventLabels: Record<string, string> = {
    issued: 'Senha emitida',
    called: 'Senha chamada',
    recalled: 'Senha rechamada',
    service_started: 'Atendimento iniciado',
    completed: 'Atendimento concluído',
    marked_no_show: 'Não comparecimento registrado',
    requeued: 'Senha recolocada na fila',
    cancelled: 'Senha cancelada',
};

const metadataLabels: Record<string, string> = {
    client_request_id: 'Identificador da solicitação',
    previous_status: 'Situação anterior',
};

function formatBusinessDate(value: string): string {
    const [year, month, day] = value.split('-');

    return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatDateTime(value: string | null): string {
    if (!value) {
        return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'medium',
    }).format(date);
}

function formatMetadataLabel(key: string): string {
    const knownLabel = metadataLabels[key];

    if (knownLabel) {
        return knownLabel;
    }

    const words = key.replaceAll('_', ' ');

    return words.charAt(0).toLocaleUpperCase('pt-BR') + words.slice(1);
}

function formatMetadataValue(value: unknown): string {
    if (value === null) {
        return 'Sem valor';
    }

    if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    ) {
        return String(value);
    }

    return JSON.stringify(value) ?? 'Sem valor';
}

function statusVariant(
    status: TicketStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
    if (status === 'completed') {
        return 'default';
    }

    if (status === 'no_show' || status === 'cancelled') {
        return 'destructive';
    }

    if (status === 'called' || status === 'serving') {
        return 'secondary';
    }

    return 'outline';
}

function SummaryItem({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: string;
    icon: typeof Clock3;
}) {
    return (
        <div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-4">
            <span className="rounded-md bg-background p-2 text-muted-foreground shadow-xs">
                <Icon aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                    {label}
                </p>
                <p className="mt-1 font-medium break-words">{value}</p>
            </div>
        </div>
    );
}

export default function TicketHistory({ ticket, events }: Props) {
    return (
        <>
            <Head title={`Histórico ${ticket.code}`} />
            <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-6">
                <header className="space-y-4">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={admin.dashboard()}>
                            <ArrowLeft aria-hidden="true" />
                            Voltar à administração
                        </Link>
                    </Button>
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <p className="mb-1 text-sm font-medium text-muted-foreground">
                                Histórico da senha
                            </p>
                            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                                {ticket.code}
                            </h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {ticket.service.name} · emitida em{' '}
                                {formatDateTime(ticket.issued_at)}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Badge
                                variant={
                                    ticket.priority === 'priority'
                                        ? 'secondary'
                                        : 'outline'
                                }
                            >
                                {ticket.priority_label}
                            </Badge>
                            <Badge variant={statusVariant(ticket.status)}>
                                {ticket.status_label}
                            </Badge>
                        </div>
                    </div>
                </header>

                <section aria-labelledby="summary-title">
                    <Card>
                        <CardHeader>
                            <CardTitle id="summary-title">
                                Resumo do ticket
                            </CardTitle>
                            <CardDescription>
                                Dados consolidados do atendimento e da data
                                operacional.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <SummaryItem
                                label="Serviço"
                                value={ticket.service.name}
                                icon={TicketIcon}
                            />
                            <SummaryItem
                                label="Data operacional"
                                value={formatBusinessDate(ticket.business_date)}
                                icon={CalendarDays}
                            />
                            <SummaryItem
                                label="Guichê"
                                value={
                                    ticket.counter
                                        ? `${ticket.counter.name} (${ticket.counter.code})`
                                        : 'Ainda não atribuído'
                                }
                                icon={MapPin}
                            />
                            <SummaryItem
                                label="Início do atendimento"
                                value={formatDateTime(
                                    ticket.service_started_at,
                                )}
                                icon={Clock3}
                            />
                        </CardContent>
                    </Card>
                </section>

                <section aria-labelledby="timeline-title">
                    <Card>
                        <CardHeader>
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1.5">
                                    <CardTitle id="timeline-title">
                                        Linha do tempo
                                    </CardTitle>
                                    <CardDescription>
                                        Eventos registrados em ordem
                                        cronológica.
                                    </CardDescription>
                                </div>
                                <span className="rounded-lg bg-muted p-2 text-muted-foreground">
                                    <History
                                        aria-hidden="true"
                                        className="size-5"
                                    />
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {events.length > 0 ? (
                                <ol className="relative ml-3 border-l">
                                    {events.map((event, index) => (
                                        <li
                                            key={event.id}
                                            className="relative pb-8 pl-7 last:pb-0"
                                        >
                                            <span
                                                aria-hidden="true"
                                                className="absolute top-1 -left-[0.4375rem] size-3 rounded-full border-2 border-background bg-primary ring-4 ring-muted"
                                            />
                                            <article
                                                aria-labelledby={`event-title-${event.id}`}
                                                className="space-y-3 rounded-lg border p-4"
                                            >
                                                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                                                    <div>
                                                        <p className="text-xs font-medium text-muted-foreground">
                                                            Evento {index + 1}
                                                        </p>
                                                        <h2
                                                            id={`event-title-${event.id}`}
                                                            className="font-semibold"
                                                        >
                                                            {eventLabels[
                                                                event.type
                                                            ] ?? event.type}
                                                        </h2>
                                                    </div>
                                                    <time
                                                        dateTime={
                                                            event.occurred_at
                                                        }
                                                        className="text-sm whitespace-nowrap text-muted-foreground"
                                                    >
                                                        {formatDateTime(
                                                            event.occurred_at,
                                                        )}
                                                    </time>
                                                </div>

                                                {(event.actor ||
                                                    event.counter) && (
                                                    <dl className="grid gap-2 text-sm sm:grid-cols-2">
                                                        {event.actor && (
                                                            <div className="flex items-center gap-2">
                                                                <UserRound
                                                                    aria-hidden="true"
                                                                    className="size-4 text-muted-foreground"
                                                                />
                                                                <dt className="sr-only">
                                                                    Responsável
                                                                </dt>
                                                                <dd>
                                                                    {
                                                                        event.actor
                                                                    }
                                                                </dd>
                                                            </div>
                                                        )}
                                                        {event.counter && (
                                                            <div className="flex items-center gap-2">
                                                                <MapPin
                                                                    aria-hidden="true"
                                                                    className="size-4 text-muted-foreground"
                                                                />
                                                                <dt className="sr-only">
                                                                    Guichê
                                                                </dt>
                                                                <dd>
                                                                    {
                                                                        event.counter
                                                                    }
                                                                </dd>
                                                            </div>
                                                        )}
                                                    </dl>
                                                )}

                                                {event.metadata &&
                                                    Object.keys(event.metadata)
                                                        .length > 0 && (
                                                        <dl className="grid gap-2 rounded-md bg-muted/60 p-3 text-sm sm:grid-cols-2">
                                                            {Object.entries(
                                                                event.metadata,
                                                            ).map(
                                                                ([
                                                                    key,
                                                                    value,
                                                                ]) => (
                                                                    <div
                                                                        key={
                                                                            key
                                                                        }
                                                                    >
                                                                        <dt className="text-xs font-medium text-muted-foreground">
                                                                            {formatMetadataLabel(
                                                                                key,
                                                                            )}
                                                                        </dt>
                                                                        <dd className="mt-0.5 break-all">
                                                                            {formatMetadataValue(
                                                                                value,
                                                                            )}
                                                                        </dd>
                                                                    </div>
                                                                ),
                                                            )}
                                                        </dl>
                                                    )}
                                            </article>
                                        </li>
                                    ))}
                                </ol>
                            ) : (
                                <div className="rounded-lg border border-dashed p-8 text-center">
                                    <History
                                        aria-hidden="true"
                                        className="mx-auto mb-3 size-8 text-muted-foreground"
                                    />
                                    <p className="font-medium">
                                        Nenhum evento registrado
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        O histórico aparecerá aqui assim que a
                                        senha receber uma movimentação.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </section>
            </main>
        </>
    );
}

TicketHistory.layout = {
    breadcrumbs: [
        {
            title: 'Administração',
            href: admin.dashboard(),
        },
        {
            title: 'Histórico do ticket',
            href: admin.dashboard(),
        },
    ],
};
