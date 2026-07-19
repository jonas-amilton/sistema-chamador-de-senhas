<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\TicketPriority;
use App\Enums\TicketStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\DashboardRequest;
use App\Models\Counter;
use App\Models\Service;
use App\Models\Ticket;
use App\Models\Unit;
use App\Models\User;
use App\Support\TicketData;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

final class AdminDashboardController extends Controller
{
    public function __invoke(DashboardRequest $request): Response
    {
        $filters = $request->validated();
        $selectedUnit = Unit::query()
            ->when($filters['unit_id'] ?? null, fn (Builder $query, string $id) => $query->whereKey($id))
            ->orderBy('name')
            ->first();
        $businessDate = $selectedUnit === null
            ? now()->toDateString()
            : now()->setTimezone($selectedUnit->timezone)->toDateString();

        $tickets = Ticket::query()
            ->with(['service:id,name', 'counter:id,name,code'])
            ->when($filters['unit_id'] ?? null, fn (Builder $query, string $value) => $query->where('unit_id', $value))
            ->when($filters['service_id'] ?? null, fn (Builder $query, string $value) => $query->where('service_id', $value))
            ->when($filters['counter_id'] ?? null, fn (Builder $query, string $value) => $query->where('counter_id', $value))
            ->when($filters['status'] ?? null, fn (Builder $query, string $value) => $query->where('status', $value))
            ->when($filters['priority'] ?? null, fn (Builder $query, string $value) => $query->where('priority', $value))
            ->when($filters['from'] ?? null, fn (Builder $query, string $value) => $query->whereDate('business_date', '>=', $value))
            ->when($filters['to'] ?? null, fn (Builder $query, string $value) => $query->whereDate('business_date', '<=', $value))
            ->latest('issued_at')
            ->paginate((int) ($filters['per_page'] ?? 25))
            ->withQueryString()
            ->through(fn (Ticket $ticket): array => TicketData::make($ticket));

        return Inertia::render('admin/index', [
            'metrics' => $selectedUnit === null ? $this->emptyMetrics() : $this->metrics($selectedUnit, $businessDate),
            'units' => Unit::query()->orderBy('name')->get(['id', 'name', 'slug', 'timezone', 'is_active']),
            'services' => Service::query()->with('unit:id,name')->orderBy('name')->get(),
            'counters' => Counter::query()->with(['unit:id,name', 'services:id,name'])->orderBy('name')->get(),
            'users' => User::query()->with('unit:id,name')->orderBy('name')->get(['id', 'unit_id', 'name', 'email', 'role', 'is_active']),
            'tickets' => $tickets,
            'filters' => $filters,
            'selectedBusinessDate' => $businessDate,
            'statusOptions' => collect(TicketStatus::cases())->map(fn (TicketStatus $status): array => ['value' => $status->value, 'label' => $status->label()]),
            'priorityOptions' => collect(TicketPriority::cases())->map(fn (TicketPriority $priority): array => ['value' => $priority->value, 'label' => $priority->label()]),
        ]);
    }

    /** @return array<string, int|float|null> */
    private function metrics(Unit $unit, string $businessDate): array
    {
        $base = DB::table('tickets')->where('unit_id', $unit->id)->whereDate('business_date', $businessDate);
        $counts = (clone $base)->selectRaw(
            'SUM(CASE WHEN status = ? AND priority = ? THEN 1 ELSE 0 END) as waiting_standard,
             SUM(CASE WHEN status = ? AND priority = ? THEN 1 ELSE 0 END) as waiting_priority,
             SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as serving,
             SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as completed,
             SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as no_show',
            [
                TicketStatus::Waiting->value, TicketPriority::Standard->value,
                TicketStatus::Waiting->value, TicketPriority::Priority->value,
                TicketStatus::Serving->value, TicketStatus::Completed->value, TicketStatus::NoShow->value,
            ],
        )->first();

        $driver = DB::connection()->getDriverName();
        $waitExpression = $driver === 'sqlite'
            ? '(julianday(called_at) - julianday(issued_at)) * 86400'
            : 'TIMESTAMPDIFF(SECOND, issued_at, called_at)';
        $serviceExpression = $driver === 'sqlite'
            ? '(julianday(completed_at) - julianday(service_started_at)) * 86400'
            : 'TIMESTAMPDIFF(SECOND, service_started_at, completed_at)';

        $averageWait = (clone $base)
            ->whereNotNull('called_at')
            ->selectRaw("AVG({$waitExpression}) as average")
            ->first()?->average;
        $averageService = (clone $base)
            ->whereNotNull('completed_at')
            ->selectRaw("AVG({$serviceExpression}) as average")
            ->first()?->average;

        return [
            'waiting_standard' => (int) ($counts->waiting_standard ?? 0),
            'waiting_priority' => (int) ($counts->waiting_priority ?? 0),
            'serving' => (int) ($counts->serving ?? 0),
            'completed' => (int) ($counts->completed ?? 0),
            'no_show' => (int) ($counts->no_show ?? 0),
            'average_wait_seconds' => (float) ($averageWait ?? 0),
            'average_service_seconds' => (float) ($averageService ?? 0),
        ];
    }

    /** @return array<string, int> */
    private function emptyMetrics(): array
    {
        return [
            'waiting_standard' => 0,
            'waiting_priority' => 0,
            'serving' => 0,
            'completed' => 0,
            'no_show' => 0,
            'average_wait_seconds' => 0,
            'average_service_seconds' => 0,
        ];
    }
}
