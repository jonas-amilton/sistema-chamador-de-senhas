<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\TicketPriority;
use App\Enums\TicketStatus;
use Database\Factories\TicketFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $unit_id
 * @property string $service_id
 * @property string|null $counter_id
 * @property int|null $called_by_user_id
 * @property TicketPriority $priority
 * @property TicketStatus $status
 * @property Carbon $business_date
 * @property int $sequence
 * @property string $code
 * @property string $client_request_id
 * @property Carbon $issued_at
 * @property Carbon|null $called_at
 * @property Carbon|null $last_called_at
 * @property Carbon|null $service_started_at
 * @property Carbon|null $completed_at
 * @property Carbon|null $no_show_at
 * @property Carbon|null $cancelled_at
 * @property-read Service $service
 * @property-read Counter|null $counter
 * @property-read Collection<int, TicketEvent> $events
 */
#[Fillable([
    'unit_id', 'service_id', 'counter_id', 'called_by_user_id', 'priority', 'status',
    'business_date', 'sequence', 'code', 'client_request_id', 'issued_at', 'called_at',
    'last_called_at', 'service_started_at', 'completed_at', 'no_show_at', 'cancelled_at',
])]
class Ticket extends Model
{
    /** @use HasFactory<TicketFactory> */
    use HasFactory, HasUlids;

    protected function casts(): array
    {
        return [
            'priority' => TicketPriority::class,
            'status' => TicketStatus::class,
            'business_date' => 'date:Y-m-d',
            'sequence' => 'integer',
            'issued_at' => 'immutable_datetime',
            'called_at' => 'immutable_datetime',
            'last_called_at' => 'immutable_datetime',
            'service_started_at' => 'immutable_datetime',
            'completed_at' => 'immutable_datetime',
            'no_show_at' => 'immutable_datetime',
            'cancelled_at' => 'immutable_datetime',
        ];
    }

    /** @return BelongsTo<Unit, $this> */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    /** @return BelongsTo<Service, $this> */
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    /** @return BelongsTo<Counter, $this> */
    public function counter(): BelongsTo
    {
        return $this->belongsTo(Counter::class);
    }

    /** @return BelongsTo<User, $this> */
    public function calledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'called_by_user_id');
    }

    /** @return HasMany<TicketEvent, $this> */
    public function events(): HasMany
    {
        return $this->hasMany(TicketEvent::class)->orderBy('occurred_at');
    }

    /** @param Builder<Ticket> $query */
    public function scopeWaiting(Builder $query): void
    {
        $query->where('status', TicketStatus::Waiting);
    }

    /** @param Builder<Ticket> $query */
    public function scopeActiveAtCounter(Builder $query, string $counterId): void
    {
        $query->where('counter_id', $counterId)
            ->whereIn('status', [TicketStatus::Called, TicketStatus::Serving]);
    }
}
