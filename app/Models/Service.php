<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ServiceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property string $id
 * @property string $unit_id
 * @property string $name
 * @property string $slug
 * @property string $standard_prefix
 * @property string $priority_prefix
 * @property int $priority_streak_limit
 * @property bool $is_active
 */
#[Fillable(['unit_id', 'name', 'slug', 'standard_prefix', 'priority_prefix', 'priority_streak_limit', 'is_active'])]
class Service extends Model
{
    /** @use HasFactory<ServiceFactory> */
    use HasFactory, HasUlids;

    protected function casts(): array
    {
        return [
            'priority_streak_limit' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /** @return BelongsTo<Unit, $this> */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    /** @return BelongsToMany<Counter, $this> */
    public function counters(): BelongsToMany
    {
        return $this->belongsToMany(Counter::class);
    }

    /** @return HasMany<Ticket, $this> */
    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    /** @return HasOne<QueueState, $this> */
    public function queueState(): HasOne
    {
        return $this->hasOne(QueueState::class);
    }

    /** @param Builder<Service> $query */
    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }
}
