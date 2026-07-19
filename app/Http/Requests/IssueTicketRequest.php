<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\TicketPriority;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class IssueTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'service_id' => ['required', 'string', 'ulid', Rule::exists('services', 'id')],
            'priority' => ['required', Rule::enum(TicketPriority::class)],
            'client_request_id' => ['required', 'uuid'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'service_id.required' => 'Selecione um serviço.',
            'service_id.exists' => 'O serviço selecionado não existe.',
            'priority.required' => 'Selecione o tipo de atendimento.',
            'client_request_id.required' => 'A chave da emissão é obrigatória.',
            'client_request_id.uuid' => 'A chave da emissão é inválida.',
        ];
    }
}
