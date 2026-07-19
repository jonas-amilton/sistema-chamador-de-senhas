<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

final class UserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('admin') === true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $user = $this->route('user');
        $userId = $user instanceof User ? $user->id : null;
        $creating = $this->isMethod('post');

        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($userId)],
            'password' => [$creating ? 'required' : 'nullable', Password::defaults()],
            'role' => ['required', Rule::enum(UserRole::class)],
            'unit_id' => [
                Rule::requiredIf($this->input('role') === UserRole::Attendant->value),
                'nullable', 'ulid', Rule::exists('units', 'id'),
            ],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
