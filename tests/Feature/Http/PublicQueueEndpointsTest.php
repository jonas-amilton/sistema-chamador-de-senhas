<?php

declare(strict_types=1);

use App\Enums\TicketPriority;
use App\Models\Service;
use App\Models\Unit;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

test('guests can access the kiosk and display of an active unit', function (): void {
    $unit = Unit::factory()->create();
    $service = Service::factory()->for($unit)->create();

    $this->get(route('kiosk.show', $unit))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('kiosk/index')
            ->where('unit.id', $unit->id)
            ->has('services', 1)
            ->where('services.0.id', $service->id));

    $this->get(route('display.show', $unit))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('display/index')
            ->where('unit.id', $unit->id)
            ->where('displayState.current', null)
            ->where('displayState.recent', []));

    $this->getJson(route('display.state', $unit))
        ->assertOk()
        ->assertExactJson(['current' => null, 'recent' => []]);

    $this->assertGuest();
});

test('inactive units return 404 on public queue endpoints', function (string $routeName, bool $json): void {
    $unit = Unit::factory()->inactive()->create();

    $response = $json
        ? $this->getJson(route($routeName, $unit))
        : $this->get(route($routeName, $unit));

    $response->assertNotFound();
})->with([
    'kiosk' => ['kiosk.show', false],
    'display' => ['display.show', false],
    'display state' => ['display.state', true],
]);

test('a guest can issue a ticket and receives its JSON representation', function (): void {
    $unit = Unit::factory()->create();
    $service = Service::factory()->for($unit)->create([
        'priority_prefix' => 'P',
    ]);
    $requestId = (string) Str::uuid();

    $response = $this->postJson(route('kiosk.tickets.store', $unit), [
        'service_id' => $service->id,
        'priority' => TicketPriority::Priority->value,
        'client_request_id' => $requestId,
    ]);

    $response
        ->assertCreated()
        ->assertJsonPath('message', 'Senha emitida com sucesso.')
        ->assertJsonPath('ticket.unit_id', $unit->id)
        ->assertJsonPath('ticket.service.id', $service->id)
        ->assertJsonPath('ticket.priority', TicketPriority::Priority->value)
        ->assertJsonPath('ticket.status', 'waiting')
        ->assertJsonPath('ticket.code', 'P0001')
        ->assertJsonPath('receipt_url', route('kiosk.receipt', [$unit, $response->json('ticket.id')]));

    $this->assertDatabaseHas('tickets', [
        'id' => $response->json('ticket.id'),
        'unit_id' => $unit->id,
        'service_id' => $service->id,
        'client_request_id' => $requestId,
    ]);
});

test('ticket issuance returns 422 for invalid input', function (): void {
    $unit = Unit::factory()->create();

    $this->postJson(route('kiosk.tickets.store', $unit), [
        'service_id' => 'invalid-service',
        'priority' => 'vip',
        'client_request_id' => 'invalid-request-id',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['service_id', 'priority', 'client_request_id']);
});
