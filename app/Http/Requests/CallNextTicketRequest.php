<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class CallNextTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('operate-queues') === true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'counter_id' => ['required', 'ulid', Rule::exists('counters', 'id')],
            'service_id' => ['required', 'ulid', Rule::exists('services', 'id')],
            'request_id' => ['required', 'uuid'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'counter_id.required' => 'Selecione um guichê.',
            'service_id.required' => 'Selecione um serviço.',
            'request_id.required' => 'A chave da operação é obrigatória.',
            'request_id.uuid' => 'A chave da operação é inválida.',
        ];
    }
}
