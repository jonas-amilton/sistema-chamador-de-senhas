export type Unit = {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    is_active?: boolean;
};

export type Service = {
    id: string;
    unit_id?: string;
    name: string;
    slug?: string;
    standard_prefix?: string;
    priority_prefix?: string;
    priority_streak_limit?: number;
    is_active?: boolean;
};

export type Counter = {
    id: string;
    unit_id?: string;
    name: string;
    code: string;
    is_active?: boolean;
    services: Service[];
};

export type TicketPriority = 'standard' | 'priority';
export type TicketStatus =
    'waiting' | 'called' | 'serving' | 'completed' | 'no_show' | 'cancelled';

export type Ticket = {
    id: string;
    unit_id: string;
    service_id: string;
    counter_id: string | null;
    code: string;
    priority: TicketPriority;
    priority_label: string;
    status: TicketStatus;
    status_label: string;
    business_date: string;
    sequence: number;
    issued_at: string;
    called_at: string | null;
    last_called_at: string | null;
    service_started_at: string | null;
    completed_at: string | null;
    no_show_at: string | null;
    cancelled_at: string | null;
    service: Pick<Service, 'id' | 'name'>;
    counter: Pick<Counter, 'id' | 'name' | 'code'> | null;
};

export type TicketEvent = {
    id: string;
    type: string;
    actor: string | null;
    counter: string | null;
    metadata: Record<string, unknown> | null;
    occurred_at: string;
};

export type DisplayCall = {
    event_id: string;
    ticket_id: string;
    unit_id: string;
    code: string;
    priority: TicketPriority;
    service: Pick<Service, 'id' | 'name'>;
    counter: Pick<Counter, 'id' | 'name' | 'code'> | null;
    type: 'called' | 'recalled';
    called_at: string;
};

export type DisplayState = {
    current: DisplayCall | null;
    recent: DisplayCall[];
};

export type QueueCounts = Record<
    string,
    { standard: number; priority: number }
>;

export type Pagination<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};
