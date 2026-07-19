<?php

declare(strict_types=1);

use App\Enums\UserRole;
use App\Models\Counter;
use App\Models\Service;
use App\Models\Unit;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function (): void {
    $this->admin = User::factory()->admin()->create();
    $this->actingAs($this->admin);
});

test('an admin can access the dashboard', function (): void {
    $unit = Unit::factory()->create();

    $this->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/index')
            ->has('units', 1)
            ->where('units.0.id', $unit->id)
            ->has('metrics')
            ->has('tickets.data'));
});

test('an admin can create update and deactivate a unit', function (): void {
    $this->from(route('admin.dashboard'))
        ->post(route('admin.units.store'), [
            'name' => 'Unidade Centro',
            'slug' => 'unidade-centro',
            'timezone' => 'America/Sao_Paulo',
            'is_active' => true,
        ])
        ->assertRedirect(route('admin.dashboard'));

    $unit = Unit::query()->where('slug', 'unidade-centro')->firstOrFail();

    $this->from(route('admin.dashboard'))
        ->put(route('admin.units.update', $unit), [
            'name' => 'Unidade Central',
            'slug' => 'unidade-central',
            'timezone' => 'America/Fortaleza',
            'is_active' => true,
        ])
        ->assertRedirect(route('admin.dashboard'));

    $this->assertDatabaseHas('units', [
        'id' => $unit->id,
        'name' => 'Unidade Central',
        'slug' => 'unidade-central',
        'timezone' => 'America/Fortaleza',
    ]);

    $unit->refresh();

    $this->from(route('admin.dashboard'))
        ->delete(route('admin.units.destroy', $unit))
        ->assertRedirect(route('admin.dashboard'));

    $this->assertDatabaseHas('units', [
        'id' => $unit->id,
        'is_active' => false,
    ]);
});

test('an admin can create update and deactivate a service', function (): void {
    $unit = Unit::factory()->create();

    $this->from(route('admin.dashboard'))
        ->post(route('admin.services.store'), [
            'unit_id' => $unit->id,
            'name' => 'Atendimento Geral',
            'slug' => 'atendimento-geral',
            'standard_prefix' => 'G',
            'priority_prefix' => 'GP',
            'priority_streak_limit' => 2,
            'is_active' => true,
        ])
        ->assertRedirect(route('admin.dashboard'));

    $service = Service::query()->where('slug', 'atendimento-geral')->firstOrFail();

    $this->from(route('admin.dashboard'))
        ->put(route('admin.services.update', $service), [
            'unit_id' => $unit->id,
            'name' => 'Atendimento Atualizado',
            'slug' => 'atendimento-atualizado',
            'standard_prefix' => 'A',
            'priority_prefix' => 'AP',
            'priority_streak_limit' => 3,
            'is_active' => true,
        ])
        ->assertRedirect(route('admin.dashboard'));

    $this->assertDatabaseHas('services', [
        'id' => $service->id,
        'name' => 'Atendimento Atualizado',
        'slug' => 'atendimento-atualizado',
        'priority_streak_limit' => 3,
    ]);

    $this->from(route('admin.dashboard'))
        ->delete(route('admin.services.destroy', $service))
        ->assertRedirect(route('admin.dashboard'));

    $this->assertDatabaseHas('services', [
        'id' => $service->id,
        'is_active' => false,
    ]);
});

test('an admin can create update and deactivate a counter', function (): void {
    $unit = Unit::factory()->create();
    $firstService = Service::factory()->for($unit)->create();
    $secondService = Service::factory()->for($unit)->create();

    $this->from(route('admin.dashboard'))
        ->post(route('admin.counters.store'), [
            'unit_id' => $unit->id,
            'name' => 'Guichê Principal',
            'code' => 'G01',
            'service_ids' => [$firstService->id],
            'is_active' => true,
        ])
        ->assertRedirect(route('admin.dashboard'));

    $counter = Counter::query()->where('code', 'G01')->firstOrFail();

    $this->assertDatabaseHas('counter_service', [
        'counter_id' => $counter->id,
        'service_id' => $firstService->id,
    ]);

    $this->from(route('admin.dashboard'))
        ->put(route('admin.counters.update', $counter), [
            'unit_id' => $unit->id,
            'name' => 'Guichê Atualizado',
            'code' => 'G02',
            'service_ids' => [$secondService->id],
            'is_active' => true,
        ])
        ->assertRedirect(route('admin.dashboard'));

    $this->assertDatabaseHas('counters', [
        'id' => $counter->id,
        'name' => 'Guichê Atualizado',
        'code' => 'G02',
    ]);
    $this->assertDatabaseMissing('counter_service', [
        'counter_id' => $counter->id,
        'service_id' => $firstService->id,
    ]);
    $this->assertDatabaseHas('counter_service', [
        'counter_id' => $counter->id,
        'service_id' => $secondService->id,
    ]);

    $this->from(route('admin.dashboard'))
        ->delete(route('admin.counters.destroy', $counter))
        ->assertRedirect(route('admin.dashboard'));

    $this->assertDatabaseHas('counters', [
        'id' => $counter->id,
        'is_active' => false,
    ]);
});

test('an admin can create update and deactivate a user', function (): void {
    $unit = Unit::factory()->create();

    $this->from(route('admin.dashboard'))
        ->post(route('admin.users.store'), [
            'name' => 'Atendente HTTP',
            'email' => 'attendant-http@example.com',
            'password' => 'password123',
            'role' => UserRole::Attendant->value,
            'unit_id' => $unit->id,
            'is_active' => true,
        ])
        ->assertRedirect(route('admin.dashboard'));

    $user = User::query()->where('email', 'attendant-http@example.com')->firstOrFail();

    $this->from(route('admin.dashboard'))
        ->put(route('admin.users.update', $user), [
            'name' => 'Atendente Atualizado',
            'email' => 'updated-attendant@example.com',
            'password' => null,
            'role' => UserRole::Attendant->value,
            'unit_id' => $unit->id,
            'is_active' => true,
        ])
        ->assertRedirect(route('admin.dashboard'));

    $this->assertDatabaseHas('users', [
        'id' => $user->id,
        'name' => 'Atendente Atualizado',
        'email' => 'updated-attendant@example.com',
        'unit_id' => $unit->id,
    ]);

    $this->from(route('admin.dashboard'))
        ->delete(route('admin.users.destroy', $user))
        ->assertRedirect(route('admin.dashboard'));

    $this->assertDatabaseHas('users', [
        'id' => $user->id,
        'is_active' => false,
    ]);
});
