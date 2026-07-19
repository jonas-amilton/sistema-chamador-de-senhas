<?php

declare(strict_types=1);

use App\Enums\TicketStatus;
use App\Models\Counter;
use App\Models\Service;
use App\Models\Ticket;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Support\Str;

test('a guest cannot call a ticket', function (): void {
    $unit = Unit::factory()->create();
    $service = Service::factory()->for($unit)->create();
    $counter = Counter::factory()->for($unit)->create();
    $counter->services()->attach($service);
    $ticket = Ticket::factory()->create([
        'unit_id' => $unit->id,
        'service_id' => $service->id,
    ]);

    $this->postJson(route('attendant.call-next'), [
        'counter_id' => $counter->id,
        'service_id' => $service->id,
        'request_id' => (string) Str::uuid(),
    ])->assertUnauthorized();

    expect($ticket->fresh()->status)->toBe(TicketStatus::Waiting);
});

test('an attendant cannot access the admin dashboard', function (): void {
    $unit = Unit::factory()->create();
    $attendant = User::factory()->for($unit)->create();

    $this->actingAs($attendant)
        ->get(route('admin.dashboard'))
        ->assertForbidden();
});

test('an attendant cannot operate a queue from another unit', function (): void {
    $attendantUnit = Unit::factory()->create();
    $otherUnit = Unit::factory()->create();
    $attendant = User::factory()->for($attendantUnit)->create();
    $service = Service::factory()->for($otherUnit)->create();
    $counter = Counter::factory()->for($otherUnit)->create();
    $counter->services()->attach($service);
    $ticket = Ticket::factory()->create([
        'unit_id' => $otherUnit->id,
        'service_id' => $service->id,
    ]);

    $this->actingAs($attendant)
        ->postJson(route('attendant.call-next'), [
            'counter_id' => $counter->id,
            'service_id' => $service->id,
            'request_id' => (string) Str::uuid(),
        ])
        ->assertForbidden();

    expect($ticket->fresh()->status)->toBe(TicketStatus::Waiting);
});

test('an inactive user cannot log in', function (): void {
    $user = User::factory()->inactive()->create();

    $this->from(route('login'))
        ->post(route('login.store'), [
            'email' => $user->email,
            'password' => 'password',
        ])
        ->assertRedirect(route('login'))
        ->assertSessionHasErrors('email');

    $this->assertGuest();
});

test('an existing session is blocked after its user is deactivated', function (): void {
    $user = User::factory()->create();
    $this->actingAs($user);
    $user->update(['is_active' => false]);

    $this->get(route('attendant.index'))
        ->assertRedirect(route('login'))
        ->assertSessionHasErrors([
            'email' => 'Este usuário está inativo.',
        ]);

    $this->assertGuest();
});
