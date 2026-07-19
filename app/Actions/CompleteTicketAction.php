<?php

declare(strict_types=1);

namespace App\Actions;

use App\Actions\Concerns\HandlesTicketOperations;
use App\Enums\QueueCommandType;
use App\Enums\TicketEventType;
use App\Enums\TicketStatus;
use App\Exceptions\DomainConflictException;
use App\Models\Counter;
use App\Models\QueueCommand;
use App\Models\Ticket;
use App\Models\User;
use App\Support\CommandExecutor;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

final class CompleteTicketAction
{
    use HandlesTicketOperations;

    public function __construct(private readonly CommandExecutor $commands) {}

    public function execute(User $actor, Ticket $ticket, Counter $counter, string $requestId): Ticket
    {
        return $this->commands->execute(
            QueueCommandType::Complete,
            $requestId,
            $actor,
            ['unit_id' => $ticket->unit_id, 'service_id' => $ticket->service_id, 'counter_id' => $counter->id, 'ticket_id' => $ticket->id],
            ['ticket_id' => $ticket->id, 'counter_id' => $counter->id],
            function (QueueCommand $command) use ($actor, $ticket, $counter, $requestId): Ticket {
                $locked = $this->lockedTicket($ticket->id);
                $this->authorizeTicket($actor, $locked, $counter, [TicketStatus::Serving]);
                $locked->forceFill(['status' => TicketStatus::Completed, 'completed_at' => now()])->save();
                $this->recordEvent($locked, TicketEventType::Completed, $actor, $counter);
                DB::afterCommit(fn () => Log::info('ticket.completed', $this->context($locked, $actor, $counter, $requestId)));

                return $locked;
            },
        ) ?? throw new DomainConflictException('Não foi possível finalizar o atendimento.');
    }

    /** @return array<string, mixed> */
    private function context(Ticket $ticket, User $actor, Counter $counter, string $requestId): array
    {
        return ['request_id' => $requestId, 'ticket_id' => $ticket->id, 'ticket_code' => $ticket->code,
            'unit_id' => $ticket->unit_id, 'service_id' => $ticket->service_id, 'counter_id' => $counter->id,
            'actor_user_id' => $actor->id, 'previous_status' => TicketStatus::Serving->value, 'new_status' => TicketStatus::Completed->value];
    }
}
