<?php

declare(strict_types=1);

namespace App\Actions\Concerns;

use App\Enums\TicketEventType;
use App\Enums\TicketStatus;
use App\Exceptions\DomainConflictException;
use App\Models\Counter;
use App\Models\Ticket;
use App\Models\TicketEvent;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;

trait HandlesTicketOperations
{
    private function lockedTicket(string $ticketId): Ticket
    {
        return Ticket::query()->lockForUpdate()->findOrFail($ticketId);
    }

    private function authorizeActor(User $actor, string $unitId): void
    {
        if (! $actor->is_active || (! $actor->isAdmin() && $actor->unit_id !== $unitId)) {
            throw new AuthorizationException('Você não pode operar esta unidade.');
        }
    }

    /** @param list<TicketStatus> $allowedStatuses */
    private function authorizeTicket(
        User $actor,
        Ticket $ticket,
        ?Counter $counter,
        array $allowedStatuses,
    ): void {
        $this->authorizeActor($actor, $ticket->unit_id);

        if (! in_array($ticket->status, $allowedStatuses, true)) {
            throw new DomainConflictException('A operação não é permitida no estado atual da senha.', [
                'ticket_id' => $ticket->id,
                'status' => $ticket->status->value,
            ]);
        }

        if ($counter !== null && ($counter->unit_id !== $ticket->unit_id || $ticket->counter_id !== $counter->id)) {
            throw new AuthorizationException('Esta senha não pertence ao guichê selecionado.');
        }
    }

    /** @param array<string, mixed>|null $metadata */
    private function recordEvent(
        Ticket $ticket,
        TicketEventType $type,
        User $actor,
        ?Counter $counter,
        ?array $metadata = null,
    ): TicketEvent {
        return $ticket->events()->create([
            'type' => $type,
            'actor_user_id' => $actor->id,
            'counter_id' => $counter?->id,
            'metadata' => $metadata,
            'occurred_at' => now(),
        ]);
    }
}
