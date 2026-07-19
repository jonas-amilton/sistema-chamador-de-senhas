<?php

declare(strict_types=1);

namespace App\Actions;

use App\Enums\TicketEventType;
use App\Enums\TicketPriority;
use App\Enums\TicketStatus;
use App\Exceptions\DomainConflictException;
use App\Models\Service;
use App\Models\Ticket;
use App\Models\TicketSequence;
use App\Models\Unit;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

final class IssueTicketAction
{
    public function execute(
        Unit $unit,
        Service $service,
        TicketPriority $priority,
        string $clientRequestId,
    ): Ticket {
        $existing = Ticket::query()->where('client_request_id', $clientRequestId)->first();

        if ($existing !== null) {
            return $this->replay($existing, $unit, $service, $priority);
        }

        if (! $unit->is_active || ! $service->is_active || $service->unit_id !== $unit->id) {
            throw new DomainConflictException('A unidade ou o serviço não está disponível para emissão.');
        }

        try {
            return DB::transaction(function () use ($unit, $service, $priority, $clientRequestId): Ticket {
                $businessDate = now()->setTimezone($unit->timezone)->toDateString();
                $now = now();

                TicketSequence::query()->upsert([[
                    'id' => (string) Str::ulid(),
                    'unit_id' => $unit->id,
                    'service_id' => $service->id,
                    'business_date' => $businessDate,
                    'priority' => $priority->value,
                    'last_value' => 0,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]], ['unit_id', 'service_id', 'business_date', 'priority'], []);

                $sequence = TicketSequence::query()
                    ->where('unit_id', $unit->id)
                    ->where('service_id', $service->id)
                    ->whereDate('business_date', $businessDate)
                    ->where('priority', $priority)
                    ->lockForUpdate()
                    ->firstOrFail();

                $sequence->increment('last_value');
                $value = $sequence->last_value;
                $prefix = $priority === TicketPriority::Priority
                    ? $service->priority_prefix
                    : $service->standard_prefix;

                $ticket = Ticket::query()->create([
                    'unit_id' => $unit->id,
                    'service_id' => $service->id,
                    'priority' => $priority,
                    'status' => TicketStatus::Waiting,
                    'business_date' => $businessDate,
                    'sequence' => $value,
                    'code' => $prefix.str_pad((string) $value, 4, '0', STR_PAD_LEFT),
                    'client_request_id' => $clientRequestId,
                    'issued_at' => $now,
                ]);

                $ticket->events()->create([
                    'type' => TicketEventType::Issued,
                    'metadata' => ['client_request_id' => $clientRequestId],
                    'occurred_at' => $now,
                ]);

                DB::afterCommit(fn () => Log::info('ticket.issued', [
                    'request_id' => $clientRequestId,
                    'ticket_id' => $ticket->id,
                    'ticket_code' => $ticket->code,
                    'unit_id' => $ticket->unit_id,
                    'service_id' => $ticket->service_id,
                    'new_status' => TicketStatus::Waiting->value,
                ]));

                return $ticket;
            }, attempts: 3);
        } catch (QueryException $exception) {
            $existing = Ticket::query()->where('client_request_id', $clientRequestId)->first();

            if ($existing === null) {
                Log::error('ticket.issue_transaction_failed', [
                    'request_id' => $clientRequestId,
                    'unit_id' => $unit->id,
                    'service_id' => $service->id,
                    'error' => $exception->getMessage(),
                ]);

                throw $exception;
            }

            return $this->replay($existing, $unit, $service, $priority);
        }
    }

    private function replay(Ticket $ticket, Unit $unit, Service $service, TicketPriority $priority): Ticket
    {
        if ($ticket->unit_id !== $unit->id || $ticket->service_id !== $service->id || $ticket->priority !== $priority) {
            throw new DomainConflictException('A chave de emissão já foi usada com dados diferentes.');
        }

        return $ticket;
    }
}
