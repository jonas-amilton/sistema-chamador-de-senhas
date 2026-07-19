<?php

declare(strict_types=1);

use App\Actions\IssueTicketAction;
use App\Enums\TicketEventType;
use App\Enums\TicketPriority;
use App\Enums\TicketStatus;
use App\Exceptions\DomainConflictException;
use App\Models\Service;
use App\Models\Ticket;
use App\Models\TicketEvent;
use App\Models\TicketSequence;
use App\Models\Unit;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

beforeEach(function (): void {
    $this->unit = Unit::factory()->create();
    $this->service = Service::factory()->for($this->unit)->create([
        'standard_prefix' => 'N',
        'priority_prefix' => 'P',
    ]);
    $this->action = app(IssueTicketAction::class);
});

test('it issues standard and priority tickets with their expected codes and events', function (): void {
    $standardRequestId = (string) Str::uuid();
    $priorityRequestId = (string) Str::uuid();

    $standard = $this->action->execute(
        $this->unit,
        $this->service,
        TicketPriority::Standard,
        $standardRequestId,
    );
    $priority = $this->action->execute(
        $this->unit,
        $this->service,
        TicketPriority::Priority,
        $priorityRequestId,
    );

    expect($standard->status)->toBe(TicketStatus::Waiting)
        ->and($standard->priority)->toBe(TicketPriority::Standard)
        ->and($standard->sequence)->toBe(1)
        ->and($standard->code)->toBe('N0001')
        ->and($standard->client_request_id)->toBe($standardRequestId)
        ->and($priority->status)->toBe(TicketStatus::Waiting)
        ->and($priority->priority)->toBe(TicketPriority::Priority)
        ->and($priority->sequence)->toBe(1)
        ->and($priority->code)->toBe('P0001')
        ->and($priority->client_request_id)->toBe($priorityRequestId);

    expect(TicketEvent::query()->where('type', TicketEventType::Issued)->count())->toBe(2)
        ->and($standard->events()->firstOrFail()->metadata)->toBe(['client_request_id' => $standardRequestId])
        ->and($priority->events()->firstOrFail()->metadata)->toBe(['client_request_id' => $priorityRequestId]);
});

test('it replays an issue request without creating another ticket or consuming sequence', function (): void {
    $requestId = (string) Str::uuid();

    $first = $this->action->execute(
        $this->unit,
        $this->service,
        TicketPriority::Standard,
        $requestId,
    );
    $replayed = $this->action->execute(
        $this->unit,
        $this->service,
        TicketPriority::Standard,
        $requestId,
    );

    expect($replayed->is($first))->toBeTrue()
        ->and(Ticket::query()->count())->toBe(1)
        ->and(TicketEvent::query()->where('type', TicketEventType::Issued)->count())->toBe(1)
        ->and(TicketSequence::query()->sole()->last_value)->toBe(1);
});

test('it rejects reuse of an issue request id with different input', function (): void {
    $requestId = (string) Str::uuid();

    $this->action->execute(
        $this->unit,
        $this->service,
        TicketPriority::Standard,
        $requestId,
    );

    expect(fn (): Ticket => $this->action->execute(
        $this->unit,
        $this->service,
        TicketPriority::Priority,
        $requestId,
    ))->toThrow(DomainConflictException::class, 'A chave de emissão já foi usada com dados diferentes.');

    expect(Ticket::query()->count())->toBe(1);
});

test('it maintains independent daily sequences by unit service and priority', function (): void {
    $this->travelTo(Carbon::parse('2026-07-18 12:00:00', 'UTC'));

    $otherService = Service::factory()->for($this->unit)->create();
    $otherUnit = Unit::factory()->create();
    $otherUnitService = Service::factory()->for($otherUnit)->create();

    $firstStandard = $this->action->execute($this->unit, $this->service, TicketPriority::Standard, (string) Str::uuid());
    $secondStandard = $this->action->execute($this->unit, $this->service, TicketPriority::Standard, (string) Str::uuid());
    $firstPriority = $this->action->execute($this->unit, $this->service, TicketPriority::Priority, (string) Str::uuid());
    $otherServiceFirst = $this->action->execute($this->unit, $otherService, TicketPriority::Standard, (string) Str::uuid());
    $otherUnitFirst = $this->action->execute($otherUnit, $otherUnitService, TicketPriority::Standard, (string) Str::uuid());

    $this->travelTo(Carbon::parse('2026-07-19 12:00:00', 'UTC'));
    $nextDayFirst = $this->action->execute($this->unit, $this->service, TicketPriority::Standard, (string) Str::uuid());

    expect($firstStandard->sequence)->toBe(1)
        ->and($secondStandard->sequence)->toBe(2)
        ->and($firstPriority->sequence)->toBe(1)
        ->and($otherServiceFirst->sequence)->toBe(1)
        ->and($otherUnitFirst->sequence)->toBe(1)
        ->and($nextDayFirst->sequence)->toBe(1)
        ->and(TicketSequence::query()->count())->toBe(5);
});
