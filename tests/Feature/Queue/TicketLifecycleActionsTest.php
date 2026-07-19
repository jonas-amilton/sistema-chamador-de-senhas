<?php

declare(strict_types=1);

use App\Actions\CancelTicketAction;
use App\Actions\CompleteTicketAction;
use App\Actions\MarkTicketNoShowAction;
use App\Actions\RecallTicketAction;
use App\Actions\RequeueTicketAction;
use App\Actions\StartTicketServiceAction;
use App\Enums\TicketEventType;
use App\Enums\TicketStatus;
use App\Exceptions\DomainConflictException;
use App\Models\Counter;
use App\Models\Service;
use App\Models\Ticket;
use App\Models\TicketEvent;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Str;

beforeEach(function (): void {
    $this->unit = Unit::factory()->create();
    $this->service = Service::factory()->for($this->unit)->create();
    $this->counter = Counter::factory()->for($this->unit)->create();
    $this->counter->services()->attach($this->service);
    $this->actor = User::factory()->for($this->unit)->create();
    $this->admin = User::factory()->admin()->create();
});

test('it recalls a called ticket without changing its status', function (): void {
    $previousCall = now()->subMinute();
    $ticket = Ticket::factory()->called()->create([
        'unit_id' => $this->unit->id,
        'service_id' => $this->service->id,
        'counter_id' => $this->counter->id,
        'called_by_user_id' => $this->actor->id,
        'last_called_at' => $previousCall,
    ]);

    $result = app(RecallTicketAction::class)->execute(
        $this->actor,
        $ticket,
        $this->counter,
        (string) Str::uuid(),
    );

    expect($result->status)->toBe(TicketStatus::Called)
        ->and($result->last_called_at?->greaterThan($previousCall))->toBeTrue();

    $this->assertDatabaseHas('ticket_events', [
        'ticket_id' => $ticket->id,
        'type' => TicketEventType::Recalled->value,
        'actor_user_id' => $this->actor->id,
        'counter_id' => $this->counter->id,
    ]);
});

test('it starts service for a called ticket', function (): void {
    $ticket = Ticket::factory()->called()->create([
        'unit_id' => $this->unit->id,
        'service_id' => $this->service->id,
        'counter_id' => $this->counter->id,
        'called_by_user_id' => $this->actor->id,
    ]);

    $result = app(StartTicketServiceAction::class)->execute(
        $this->actor,
        $ticket,
        $this->counter,
        (string) Str::uuid(),
    );

    expect($result->status)->toBe(TicketStatus::Serving)
        ->and($result->service_started_at)->not->toBeNull();

    $this->assertDatabaseHas('ticket_events', [
        'ticket_id' => $ticket->id,
        'type' => TicketEventType::ServiceStarted->value,
    ]);
});

test('it completes a ticket in service', function (): void {
    $ticket = Ticket::factory()->serving()->create([
        'unit_id' => $this->unit->id,
        'service_id' => $this->service->id,
        'counter_id' => $this->counter->id,
        'called_by_user_id' => $this->actor->id,
    ]);

    $result = app(CompleteTicketAction::class)->execute(
        $this->actor,
        $ticket,
        $this->counter,
        (string) Str::uuid(),
    );

    expect($result->status)->toBe(TicketStatus::Completed)
        ->and($result->completed_at)->not->toBeNull();

    $this->assertDatabaseHas('ticket_events', [
        'ticket_id' => $ticket->id,
        'type' => TicketEventType::Completed->value,
    ]);
});

test('it marks a called ticket as no show', function (): void {
    $ticket = Ticket::factory()->called()->create([
        'unit_id' => $this->unit->id,
        'service_id' => $this->service->id,
        'counter_id' => $this->counter->id,
        'called_by_user_id' => $this->actor->id,
    ]);

    $result = app(MarkTicketNoShowAction::class)->execute(
        $this->actor,
        $ticket,
        $this->counter,
        (string) Str::uuid(),
    );

    expect($result->status)->toBe(TicketStatus::NoShow)
        ->and($result->no_show_at)->not->toBeNull();

    $this->assertDatabaseHas('ticket_events', [
        'ticket_id' => $ticket->id,
        'type' => TicketEventType::MarkedNoShow->value,
    ]);
});

test('it requeues tickets from every allowed status', function (TicketStatus $status): void {
    $ticket = Ticket::factory()->create([
        'unit_id' => $this->unit->id,
        'service_id' => $this->service->id,
        'counter_id' => $this->counter->id,
        'called_by_user_id' => $this->actor->id,
        'status' => $status,
        'called_at' => now()->subMinute(),
        'last_called_at' => now()->subMinute(),
        'no_show_at' => $status === TicketStatus::NoShow ? now() : null,
    ]);

    $result = app(RequeueTicketAction::class)->execute(
        $this->actor,
        $ticket,
        $this->counter,
        (string) Str::uuid(),
    );

    expect($result->status)->toBe(TicketStatus::Waiting)
        ->and($result->counter_id)->toBeNull()
        ->and($result->called_by_user_id)->toBeNull()
        ->and($result->called_at)->toBeNull()
        ->and($result->service_started_at)->toBeNull();

    $event = TicketEvent::query()
        ->where('ticket_id', $ticket->id)
        ->where('type', TicketEventType::Requeued)
        ->sole();

    expect($event->metadata)->toBe(['previous_status' => $status->value]);
})->with([
    'called' => TicketStatus::Called,
    'no show' => TicketStatus::NoShow,
]);

test('it cancels tickets from every allowed status', function (TicketStatus $status): void {
    $isWaiting = $status === TicketStatus::Waiting;
    $actor = $isWaiting ? $this->admin : $this->actor;
    $counter = $isWaiting ? null : $this->counter;
    $ticket = Ticket::factory()->create([
        'unit_id' => $this->unit->id,
        'service_id' => $this->service->id,
        'counter_id' => $counter?->id,
        'called_by_user_id' => $counter === null ? null : $this->actor->id,
        'status' => $status,
        'called_at' => $counter === null ? null : now()->subMinutes(2),
        'last_called_at' => $counter === null ? null : now()->subMinutes(2),
        'service_started_at' => $status === TicketStatus::Serving ? now()->subMinute() : null,
        'no_show_at' => $status === TicketStatus::NoShow ? now()->subMinute() : null,
    ]);

    $result = app(CancelTicketAction::class)->execute(
        $actor,
        $ticket,
        $counter,
        (string) Str::uuid(),
    );

    expect($result->status)->toBe(TicketStatus::Cancelled)
        ->and($result->cancelled_at)->not->toBeNull();

    $event = TicketEvent::query()
        ->where('ticket_id', $ticket->id)
        ->where('type', TicketEventType::Cancelled)
        ->sole();

    expect($event->metadata)->toBe(['previous_status' => $status->value]);
})->with([
    'waiting' => TicketStatus::Waiting,
    'called' => TicketStatus::Called,
    'serving' => TicketStatus::Serving,
    'no show' => TicketStatus::NoShow,
]);

test('it rejects invalid ticket status transitions', function (string $actionClass, TicketStatus $status): void {
    $ticket = Ticket::factory()->create([
        'unit_id' => $this->unit->id,
        'service_id' => $this->service->id,
        'counter_id' => $this->counter->id,
        'called_by_user_id' => $this->actor->id,
        'status' => $status,
    ]);

    expect(fn (): Ticket => app($actionClass)->execute(
        $this->actor,
        $ticket,
        $this->counter,
        (string) Str::uuid(),
    ))->toThrow(DomainConflictException::class, 'A operação não é permitida no estado atual da senha.');

    expect($ticket->fresh()->status)->toBe($status)
        ->and(TicketEvent::query()->where('ticket_id', $ticket->id)->count())->toBe(0);
})->with([
    'recall while waiting' => [RecallTicketAction::class, TicketStatus::Waiting],
    'start while waiting' => [StartTicketServiceAction::class, TicketStatus::Waiting],
    'complete while called' => [CompleteTicketAction::class, TicketStatus::Called],
    'mark no show while serving' => [MarkTicketNoShowAction::class, TicketStatus::Serving],
    'requeue while waiting' => [RequeueTicketAction::class, TicketStatus::Waiting],
    'cancel after completion' => [CancelTicketAction::class, TicketStatus::Completed],
    'cancel after cancellation' => [CancelTicketAction::class, TicketStatus::Cancelled],
]);

test('it prevents an attendant from cancelling a waiting ticket', function (): void {
    $ticket = Ticket::factory()->create([
        'unit_id' => $this->unit->id,
        'service_id' => $this->service->id,
    ]);

    expect(fn (): Ticket => app(CancelTicketAction::class)->execute(
        $this->actor,
        $ticket,
        null,
        (string) Str::uuid(),
    ))->toThrow(AuthorizationException::class, 'Somente administradores podem cancelar senhas aguardando.');

    expect($ticket->fresh()->status)->toBe(TicketStatus::Waiting);
});
