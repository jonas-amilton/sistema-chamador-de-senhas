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
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

final class CancelTicketAction
{
    use HandlesTicketOperations;

    public function __construct(private readonly CommandExecutor $commands) {}

    public function execute(User $actor, Ticket $ticket, ?Counter $counter, string $requestId): Ticket
    {
        return $this->commands->execute(
            QueueCommandType::Cancel,
            $requestId,
            $actor,
            ['unit_id' => $ticket->unit_id, 'service_id' => $ticket->service_id, 'counter_id' => $counter?->id, 'ticket_id' => $ticket->id],
            ['ticket_id' => $ticket->id, 'counter_id' => $counter?->id],
            function (QueueCommand $command) use ($actor, $ticket, $counter, $requestId): Ticket {
                $locked = $this->lockedTicket($ticket->id);
                $previous = $locked->status;

                if ($locked->status === TicketStatus::Waiting && ! $actor->isAdmin()) {
                    throw new AuthorizationException('Somente administradores podem cancelar senhas aguardando.');
                }

                if ($locked->status !== TicketStatus::Waiting && $counter === null) {
                    throw new AuthorizationException('Selecione o guichê responsável pela senha.');
                }

                $this->authorizeTicket(
                    $actor,
                    $locked,
                    $locked->status === TicketStatus::Waiting ? null : $counter,
                    [TicketStatus::Waiting, TicketStatus::Called, TicketStatus::Serving, TicketStatus::NoShow],
                );

                $locked->forceFill(['status' => TicketStatus::Cancelled, 'cancelled_at' => now()])->save();
                $this->recordEvent($locked, TicketEventType::Cancelled, $actor, $counter, ['previous_status' => $previous->value]);
                DB::afterCommit(fn () => Log::info('ticket.cancelled', [
                    'request_id' => $requestId, 'ticket_id' => $locked->id, 'ticket_code' => $locked->code,
                    'unit_id' => $locked->unit_id, 'service_id' => $locked->service_id, 'counter_id' => $counter?->id,
                    'actor_user_id' => $actor->id, 'previous_status' => $previous->value, 'new_status' => TicketStatus::Cancelled->value,
                ]));

                return $locked;
            },
        ) ?? throw new DomainConflictException('Não foi possível cancelar a senha.');
    }
}
