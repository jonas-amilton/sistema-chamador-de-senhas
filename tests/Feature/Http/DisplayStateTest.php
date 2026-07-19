<?php

declare(strict_types=1);

use App\Enums\TicketEventType;
use App\Models\Counter;
use App\Models\Service;
use App\Models\Ticket;
use App\Models\TicketEvent;
use App\Models\Unit;
use App\Models\User;

test('display state returns the current and recent calls in descending order without actor data', function (): void {
    $unit = Unit::factory()->create();
    $service = Service::factory()->for($unit)->create();
    $counter = Counter::factory()->for($unit)->create();
    $actor = User::factory()->for($unit)->create([
        'email' => 'private-actor@example.com',
    ]);
    $baseTime = now()->startOfMinute();
    $events = [];

    foreach (range(0, 6) as $index) {
        $ticket = Ticket::factory()->called()->create([
            'unit_id' => $unit->id,
            'service_id' => $service->id,
            'counter_id' => $counter->id,
            'called_by_user_id' => $actor->id,
            'sequence' => $index + 1,
            'code' => sprintf('N%04d', $index + 1),
        ]);
        $events[] = TicketEvent::factory()->create([
            'ticket_id' => $ticket->id,
            'type' => $index % 2 === 0 ? TicketEventType::Called : TicketEventType::Recalled,
            'actor_user_id' => $actor->id,
            'counter_id' => $counter->id,
            'occurred_at' => $baseTime->subMinutes($index),
        ]);
    }

    $response = $this->getJson(route('display.state', $unit));

    $response
        ->assertOk()
        ->assertJsonPath('current.event_id', $events[0]->id)
        ->assertJsonCount(5, 'recent');

    expect(collect($response->json('recent'))->pluck('event_id')->all())
        ->toBe(collect($events)->slice(1, 5)->pluck('id')->all())
        ->and($response->getContent())
        ->not->toContain($actor->email)
        ->not->toContain('actor_user_id')
        ->not->toContain('"actor"');
});
