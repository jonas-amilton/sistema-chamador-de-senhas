<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Models\TicketEvent;
use App\Support\TicketData;
use Inertia\Inertia;
use Inertia\Response;

final class TicketHistoryController extends Controller
{
    public function __invoke(Ticket $ticket): Response
    {
        $ticket->load(['events.actor:id,name', 'events.counter:id,name,code']);

        return Inertia::render('admin/ticket-history', [
            'ticket' => TicketData::make($ticket),
            'events' => $ticket->events->map(fn (TicketEvent $event): array => [
                'id' => $event->id,
                'type' => $event->type->value,
                'actor' => $event->actor?->name,
                'counter' => $event->counter?->name,
                'metadata' => $event->metadata,
                'occurred_at' => $event->occurred_at->toISOString(),
            ]),
        ]);
    }
}
