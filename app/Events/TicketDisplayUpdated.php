<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Ticket;
use App\Models\TicketEvent;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

final class TicketDisplayUpdated implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [1, 5, 15];

    public function __construct(
        public readonly Ticket $ticket,
        public readonly TicketEvent $ticketEvent,
    ) {}

    public function broadcastOn(): Channel
    {
        return new Channel("units.{$this->ticket->unit_id}.display");
    }

    public function broadcastAs(): string
    {
        return 'ticket.display.updated';
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        $this->ticket->loadMissing(['service:id,name', 'counter:id,name,code']);

        return [
            'event_id' => $this->ticketEvent->id,
            'ticket_id' => $this->ticket->id,
            'unit_id' => $this->ticket->unit_id,
            'code' => $this->ticket->code,
            'priority' => $this->ticket->priority->value,
            'service' => [
                'id' => $this->ticket->service->id,
                'name' => $this->ticket->service->name,
            ],
            'counter' => $this->ticket->counter === null ? null : [
                'id' => $this->ticket->counter->id,
                'name' => $this->ticket->counter->name,
                'code' => $this->ticket->counter->code,
            ],
            'type' => $this->ticketEvent->type->value,
            'called_at' => $this->ticket->last_called_at?->toISOString(),
        ];
    }

    public function failed(?Throwable $exception = null): void
    {
        Log::error('broadcast.ticket_display_failed', [
            'ticket_id' => $this->ticket->id,
            'ticket_code' => $this->ticket->code,
            'unit_id' => $this->ticket->unit_id,
            'service_id' => $this->ticket->service_id,
            'counter_id' => $this->ticket->counter_id,
            'event_id' => $this->ticketEvent->id,
            'error' => $exception?->getMessage(),
        ]);
    }
}
