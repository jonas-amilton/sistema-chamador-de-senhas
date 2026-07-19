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

final class RequeueTicketAction
{
    use HandlesTicketOperations;

    public function __construct(private readonly CommandExecutor $commands) {}

    public function execute(User $actor, Ticket $ticket, Counter $counter, string $requestId): Ticket
    {
        return $this->commands->execute(
            QueueCommandType::Requeue,
            $requestId,
            $actor,
            ['unit_id' => $ticket->unit_id, 'service_id' => $ticket->service_id, 'counter_id' => $counter->id, 'ticket_id' => $ticket->id],
            ['ticket_id' => $ticket->id, 'counter_id' => $counter->id],
            function (QueueCommand $command) use ($actor, $ticket, $counter, $requestId): Ticket {
                $locked = $this->lockedTicket($ticket->id);
                $previous = $locked->status;
                $this->authorizeTicket($actor, $locked, $counter, [TicketStatus::Called, TicketStatus::NoShow]);
                $this->recordEvent($locked, TicketEventType::Requeued, $actor, $counter, ['previous_status' => $previous->value]);
                $locked->forceFill([
                    'status' => TicketStatus::Waiting,
                    'counter_id' => null,
                    'called_by_user_id' => null,
                    'called_at' => null,
                    'service_started_at' => null,
                ])->save();
                DB::afterCommit(fn () => Log::info('ticket.requeued', [
                    'request_id' => $requestId, 'ticket_id' => $locked->id, 'ticket_code' => $locked->code,
                    'unit_id' => $locked->unit_id, 'service_id' => $locked->service_id, 'counter_id' => $counter->id,
                    'actor_user_id' => $actor->id, 'previous_status' => $previous->value, 'new_status' => TicketStatus::Waiting->value,
                ]));

                return $locked;
            },
        ) ?? throw new DomainConflictException('Não foi possível retornar a senha para a fila.');
    }
}
