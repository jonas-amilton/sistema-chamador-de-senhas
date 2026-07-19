<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Exceptions\DomainConflictException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UserRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Arr;

final class UserController extends Controller
{
    public function store(UserRequest $request): RedirectResponse
    {
        $data = $this->normalized($request->validated());
        User::query()->create([...$data, 'is_active' => $request->boolean('is_active', true), 'email_verified_at' => now()]);

        return back()->with('success', 'Usuário criado com sucesso.');
    }

    public function update(UserRequest $request, User $user): RedirectResponse
    {
        $data = $this->normalized($request->validated());

        if (($data['password'] ?? null) === null) {
            unset($data['password']);
        }

        $user->update($data);

        return back()->with('success', 'Usuário atualizado com sucesso.');
    }

    public function destroy(User $user): RedirectResponse
    {
        if ($user->is(auth()->user())) {
            throw new DomainConflictException('Você não pode desativar o próprio usuário.');
        }

        $user->update(['is_active' => false]);

        return back()->with('success', 'Usuário desativado.');
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function normalized(array $data): array
    {
        if ($data['role'] === UserRole::Admin->value) {
            $data['unit_id'] = null;
        }

        return Arr::only($data, ['name', 'email', 'password', 'role', 'unit_id', 'is_active']);
    }
}
