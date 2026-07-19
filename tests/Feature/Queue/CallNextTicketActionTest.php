<?php

declare(strict_types=1);

use App\Actions\CallNextTicketAction;
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
use App\Models\Unit;
use App\Models\User;
use Illuminate\Support\Str;

beforeEach(function (): void {
    $this->unit = Unit::factory()->create();
    $this->service = Service::factory()->for($this->unit)->create([
        'priority_streak_limit' => 2,
    ]);
    $this->counter = Counter::factory()->for($this->unit)->create();
    $this->counter->services()->attach($this->service);
    $this->actor = User::factory()->for($this->unit)->create();
    $this->action = app(CallNextTicketAction::class);
});

test('it calls tickets FIFO within each priority queue', function (TicketPriority $priority): void {
    $prefix = $priority === TicketPriority::Priority ? 'P' : 'N';
    $older = Ticket::factory()->create([
        'unit_id' => $this->unit->id,
        'service_id' => $this->service->id,
        'priority' => $priority,
        'sequence' => 1,
        'code' => $prefix.'0001',
        'issued_at' => now()->subMinutes(2),
    ]);
    $newer = Ticket::factory()->create([
        'unit_id' => $this->unit->id,
        'service_id' => $this->service->id,
        'priority' => $priority,
        'sequence' => 2,
        'code' => $prefix.'0002',
        'issued_at' => now()->subMinute(),
    ]);

    $called = $this->action->execute(
        $this->actor,
        $this->counter,
        $this->service,
        (string) Str::uuid(),
    );

    expect($called?->is($older))->toBeTrue()
        ->and($older->fresh()->status)->toBe(TicketStatus::Called)
        ->and($older->fresh()->counter_id)->toBe($this->counter->id)
        ->and($newer->fresh()->status)->toBe(TicketStatus::Waiting);
})->with([
    'standard' => TicketPriority::Standard,
    'priority' => TicketPriority::Priority,
]);

test('it prefers a priority ticket even when a standard ticket was issued earlier', function (): void {
    $standard = Ticket::factory()->create([
        'unit_id' => $this->unit->id,
        'service_id' => $this->service->id,
        'issued_at' => now()->subMinutes(5),
    ]);
    $priority = Ticket::factory()->priority()->create([
        'unit_id' => $this->unit->id,
        'service_id' => $this->service->id,
        'issued_at' => now()->subMinute(),
    ]);

    $called = $this->action->execute(
        $this->actor,
        $this->counter,
        $this->service,
        (string) Str::uuid(),
    );

    expect($called?->is($priority))->toBeTrue()
        ->and($standard->fresh()->status)->toBe(TicketStatus::Waiting);
});

test('it calls a waiting standard ticket after reaching the priority streak limit', function (): void {
    $standard = Ticket::factory()->create([
        'unit_id' => $this->unit->id,
        'service_id' => $this->service->id,
        'issued_at' => now()->subMinutes(10),
    ]);
    $priorities = collect(range(1, 3))->map(fn (int $sequence): Ticket => Ticket::factory()->priority()->create([
        'unit_id' => $this->unit->id,
        'service_id' => $this->service->id,
        'sequence' => $sequence,
        'code' => sprintf('P%04d', $sequence),
        'issued_at' => now()->subMinutes(6 - $sequence),
    ]));
    $counters = Counter::factory()->for($this->unit)->count(3)->create();
    $counters->each(fn (Counter $counter) => $counter->services()->attach($this->service));

    $first = $this->action->execute($this->actor, $counters[0], $this->service, (string) Str::uuid());
    $second = $this->action->execute($this->actor, $counters[1], $this->service, (string) Str::uuid());
    $third = $this->action->execute($this->actor, $counters[2], $this->service, (string) Str::uuid());

    expect($first?->is($priorities[0]))->toBeTrue()
        ->and($second?->is($priorities[1]))->toBeTrue()
        ->and($third?->is($standard))->toBeTrue()
        ->and($priorities[2]->fresh()->status)->toBe(TicketStatus::Waiting)
        ->and(QueueState::query()->findOrFail($this->service->id)->consecutive_priority_calls)->toBe(0);
});

test('it refuses to call another ticket while the counter is occupied', function (): void {
    $active = Ticket::factory()->called()->create([
        'unit_id' => $this->unit->id,
        'service_id' => $this->service->id,
        'counter_id' => $this->counter->id,
        'called_by_user_id' => $this->actor->id,
    ]);
    $waiting = Ticket::factory()->create([
        'unit_id' => $this->unit->id,
        'service_id' => $this->service->id,
    ]);

    expect(fn (): ?Ticket => $this->action->execute(
        $this->actor,
        $this->counter,
        $this->service,
        (string) Str::uuid(),
    ))->toThrow(DomainConflictException::class, 'Conclua a senha atual antes de chamar outra.');

    expect($active->fresh()->status)->toBe(TicketStatus::Called)
        ->and($waiting->fresh()->status)->toBe(TicketStatus::Waiting)
        ->and(QueueCommand::query()->count())->toBe(0);
});

test('it replays call next without calling a second ticket or duplicating side effects', function (): void {
    $firstWaiting = Ticket::factory()->priority()->create([
        'unit_id' => $this->unit->id,
        'service_id' => $this->service->id,
        'sequence' => 1,
        'code' => 'P0001',
        'issued_at' => now()->subMinutes(2),
    ]);
    $secondWaiting = Ticket::factory()->priority()->create([
        'unit_id' => $this->unit->id,
        'service_id' => $this->service->id,
        'sequence' => 2,
        'code' => 'P0002',
        'issued_at' => now()->subMinute(),
    ]);
    $requestId = (string) Str::uuid();

    $firstResult = $this->action->execute($this->actor, $this->counter, $this->service, $requestId);
    $replayed = $this->action->execute($this->actor, $this->counter, $this->service, $requestId);

    expect($firstResult?->is($firstWaiting))->toBeTrue()
        ->and($replayed?->is($firstWaiting))->toBeTrue()
        ->and($secondWaiting->fresh()->status)->toBe(TicketStatus::Waiting)
        ->and(QueueCommand::query()->count())->toBe(1)
        ->and(TicketEvent::query()->where('type', TicketEventType::Called)->count())->toBe(1)
        ->and(QueueState::query()->findOrFail($this->service->id)->consecutive_priority_calls)->toBe(1);
});

test('it replays an empty call next result even if a ticket arrives later', function (): void {
    $requestId = (string) Str::uuid();

    $firstResult = $this->action->execute($this->actor, $this->counter, $this->service, $requestId);
    $laterTicket = Ticket::factory()->create([
        'unit_id' => $this->unit->id,
        'service_id' => $this->service->id,
    ]);
    $replayed = $this->action->execute($this->actor, $this->counter, $this->service, $requestId);

    expect($firstResult)->toBeNull()
        ->and($replayed)->toBeNull()
        ->and($laterTicket->fresh()->status)->toBe(TicketStatus::Waiting)
        ->and(QueueCommand::query()->count())->toBe(1);
});
