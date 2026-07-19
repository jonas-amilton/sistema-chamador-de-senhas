import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Counter, Service, Ticket, TicketStatus, Unit } from '@/types';
import Attendant from './index';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({
        children,
        href,
    }: {
        children: ReactNode;
        href: { url: string };
    }) => <a href={href.url}>{children}</a>,
}));

const unit: Unit = {
    id: 'unit-1',
    name: 'Unidade Centro',
    slug: 'centro',
    timezone: 'America/Sao_Paulo',
};
const service: Service = {
    id: 'service-1',
    name: 'Atendimento geral',
};
const counter: Counter = {
    id: 'counter-1',
    name: 'Guichê 1',
    code: 'G1',
    services: [service],
};

function makeTicket(status: TicketStatus): Ticket {
    const statusLabels: Record<TicketStatus, string> = {
        waiting: 'Aguardando',
        called: 'Chamado',
        serving: 'Em atendimento',
        completed: 'Finalizado',
        no_show: 'Ausente',
        cancelled: 'Cancelado',
    };

    return {
        id: 'ticket-1',
        unit_id: unit.id,
        service_id: service.id,
        counter_id: counter.id,
        code: 'N001',
        priority: 'standard',
        priority_label: 'Normal',
        status,
        status_label: statusLabels[status],
        business_date: '2026-07-19',
        sequence: 1,
        issued_at: '2026-07-19T12:00:00.000Z',
        called_at: '2026-07-19T12:05:00.000Z',
        last_called_at: '2026-07-19T12:05:00.000Z',
        service_started_at:
            status === 'serving' ? '2026-07-19T12:06:00.000Z' : null,
        completed_at: null,
        no_show_at: status === 'no_show' ? '2026-07-19T12:06:00.000Z' : null,
        cancelled_at: null,
        service,
        counter,
    };
}

function renderAttendant(ticket: Ticket | null): void {
    render(
        <Attendant
            unit={unit}
            counters={[counter]}
            queueCounts={{
                [service.id]: { standard: 2, priority: 1 },
            }}
            currentTickets={ticket ? [ticket] : []}
            availableUnits={[]}
        />,
    );
}

const operationNames = [
    'Repetir chamada',
    'Iniciar atendimento',
    'Marcar ausência',
    'Retornar para fila',
    'Finalizar atendimento',
    'Cancelar senha',
];

const statusCases = [
    {
        status: 'called',
        shown: [
            'Repetir chamada',
            'Iniciar atendimento',
            'Marcar ausência',
            'Retornar para fila',
            'Cancelar senha',
        ],
        callNextDisabled: true,
    },
    {
        status: 'serving',
        shown: ['Finalizar atendimento', 'Cancelar senha'],
        callNextDisabled: true,
    },
    {
        status: 'no_show',
        shown: ['Retornar para fila', 'Cancelar senha'],
        callNextDisabled: false,
    },
] satisfies Array<{
    status: Extract<TicketStatus, 'called' | 'serving' | 'no_show'>;
    shown: string[];
    callNextDisabled: boolean;
}>;

describe('Attendant', () => {
    it('renders the empty counter state and allows calling the next ticket', () => {
        renderAttendant(null);

        expect(
            screen.getByText('Nenhuma senha neste guichê'),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Normais').nextElementSibling,
        ).toHaveTextContent('2');
        expect(
            screen.getByRole('button', { name: 'Chamar próxima senha' }),
        ).toBeEnabled();
    });

    it.each(statusCases)(
        'shows the valid actions and call-next state for $status',
        ({ status, shown, callNextDisabled }) => {
            renderAttendant(makeTicket(status));

            expect(screen.getByText('N001')).toBeInTheDocument();

            for (const name of operationNames) {
                const button = screen.queryByRole('button', { name });

                if (shown.includes(name)) {
                    expect(button).toBeEnabled();
                } else {
                    expect(button).not.toBeInTheDocument();
                }
            }

            const callNext = screen.getByRole('button', {
                name: 'Chamar próxima senha',
            });

            if (callNextDisabled) {
                expect(callNext).toBeDisabled();
            } else {
                expect(callNext).toBeEnabled();
            }
        },
    );
});
