<?php

declare(strict_types=1);

namespace App\Support;

use App\Enums\QueueCommandType;
use App\Exceptions\DomainConflictException;
use App\Exceptions\IdempotencyConflictException;
use App\Models\QueueCommand;
use App\Models\Ticket;
use App\Models\User;
use Closure;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

final class CommandExecutor
{
    /**
     * @param  array{unit_id: string, service_id?: string|null, counter_id?: string|null, ticket_id?: string|null}  $context
     * @param  array<string, scalar|null>  $payload
     * @param  Closure(QueueCommand): (Ticket|null)  $operation
     */
    public function execute(
        QueueCommandType $type,
        string $requestId,
        User $actor,
        array $context,
        array $payload,
        Closure $operation,
    ): ?Ticket {
        $payloadHash = hash('sha256', json_encode($payload, JSON_THROW_ON_ERROR));

        try {
            return DB::transaction(function () use ($type, $requestId, $actor, $context, $payloadHash, $operation): ?Ticket {
                $existing = QueueCommand::query()
                    ->where('request_id', $requestId)
                    ->lockForUpdate()
                    ->first();

                if ($existing !== null) {
                    return $this->replay($existing, $type, $payloadHash);
                }

                $command = QueueCommand::query()->create([
                    'request_id' => $requestId,
                    'command' => $type,
                    'actor_user_id' => $actor->id,
                    'unit_id' => $context['unit_id'],
                    'service_id' => $context['service_id'] ?? null,
                    'counter_id' => $context['counter_id'] ?? null,
                    'ticket_id' => $context['ticket_id'] ?? null,
                    'payload_hash' => $payloadHash,
                ]);

                $ticket = $operation($command);
                $ticketId = $ticket instanceof Ticket ? $ticket->id : null;

                $command->forceFill([
                    'ticket_id' => $ticketId ?? $command->ticket_id,
                    'result' => [
                        'ticket_id' => $ticketId,
                        'empty' => $ticket === null,
                    ],
                ])->save();

                return $ticket;
            }, attempts: 3);
        } catch (QueryException $exception) {
            $existing = QueueCommand::query()->where('request_id', $requestId)->first();

            if ($existing === null) {
                Log::error('queue_command.transaction_failed', [
                    'request_id' => $requestId,
                    'command' => $type->value,
                    'actor_user_id' => $actor->id,
                    'unit_id' => $context['unit_id'],
                    'service_id' => $context['service_id'] ?? null,
                    'counter_id' => $context['counter_id'] ?? null,
                    'ticket_id' => $context['ticket_id'] ?? null,
                    'error' => $exception->getMessage(),
                ]);

                throw $exception;
            }

            return $this->replay($existing, $type, $payloadHash);
        } catch (DomainConflictException|AuthorizationException $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            Log::error('queue_command.transaction_failed', [
                'request_id' => $requestId,
                'command' => $type->value,
                'actor_user_id' => $actor->id,
                'unit_id' => $context['unit_id'],
                'service_id' => $context['service_id'] ?? null,
                'counter_id' => $context['counter_id'] ?? null,
                'ticket_id' => $context['ticket_id'] ?? null,
                'error' => $exception->getMessage(),
            ]);

            throw $exception;
        }
    }

    private function replay(QueueCommand $command, QueueCommandType $type, string $payloadHash): ?Ticket
    {
        if ($command->command !== $type || ! hash_equals($command->payload_hash, $payloadHash)) {
            Log::warning('queue_command.idempotency_conflict', [
                'request_id' => $command->request_id,
                'command' => $type->value,
                'actor_user_id' => $command->actor_user_id,
            ]);

            throw new IdempotencyConflictException('A chave de requisição já foi usada com dados diferentes.');
        }

        $ticketId = $command->result === null ? null : $command->result['ticket_id'];

        return $ticketId === null ? null : Ticket::query()->findOrFail($ticketId);
    }
}
