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

final class MarkTicketNoShowAction
{
    use HandlesTicketOperations;

    public function __construct(private readonly CommandExecutor $commands) {}

    public function execute(User $actor, Ticket $ticket, Counter $counter, string $requestId): Ticket
    {
        return $this->commands->execute(
            QueueCommandType::MarkNoShow,
            $requestId,
            $actor,
            ['unit_id' => $ticket->unit_id, 'service_id' => $ticket->service_id, 'counter_id' => $counter->id, 'ticket_id' => $ticket->id],
            ['ticket_id' => $ticket->id, 'counter_id' => $counter->id],
            function (QueueCommand $command) use ($actor, $ticket, $counter, $requestId): Ticket {
                $locked = $this->lockedTicket($ticket->id);
                $this->authorizeTicket($actor, $locked, $counter, [TicketStatus::Called]);
                $locked->forceFill(['status' => TicketStatus::NoShow, 'no_show_at' => now()])->save();
                $this->recordEvent($locked, TicketEventType::MarkedNoShow, $actor, $counter);
                DB::afterCommit(fn () => Log::info('ticket.marked_no_show', [
                    'request_id' => $requestId, 'ticket_id' => $locked->id, 'ticket_code' => $locked->code,
                    'unit_id' => $locked->unit_id, 'service_id' => $locked->service_id, 'counter_id' => $counter->id,
                    'actor_user_id' => $actor->id, 'previous_status' => TicketStatus::Called->value, 'new_status' => TicketStatus::NoShow->value,
                ]));

                return $locked;
            },
        ) ?? throw new DomainConflictException('Não foi possível registrar a ausência.');
    }
}
