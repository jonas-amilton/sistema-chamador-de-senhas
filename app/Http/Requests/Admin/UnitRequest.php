<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Models\Unit;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UnitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('admin') === true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $unit = $this->route('unit');
        $unitId = $unit instanceof Unit ? $unit->id : null;

        return [
            'name' => ['required', 'string', 'max:120'],
            'slug' => ['required', 'alpha_dash:ascii', 'max:120', Rule::unique('units')->ignore($unitId)],
            'timezone' => ['required', 'timezone:all'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
