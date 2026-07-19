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

final class StartTicketServiceAction
{
    use HandlesTicketOperations;

    public function __construct(private readonly CommandExecutor $commands) {}

    public function execute(User $actor, Ticket $ticket, Counter $counter, string $requestId): Ticket
    {
        return $this->commands->execute(
            QueueCommandType::StartService,
            $requestId,
            $actor,
            ['unit_id' => $ticket->unit_id, 'service_id' => $ticket->service_id, 'counter_id' => $counter->id, 'ticket_id' => $ticket->id],
            ['ticket_id' => $ticket->id, 'counter_id' => $counter->id],
            function (QueueCommand $command) use ($actor, $ticket, $counter, $requestId): Ticket {
                $locked = $this->lockedTicket($ticket->id);
                $this->authorizeTicket($actor, $locked, $counter, [TicketStatus::Called]);
                $locked->forceFill(['status' => TicketStatus::Serving, 'service_started_at' => now()])->save();
                $this->recordEvent($locked, TicketEventType::ServiceStarted, $actor, $counter);
                $this->logAfterCommit('ticket.service_started', $locked, $actor, $counter, $requestId, TicketStatus::Called, TicketStatus::Serving);

                return $locked;
            },
        ) ?? throw new DomainConflictException('Não foi possível iniciar o atendimento.');
    }

    private function logAfterCommit(string $message, Ticket $ticket, User $actor, Counter $counter, string $requestId, TicketStatus $from, TicketStatus $to): void
    {
        DB::afterCommit(fn () => Log::info($message, [
            'request_id' => $requestId, 'ticket_id' => $ticket->id, 'ticket_code' => $ticket->code,
            'unit_id' => $ticket->unit_id, 'service_id' => $ticket->service_id, 'counter_id' => $counter->id,
            'actor_user_id' => $actor->id, 'previous_status' => $from->value, 'new_status' => $to->value,
        ]));
    }
}
