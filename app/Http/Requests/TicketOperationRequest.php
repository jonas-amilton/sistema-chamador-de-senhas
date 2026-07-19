<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Ticket;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class TicketOperationRequest extends FormRequest
{
    public function authorize(): bool
    {
        $ticket = $this->route('ticket');

        return $ticket instanceof Ticket && $this->user()?->can('operate', $ticket) === true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'counter_id' => ['nullable', 'ulid', Rule::exists('counters', 'id')],
            'request_id' => ['required', 'uuid'],
        ];
    }
}
