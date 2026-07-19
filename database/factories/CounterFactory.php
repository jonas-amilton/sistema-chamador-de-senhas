<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Counter;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Counter> */
class CounterFactory extends Factory
{
    public function definition(): array
    {
        $number = fake()->unique()->numberBetween(1, 999);

        return [
            'unit_id' => Unit::factory(),
            'name' => "Guichê {$number}",
            'code' => sprintf('G%02d', $number),
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (): array => ['is_active' => false]);
    }
}
