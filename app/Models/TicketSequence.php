<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\TicketPriority;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $unit_id
 * @property string $service_id
 * @property Carbon $business_date
 * @property TicketPriority $priority
 * @property int $last_value
 */
#[Fillable(['unit_id', 'service_id', 'business_date', 'priority', 'last_value'])]
class TicketSequence extends Model
{
    use HasUlids;

    protected function casts(): array
    {
        return [
            'business_date' => 'date:Y-m-d',
            'priority' => TicketPriority::class,
            'last_value' => 'integer',
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
}
