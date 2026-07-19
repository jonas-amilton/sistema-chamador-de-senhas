<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\QueueCommandType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $request_id
 * @property QueueCommandType $command
 * @property int $actor_user_id
 * @property string $unit_id
 * @property string|null $service_id
 * @property string|null $counter_id
 * @property string|null $ticket_id
 * @property string $payload_hash
 * @property array{ticket_id: string|null, empty: bool}|null $result
 */
#[Fillable([
    'request_id', 'command', 'actor_user_id', 'unit_id', 'service_id', 'counter_id',
    'ticket_id', 'payload_hash', 'result',
])]
class QueueCommand extends Model
{
    use HasUlids;

    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'command' => QueueCommandType::class,
            'result' => 'array',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id');
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

    /** @return BelongsTo<Ticket, $this> */
    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }
}
