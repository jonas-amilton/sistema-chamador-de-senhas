<?php

declare(strict_types=1);

use App\Enums\TicketStatus;
use App\Models\Counter;
use App\Models\Service;
use App\Models\Ticket;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Support\Str;

test('ticket transition endpoints return 409 when the current state is invalid', function (string $routeName, TicketStatus $status): void {
    $unit = Unit::factory()->create();
    $service = Service::factory()->for($unit)->create();
    $counter = Counter::factory()->for($unit)->create();
    $attendant = User::factory()->for($unit)->create();
    $wasCalled = $status !== TicketStatus::Waiting;
    $ticket = Ticket::factory()->create([
        'unit_id' => $unit->id,
        'service_id' => $service->id,
        'counter_id' => $wasCalled ? $counter->id : null,
        'called_by_user_id' => $wasCalled ? $attendant->id : null,
        'status' => $status,
        'called_at' => $wasCalled ? now()->subMinutes(3) : null,
        'last_called_at' => $wasCalled ? now()->subMinutes(3) : null,
        'service_started_at' => in_array($status, [TicketStatus::Serving, TicketStatus::Completed], true)
            ? now()->subMinutes(2)
            : null,
        'completed_at' => $status === TicketStatus::Completed ? now()->subMinute() : null,
    ]);

    $this->actingAs($attendant)
        ->postJson(route($routeName, $ticket), [
            'counter_id' => $counter->id,
            'request_id' => (string) Str::uuid(),
        ])
        ->assertStatus(409)
        ->assertJsonPath('message', 'A operação não é permitida no estado atual da senha.');

    expect($ticket->fresh()->status)->toBe($status);
})->with([
    'recall while waiting' => ['attendant.tickets.recall', TicketStatus::Waiting],
    'start while waiting' => ['attendant.tickets.start', TicketStatus::Waiting],
    'complete while called' => ['attendant.tickets.complete', TicketStatus::Called],
    'no show while serving' => ['attendant.tickets.no-show', TicketStatus::Serving],
    'requeue while waiting' => ['attendant.tickets.requeue', TicketStatus::Waiting],
    'cancel after completion' => ['attendant.tickets.cancel', TicketStatus::Completed],
]);
