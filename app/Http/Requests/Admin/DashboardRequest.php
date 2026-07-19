<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Enums\TicketPriority;
use App\Enums\TicketStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class DashboardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('admin') === true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'unit_id' => ['nullable', 'ulid', Rule::exists('units', 'id')],
            'service_id' => ['nullable', 'ulid', Rule::exists('services', 'id')],
            'counter_id' => ['nullable', 'ulid', Rule::exists('counters', 'id')],
            'status' => ['nullable', Rule::enum(TicketStatus::class)],
            'priority' => ['nullable', Rule::enum(TicketPriority::class)],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'per_page' => ['nullable', 'integer', 'min:10', 'max:'.config('queue_system.admin_per_page_max')],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
