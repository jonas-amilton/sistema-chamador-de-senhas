import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Service, Ticket, TicketPriority, Unit } from '@/types';
import Kiosk from './index';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({
        children,
        href,
    }: {
        children: ReactNode;
        href: string | { url: string };
    }) => <a href={typeof href === 'string' ? href : href.url}>{children}</a>,
}));

const fetchMock = vi.fn<typeof fetch>();
const requestId = '11111111-1111-4111-8111-111111111111';
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

function makeTicket(priority: TicketPriority, code: string): Ticket {
    return {
        id: `ticket-${code}`,
        unit_id: unit.id,
        service_id: service.id,
        counter_id: null,
        code,
        priority,
        priority_label: priority === 'priority' ? 'Prioritário' : 'Normal',
        status: 'waiting',
        status_label: 'Aguardando',
        business_date: '2026-07-19',
        sequence: 1,
        issued_at: '2026-07-19T12:00:00.000Z',
        called_at: null,
        last_called_at: null,
        service_started_at: null,
        completed_at: null,
        no_show_at: null,
        cancelled_at: null,
        service,
        counter: null,
    };
}

function issueResponse(priority: TicketPriority, code: string): Response {
    return new Response(
        JSON.stringify({
            message: 'Senha emitida.',
            ticket: makeTicket(priority, code),
            receipt_url: `/comprovantes/${code}`,
        }),
        {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        },
    );
}

function requestPayload(index: number): Record<string, unknown> {
    const body = fetchMock.mock.calls[index]?.[1]?.body;

    if (typeof body !== 'string') {
        throw new Error(`Request ${index + 1} did not contain a JSON body.`);
    }

    return JSON.parse(body) as Record<string, unknown>;
}

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('crypto', {
        randomUUID: vi.fn(() => requestId),
    });
});

describe('Kiosk', () => {
    it('selects a service and normal priority, blocks duplicate submission, and confirms the ticket', async () => {
        const user = userEvent.setup();
        let resolveRequest: ((response: Response) => void) | undefined;
        fetchMock.mockImplementationOnce(
            () =>
                new Promise<Response>((resolve) => {
                    resolveRequest = resolve;
                }),
        );
        render(<Kiosk unit={unit} services={[service]} />);

        const serviceButton = screen.getByRole('button', {
            name: service.name,
        });
        const normalButton = screen.getByRole('button', {
            name: 'Atendimento normal',
        });
        await user.click(serviceButton);
        await user.click(normalButton);

        expect(serviceButton).toHaveAttribute('aria-pressed', 'true');
        expect(normalButton).toHaveAttribute('aria-pressed', 'true');

        await user.click(
            screen.getByRole('button', { name: 'Emitir minha senha' }),
        );

        const submittingButton = screen.getByRole('button', {
            name: 'Emitindo sua senha...',
        });
        expect(submittingButton).toBeDisabled();
        await user.click(submittingButton);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(requestPayload(0)).toMatchObject({
            service_id: service.id,
            priority: 'standard',
            client_request_id: requestId,
        });

        const completeRequest = resolveRequest;

        if (!completeRequest) {
            throw new Error('The kiosk request was not started.');
        }

        await act(async () => {
            completeRequest(issueResponse('standard', 'N001'));
        });

        expect(
            await screen.findByRole('heading', { name: 'Senha emitida' }),
        ).toBeInTheDocument();
        expect(screen.getByText('N001')).toBeInTheDocument();
        expect(screen.getByText('Normal')).toBeInTheDocument();
    });

    it('shows a network error and reuses the priority request UUID on retry', async () => {
        const user = userEvent.setup();
        fetchMock
            .mockRejectedValueOnce(new TypeError('Network unavailable'))
            .mockResolvedValueOnce(issueResponse('priority', 'P001'));
        render(<Kiosk unit={unit} services={[service]} />);

        await user.click(screen.getByRole('button', { name: service.name }));
        const priorityButton = screen.getByRole('button', {
            name: 'Atendimento prioritário',
        });
        await user.click(priorityButton);
        expect(priorityButton).toHaveAttribute('aria-pressed', 'true');

        await user.click(
            screen.getByRole('button', { name: 'Emitir minha senha' }),
        );

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'A conexão falhou. Tente novamente para reutilizar a mesma emissão.',
        );
        expect(requestPayload(0)).toMatchObject({
            priority: 'priority',
            client_request_id: requestId,
        });

        await user.click(
            screen.getByRole('button', { name: 'Tentar novamente' }),
        );

        expect(
            await screen.findByRole('heading', { name: 'Senha emitida' }),
        ).toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(requestPayload(1).client_request_id).toBe(
            requestPayload(0).client_request_id,
        );
        expect(screen.getByText('P001')).toBeInTheDocument();
        expect(screen.getByText('Prioritário')).toBeInTheDocument();
    });
});
