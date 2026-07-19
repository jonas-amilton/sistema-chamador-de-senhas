<?php

declare(strict_types=1);

namespace App\Actions;

use App\Actions\Concerns\HandlesTicketOperations;
use App\Enums\QueueCommandType;
use App\Enums\TicketEventType;
use App\Enums\TicketPriority;
use App\Enums\TicketStatus;
use App\Events\TicketDisplayUpdated;
use App\Exceptions\DomainConflictException;
use App\Models\Counter;
use App\Models\QueueCommand;
use App\Models\QueueState;
use App\Models\Service;
use App\Models\Ticket;
use App\Models\User;
use App\Support\CommandExecutor;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

final class CallNextTicketAction
{
    use HandlesTicketOperations;

    public function __construct(private readonly CommandExecutor $commands) {}

    public function execute(User $actor, Counter $counter, Service $service, string $requestId): ?Ticket
    {
        return $this->commands->execute(
            QueueCommandType::CallNext,
            $requestId,
            $actor,
            ['unit_id' => $counter->unit_id, 'service_id' => $service->id, 'counter_id' => $counter->id],
            ['counter_id' => $counter->id, 'service_id' => $service->id],
            function (QueueCommand $command) use ($actor, $counter, $service, $requestId): ?Ticket {
                $lockedCounter = Counter::query()->lockForUpdate()->findOrFail($counter->id);
                $lockedService = Service::query()->findOrFail($service->id);

                $this->authorizeActor($actor, $lockedCounter->unit_id);

                if (! $lockedCounter->is_active || ! $lockedService->is_active || $lockedService->unit_id !== $lockedCounter->unit_id) {
                    throw new DomainConflictException('O guichê ou o serviço não está disponível.');
                }

                if (! $lockedCounter->services()->whereKey($lockedService->id)->exists()) {
                    throw new DomainConflictException('O guichê não atende ao serviço selecionado.');
                }

                if (Ticket::query()->activeAtCounter($lockedCounter->id)->lockForUpdate()->exists()) {
                    throw new DomainConflictException('Conclua a senha atual antes de chamar outra.');
                }

                QueueState::query()->insertOrIgnore([
                    'service_id' => $lockedService->id,
                    'consecutive_priority_calls' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $queueState = QueueState::query()->lockForUpdate()->findOrFail($lockedService->id);
                $baseQuery = Ticket::query()
                    ->where('unit_id', $lockedCounter->unit_id)
                    ->where('service_id', $lockedService->id)
                    ->where('status', TicketStatus::Waiting)
                    ->orderBy('issued_at')
                    ->orderBy('id');

                $standard = (clone $baseQuery)
                    ->where('priority', TicketPriority::Standard)
                    ->lockForUpdate()
                    ->first();
                $priority = (clone $baseQuery)
                    ->where('priority', TicketPriority::Priority)
                    ->lockForUpdate()
                    ->first();

                $ticket = $this->chooseTicket($standard, $priority, $queueState, $lockedService);

                if ($ticket === null) {
                    return null;
                }

                $now = now();
                $ticket->forceFill([
                    'status' => TicketStatus::Called,
                    'counter_id' => $lockedCounter->id,
                    'called_by_user_id' => $actor->id,
                    'called_at' => $now,
                    'last_called_at' => $now,
                ])->save();

                $queueState->forceFill([
                    'consecutive_priority_calls' => $ticket->priority === TicketPriority::Priority
                        ? $queueState->consecutive_priority_calls + 1
                        : 0,
                ])->save();

                $ticketEvent = $this->recordEvent($ticket, TicketEventType::Called, $actor, $lockedCounter);
                TicketDisplayUpdated::dispatch($ticket, $ticketEvent);

                DB::afterCommit(fn () => Log::info('ticket.called', [
                    'request_id' => $requestId,
                    'ticket_id' => $ticket->id,
                    'ticket_code' => $ticket->code,
                    'unit_id' => $ticket->unit_id,
                    'service_id' => $ticket->service_id,
                    'counter_id' => $lockedCounter->id,
                    'actor_user_id' => $actor->id,
                    'previous_status' => TicketStatus::Waiting->value,
                    'new_status' => TicketStatus::Called->value,
                ]));

                return $ticket;
            },
        );
    }

    private function chooseTicket(
        ?Ticket $standard,
        ?Ticket $priority,
        QueueState $state,
        Service $service,
    ): ?Ticket {
        if ($priority !== null && ($standard === null || $state->consecutive_priority_calls < $service->priority_streak_limit)) {
            return $priority;
        }

        return $standard ?? $priority;
    }
}
