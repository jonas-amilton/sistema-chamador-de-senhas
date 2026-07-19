<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $service_id
 * @property int $consecutive_priority_calls
 */
#[Fillable(['service_id', 'consecutive_priority_calls'])]
class QueueState extends Model
{
    public $incrementing = false;

    protected $primaryKey = 'service_id';

    protected $keyType = 'string';

    protected function casts(): array
    {
        return ['consecutive_priority_calls' => 'integer'];
    }

    /** @return BelongsTo<Service, $this> */
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }
}
