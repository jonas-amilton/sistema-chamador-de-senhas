<?php

declare(strict_types=1);

namespace App\Actions;

use App\Actions\Concerns\HandlesTicketOperations;
use App\Enums\QueueCommandType;
use App\Enums\TicketEventType;
use App\Enums\TicketStatus;
use App\Events\TicketDisplayUpdated;
use App\Exceptions\DomainConflictException;
use App\Models\Counter;
use App\Models\QueueCommand;
use App\Models\Ticket;
use App\Models\User;
use App\Support\CommandExecutor;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

final class RecallTicketAction
{
    use HandlesTicketOperations;

    public function __construct(private readonly CommandExecutor $commands) {}

    public function execute(User $actor, Ticket $ticket, Counter $counter, string $requestId): Ticket
    {
        return $this->commands->execute(
            QueueCommandType::Recall,
            $requestId,
            $actor,
            ['unit_id' => $ticket->unit_id, 'service_id' => $ticket->service_id, 'counter_id' => $counter->id, 'ticket_id' => $ticket->id],
            ['ticket_id' => $ticket->id, 'counter_id' => $counter->id],
            function (QueueCommand $command) use ($actor, $ticket, $counter, $requestId): Ticket {
                $locked = $this->lockedTicket($ticket->id);
                $this->authorizeTicket($actor, $locked, $counter, [TicketStatus::Called]);
                $locked->forceFill(['last_called_at' => now()])->save();
                $event = $this->recordEvent($locked, TicketEventType::Recalled, $actor, $counter);
                TicketDisplayUpdated::dispatch($locked, $event);
                DB::afterCommit(fn () => Log::info('ticket.recalled', $this->logContext($locked, $actor, $counter, $requestId)));

                return $locked;
            },
        ) ?? throw new DomainConflictException('Não foi possível repetir a chamada.');
    }

    /** @return array<string, mixed> */
    private function logContext(Ticket $ticket, User $actor, Counter $counter, string $requestId): array
    {
        return [
            'request_id' => $requestId,
            'ticket_id' => $ticket->id,
            'ticket_code' => $ticket->code,
            'unit_id' => $ticket->unit_id,
            'service_id' => $ticket->service_id,
            'counter_id' => $counter->id,
            'actor_user_id' => $actor->id,
            'previous_status' => TicketStatus::Called->value,
            'new_status' => TicketStatus::Called->value,
        ];
    }
}
