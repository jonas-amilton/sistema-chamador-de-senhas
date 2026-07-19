<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\TicketEventType;
use App\Models\TicketEvent;
use App\Models\Unit;
use App\Support\TicketData;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

final class DisplayController extends Controller
{
    public function show(Unit $unit): Response
    {
        abort_unless($unit->is_active, 404);

        return Inertia::render('display/index', [
            'unit' => $unit->only(['id', 'name', 'slug', 'timezone']),
            'displayState' => $this->stateData($unit),
            'pollSeconds' => config('queue_system.display_poll_seconds'),
        ]);
    }

    public function state(Unit $unit): JsonResponse
    {
        abort_unless($unit->is_active, 404);

        return response()->json($this->stateData($unit));
    }

    /** @return array{current: array<string, mixed>|null, recent: list<array<string, mixed>>} */
    private function stateData(Unit $unit): array
    {
        $events = TicketEvent::query()
            ->with(['ticket.service:id,name', 'counter:id,name,code'])
            ->whereIn('type', [TicketEventType::Called, TicketEventType::Recalled])
            ->whereHas('ticket', fn ($query) => $query->where('unit_id', $unit->id))
            ->latest('occurred_at')
            ->latest('id')
            ->limit(6)
            ->get();

        return [
            'current' => $events->first() === null ? null : TicketData::display($events->first()),
            'recent' => array_values($events->slice(1, 5)->map(fn (TicketEvent $event): array => TicketData::display($event))->all()),
        ];
    }
}
