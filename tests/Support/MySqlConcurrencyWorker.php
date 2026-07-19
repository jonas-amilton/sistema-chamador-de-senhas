<?php

declare(strict_types=1);

use App\Actions\CallNextTicketAction;
use App\Actions\IssueTicketAction;
use App\Enums\TicketPriority;
use App\Exceptions\DomainConflictException;
use App\Models\Counter;
use App\Models\Service;
use App\Models\Ticket;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

ob_start();

require dirname(__DIR__, 2).'/vendor/autoload.php';

$operation = 'unknown';
$startedAt = null;

try {
    $input = json_decode($argv[1] ?? '', true, 512, JSON_THROW_ON_ERROR);
    $operation = (string) ($input['operation'] ?? 'unknown');
    $payload = $input['payload'] ?? [];
    $barrierDirectory = (string) ($input['barrier_directory'] ?? '');
    $workerId = (string) ($input['worker_id'] ?? '');

    if (! is_array($payload) || ! is_dir($barrierDirectory) || $workerId === '') {
        throw new RuntimeException('The worker input is invalid.');
    }

    $app = require dirname(__DIR__, 2).'/bootstrap/app.php';
    $app->make(Kernel::class)->bootstrap();

    $driver = (string) config('database.connections.'.config('database.default').'.driver');

    if (! in_array($driver, ['mysql', 'mariadb'], true)) {
        throw new RuntimeException("The concurrency worker requires MySQL/MariaDB; [{$driver}] configured.");
    }

    DB::connection()->getPdo();

    $execute = match ($operation) {
        'issue' => (static function () use ($app, $payload): Closure {
            $action = $app->make(IssueTicketAction::class);
            $unit = Unit::query()->findOrFail((string) $payload['unit_id']);
            $service = Service::query()->findOrFail((string) $payload['service_id']);
            $priority = TicketPriority::from((string) $payload['priority']);
            $requestId = (string) $payload['request_id'];

            return static fn (): Ticket => $action->execute($unit, $service, $priority, $requestId);
        })(),
        'call-next' => (static function () use ($app, $payload): Closure {
            $action = $app->make(CallNextTicketAction::class);
            $actor = User::query()->findOrFail((int) $payload['actor_id']);
            $counter = Counter::query()->findOrFail((string) $payload['counter_id']);
            $service = Service::query()->findOrFail((string) $payload['service_id']);
            $requestId = (string) $payload['request_id'];

            return static fn (): ?Ticket => $action->execute($actor, $counter, $service, $requestId);
        })(),
        default => throw new RuntimeException("Unknown worker operation [{$operation}]."),
    };

    if (file_put_contents($barrierDirectory.'/ready-'.$workerId, (string) getmypid(), LOCK_EX) === false) {
        throw new RuntimeException('Unable to signal worker readiness.');
    }

    $barrierDeadline = microtime(true) + 20;

    while (! is_file($barrierDirectory.'/release')) {
        if (microtime(true) >= $barrierDeadline) {
            throw new RuntimeException('The start barrier was not released within 20 seconds.');
        }

        usleep(1_000);
    }

    $startedAt = hrtime(true);
    $ticket = $execute();

    mysqlConcurrencyRespond([
        'ok' => true,
        'operation' => $operation,
        'pid' => getmypid(),
        'started_at_ns' => $startedAt,
        'ticket' => $ticket === null ? null : [
            'id' => $ticket->id,
            'unit_id' => $ticket->unit_id,
            'service_id' => $ticket->service_id,
            'counter_id' => $ticket->counter_id,
            'called_by_user_id' => $ticket->called_by_user_id,
            'priority' => $ticket->priority->value,
            'status' => $ticket->status->value,
            'sequence' => $ticket->sequence,
            'code' => $ticket->code,
        ],
    ]);
} catch (DomainConflictException $exception) {
    mysqlConcurrencyRespond([
        'ok' => false,
        'operation' => $operation,
        'pid' => getmypid(),
        'started_at_ns' => $startedAt,
        'error' => [
            'kind' => 'domain',
            'class' => $exception::class,
            'message' => $exception->getMessage(),
            'context' => $exception->context,
        ],
    ]);
} catch (Throwable $exception) {
    mysqlConcurrencyRespond([
        'ok' => false,
        'operation' => $operation,
        'pid' => getmypid(),
        'started_at_ns' => $startedAt,
        'error' => [
            'kind' => 'unexpected',
            'class' => $exception::class,
            'message' => $exception->getMessage(),
        ],
    ], 1);
}

/** @param array<string, mixed> $result */
function mysqlConcurrencyRespond(array $result, int $exitCode = 0): never
{
    while (ob_get_level() > 0) {
        ob_end_clean();
    }

    fwrite(STDOUT, json_encode($result, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES).PHP_EOL);

    exit($exitCode);
}
