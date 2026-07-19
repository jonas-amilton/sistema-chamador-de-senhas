<?php

declare(strict_types=1);

use App\Actions\IssueTicketAction;
use App\Enums\QueueCommandType;
use App\Enums\TicketEventType;
use App\Enums\TicketPriority;
use App\Enums\TicketStatus;
use App\Exceptions\DomainConflictException;
use App\Models\Counter;
use App\Models\QueueCommand;
use App\Models\QueueState;
use App\Models\Service;
use App\Models\Ticket;
use App\Models\TicketEvent;
use App\Models\TicketSequence;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Str;
use Tests\Support\MySqlConcurrentRunner;
use Tests\TestCase;

uses(TestCase::class)->group('mysql-integration');

beforeEach(function (): void {
    if (getenv('RUN_MYSQL_INTEGRATION') !== 'true') {
        $this->markTestSkipped('Set RUN_MYSQL_INTEGRATION=true to run real MySQL/MariaDB concurrency tests.');
    }

    if (! app()->environment('testing')) {
        throw new RuntimeException('MySQL integration tests require APP_ENV=testing.');
    }

    $connection = (string) config('database.default');
    $driver = (string) config("database.connections.{$connection}.driver");
    $database = (string) config("database.connections.{$connection}.database");

    if (! in_array($driver, ['mysql', 'mariadb'], true) || $database === '' || $database === ':memory:') {
        throw new RuntimeException('RUN_MYSQL_INTEGRATION=true requires a real MySQL/MariaDB database configured by env.');
    }

    $exitCode = Artisan::call('migrate:fresh', ['--force' => true]);

    if ($exitCode !== 0) {
        throw new RuntimeException('migrate:fresh failed: '.Artisan::output());
    }
});

test('concurrent issues receive distinct sequences and codes', function (): void {
    $unit = Unit::factory()->create();
    $service = Service::factory()->for($unit)->create([
        'standard_prefix' => 'N',
    ]);

    $results = MySqlConcurrentRunner::run([
        mysqlIssueJob($unit, $service),
        mysqlIssueJob($unit, $service),
    ]);

    $tickets = Ticket::query()->orderBy('sequence')->get();

    expect(array_column($results, 'ok'))->toBe([true, true])
        ->and($tickets)->toHaveCount(2)
        ->and($tickets->pluck('sequence')->all())->toBe([1, 2])
        ->and($tickets->pluck('code')->all())->toBe(['N0001', 'N0002'])
        ->and($tickets->pluck('id')->unique())->toHaveCount(2)
        ->and(TicketSequence::query()->sole()->last_value)->toBe(2)
        ->and(TicketEvent::query()->where('type', TicketEventType::Issued)->count())->toBe(2);
});

test('two concurrent attendants cannot obtain the same waiting ticket', function (): void {
    $unit = Unit::factory()->create();
    $service = Service::factory()->for($unit)->create();
    $counters = Counter::factory()->for($unit)->count(2)->create();
    $counters->each(fn (Counter $counter) => $counter->services()->attach($service));
    $actors = User::factory()->for($unit)->count(2)->create();
    $ticket = mysqlIssueTicket($unit, $service);

    $results = MySqlConcurrentRunner::run([
        mysqlCallNextJob($actors[0], $counters[0], $service),
        mysqlCallNextJob($actors[1], $counters[1], $service),
    ]);
    $returnedTicketIds = array_values(array_filter(array_map(
        static fn (array $result): ?string => $result['ticket']['id'] ?? null,
        $results,
    )));

    expect(array_column($results, 'ok'))->toBe([true, true])
        ->and($returnedTicketIds)->toHaveCount(1)
        ->and($returnedTicketIds[0])->toBe($ticket->id)
        ->and(Ticket::query()->where('status', TicketStatus::Called)->count())->toBe(1)
        ->and(QueueCommand::query()->count())->toBe(2)
        ->and(QueueCommand::query()->whereJsonContains('result->empty', true)->count())->toBe(1)
        ->and(TicketEvent::query()->where('type', TicketEventType::Called)->count())->toBe(1);
});

test('concurrent calls with one request id produce one command result and one called ticket', function (): void {
    $unit = Unit::factory()->create();
    $service = Service::factory()->for($unit)->create();
    $counter = Counter::factory()->for($unit)->create();
    $counter->services()->attach($service);
    $actor = User::factory()->for($unit)->create();
    $ticket = mysqlIssueTicket($unit, $service);
    $requestId = (string) Str::uuid();

    $results = MySqlConcurrentRunner::run([
        mysqlCallNextJob($actor, $counter, $service, $requestId),
        mysqlCallNextJob($actor, $counter, $service, $requestId),
    ]);
    $command = QueueCommand::query()->where('request_id', $requestId)->sole();

    expect(array_column($results, 'ok'))->toBe([true, true])
        ->and(array_column(array_column($results, 'ticket'), 'id'))->toBe([$ticket->id, $ticket->id])
        ->and(QueueCommand::query()->count())->toBe(1)
        ->and($command->ticket_id)->toBe($ticket->id)
        ->and($command->result)->toBe(['ticket_id' => $ticket->id, 'empty' => false])
        ->and(Ticket::query()->where('status', TicketStatus::Called)->count())->toBe(1)
        ->and(TicketEvent::query()->where('type', TicketEventType::Called)->count())->toBe(1);
});

test('one counter cannot retain two active tickets during calls across services', function (): void {
    $unit = Unit::factory()->create();
    $services = Service::factory()->for($unit)->count(2)->create();
    $counter = Counter::factory()->for($unit)->create();
    $counter->services()->attach($services->modelKeys());
    $actors = User::factory()->for($unit)->count(2)->create();
    mysqlIssueTicket($unit, $services[0]);
    mysqlIssueTicket($unit, $services[1]);

    $results = MySqlConcurrentRunner::run([
        mysqlCallNextJob($actors[0], $counter, $services[0]),
        mysqlCallNextJob($actors[1], $counter, $services[1]),
    ]);
    $successes = array_values(array_filter($results, static fn (array $result): bool => $result['ok']));
    $conflicts = array_values(array_filter($results, static fn (array $result): bool => ! $result['ok']));

    expect($successes)->toHaveCount(1)
        ->and($conflicts)->toHaveCount(1)
        ->and($conflicts[0]['error']['kind'])->toBe('domain')
        ->and(is_a($conflicts[0]['error']['class'], DomainConflictException::class, true))->toBeTrue()
        ->and(Ticket::query()->where('counter_id', $counter->id)->whereIn('status', [
            TicketStatus::Called,
            TicketStatus::Serving,
        ])->count())->toBe(1)
        ->and(Ticket::query()->where('status', TicketStatus::Waiting)->count())->toBe(1)
        ->and(QueueCommand::query()->count())->toBe(1)
        ->and(TicketEvent::query()->where('type', TicketEventType::Called)->count())->toBe(1);
});

test('queue records remain mutually consistent after concurrent calls', function (): void {
    $unit = Unit::factory()->create();
    $service = Service::factory()->for($unit)->create([
        'priority_streak_limit' => 3,
    ]);
    $counters = Counter::factory()->for($unit)->count(2)->create();
    $counters->each(fn (Counter $counter) => $counter->services()->attach($service));
    $actors = User::factory()->for($unit)->count(2)->create();

    collect(range(1, 3))->each(
        fn (): Ticket => mysqlIssueTicket($unit, $service, TicketPriority::Priority),
    );

    $requestIds = [(string) Str::uuid(), (string) Str::uuid()];
    $results = MySqlConcurrentRunner::run([
        mysqlCallNextJob($actors[0], $counters[0], $service, $requestIds[0]),
        mysqlCallNextJob($actors[1], $counters[1], $service, $requestIds[1]),
    ]);
    $calledTickets = Ticket::query()->where('status', TicketStatus::Called)->get();
    $waitingTicket = Ticket::query()->where('status', TicketStatus::Waiting)->sole();
    $commands = QueueCommand::query()->whereIn('request_id', $requestIds)->get();
    $calledEvents = TicketEvent::query()->where('type', TicketEventType::Called)->get();
    $resultTicketIds = collect($results)->pluck('ticket.id')->sort()->values()->all();

    expect(array_column($results, 'ok'))->toBe([true, true])
        ->and($calledTickets)->toHaveCount(2)
        ->and($calledTickets->pluck('id')->sort()->values()->all())->toBe($resultTicketIds)
        ->and($calledTickets->pluck('counter_id')->unique())->toHaveCount(2)
        ->and($waitingTicket->counter_id)->toBeNull()
        ->and($commands)->toHaveCount(2)
        ->and($calledEvents)->toHaveCount(2)
        ->and(QueueState::query()->findOrFail($service->id)->consecutive_priority_calls)->toBe(2)
        ->and(TicketSequence::query()->sole()->last_value)->toBe(3)
        ->and(TicketEvent::query()->where('type', TicketEventType::Issued)->count())->toBe(3);

    foreach ($commands as $command) {
        $calledTicket = $calledTickets->firstWhere('id', $command->ticket_id);

        expect($command->command)->toBe(QueueCommandType::CallNext)
            ->and($command->result)->toBe(['ticket_id' => $command->ticket_id, 'empty' => false])
            ->and($calledTicket)->not->toBeNull()
            ->and($calledTicket->called_by_user_id)->toBe($command->actor_user_id)
            ->and($calledTicket->counter_id)->toBe($command->counter_id)
            ->and($calledTicket->called_at)->not->toBeNull();
    }

    foreach ($calledTickets as $calledTicket) {
        $event = $calledEvents->where('ticket_id', $calledTicket->id)->sole();

        expect($event->actor_user_id)->toBe($calledTicket->called_by_user_id)
            ->and($event->counter_id)->toBe($calledTicket->counter_id);
    }
});

/** @return array{operation: string, payload: array<string, string>} */
function mysqlIssueJob(Unit $unit, Service $service): array
{
    return [
        'operation' => 'issue',
        'payload' => [
            'unit_id' => $unit->id,
            'service_id' => $service->id,
            'priority' => TicketPriority::Standard->value,
            'request_id' => (string) Str::uuid(),
        ],
    ];
}

/** @return array{operation: string, payload: array<string, string>} */
function mysqlCallNextJob(
    User $actor,
    Counter $counter,
    Service $service,
    ?string $requestId = null,
): array {
    return [
        'operation' => 'call-next',
        'payload' => [
            'actor_id' => (string) $actor->id,
            'counter_id' => $counter->id,
            'service_id' => $service->id,
            'request_id' => $requestId ?? (string) Str::uuid(),
        ],
    ];
}

function mysqlIssueTicket(
    Unit $unit,
    Service $service,
    TicketPriority $priority = TicketPriority::Standard,
): Ticket {
    return app(IssueTicketAction::class)->execute(
        $unit,
        $service,
        $priority,
        (string) Str::uuid(),
    );
}
