<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\TicketPriority;
use App\Enums\TicketStatus;
use App\Models\Ticket;
use App\Models\Unit;
use App\Models\User;
use App\Support\TicketData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

final class AttendantController extends Controller
{
    public function index(Request $request): Response
    {
        $unit = $this->resolveUnit($request);

        return Inertia::render('attendant/index', [
            ...$this->stateData($unit),
            'availableUnits' => $request->user()->isAdmin()
                ? Unit::query()->active()->orderBy('name')->get(['id', 'name'])
                : [],
        ]);
    }

    public function state(Request $request): JsonResponse
    {
        return response()->json($this->stateData($this->resolveUnit($request)));
    }

    private function resolveUnit(Request $request): Unit
    {
        /** @var User $user */
        $user = $request->user();
        $requestedId = $request->string('unit_id')->toString();

        if (! $user->isAdmin()) {
            return Unit::query()->active()->findOrFail($user->unit_id);
        }

        return Unit::query()->active()
            ->when($requestedId !== '', fn ($query) => $query->whereKey($requestedId))
            ->orderBy('name')
            ->firstOrFail();
    }

    /** @return array<string, mixed> */
    private function stateData(Unit $unit): array
    {
        $counters = $unit->counters()
            ->where('is_active', true)
            ->with(['services' => fn ($query) => $query->active()->orderBy('name')])
            ->orderBy('name')
            ->get()
            ->map(fn ($counter): array => [
                'id' => $counter->id,
                'name' => $counter->name,
                'code' => $counter->code,
                'services' => $counter->services->map->only(['id', 'name'])->values(),
            ]);

        $counts = DB::table('tickets')
            ->where('unit_id', $unit->id)
            ->where('status', TicketStatus::Waiting)
            ->selectRaw('service_id, priority, COUNT(*) as total')
            ->groupBy('service_id', 'priority')
            ->get()
            ->groupBy('service_id')
            ->map(function ($rows): array {
                $standard = $rows->firstWhere('priority', TicketPriority::Standard->value);
                $priority = $rows->firstWhere('priority', TicketPriority::Priority->value);

                return [
                    'standard' => is_object($standard) ? (int) $standard->total : 0,
                    'priority' => is_object($priority) ? (int) $priority->total : 0,
                ];
            });

        $currentTickets = Ticket::query()
            ->where('unit_id', $unit->id)
            ->whereIn('status', [TicketStatus::Called, TicketStatus::Serving, TicketStatus::NoShow])
            ->with(['service:id,name', 'counter:id,name,code'])
            ->orderByRaw("CASE WHEN status IN ('called', 'serving') THEN 0 ELSE 1 END")
            ->latest('updated_at')
            ->get()
            ->unique('counter_id')
            ->map(fn (Ticket $ticket): array => TicketData::make($ticket))
            ->values();

        return [
            'unit' => $unit->only(['id', 'name', 'slug', 'timezone']),
            'counters' => $counters,
            'queueCounts' => $counts,
            'currentTickets' => $currentTickets,
        ];
    }
}
