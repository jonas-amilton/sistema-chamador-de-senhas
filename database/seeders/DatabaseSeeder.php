<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Counter;
use App\Models\QueueState;
use App\Models\Service;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $unit = Unit::query()->updateOrCreate(
            ['slug' => 'unidade-principal'],
            [
                'name' => 'Unidade Principal',
                'timezone' => 'America/Sao_Paulo',
                'is_active' => true,
            ],
        );

        $service = Service::query()->updateOrCreate(
            ['unit_id' => $unit->id, 'slug' => 'atendimento-geral'],
            [
                'name' => 'Atendimento Geral',
                'standard_prefix' => 'N',
                'priority_prefix' => 'P',
                'priority_streak_limit' => 2,
                'is_active' => true,
            ],
        );

        foreach ([1, 2] as $number) {
            $counter = Counter::query()->updateOrCreate(
                ['unit_id' => $unit->id, 'code' => sprintf('G%02d', $number)],
                ['name' => "Guichê {$number}", 'is_active' => true],
            );

            $counter->services()->syncWithoutDetaching([$service->id]);
        }

        QueueState::query()->firstOrCreate(['service_id' => $service->id]);

        if (! app()->environment(['local', 'testing'])) {
            return;
        }

        User::query()->updateOrCreate(
            ['email' => (string) config('queue_system.seed.admin_email')],
            [
                'name' => (string) config('queue_system.seed.admin_name'),
                'unit_id' => null,
                'password' => (string) config('queue_system.seed.admin_password'),
                'role' => UserRole::Admin,
                'is_active' => true,
                'email_verified_at' => now(),
            ],
        );

        User::query()->updateOrCreate(
            ['email' => (string) config('queue_system.seed.attendant_email')],
            [
                'name' => (string) config('queue_system.seed.attendant_name'),
                'unit_id' => $unit->id,
                'password' => (string) config('queue_system.seed.attendant_password'),
                'role' => UserRole::Attendant,
                'is_active' => true,
                'email_verified_at' => now(),
            ],
        );
    }
}
