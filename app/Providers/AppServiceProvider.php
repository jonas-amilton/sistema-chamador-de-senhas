<?php

declare(strict_types=1);

namespace App\Providers;

use App\Models\Unit;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\DevCommands;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();

        Gate::define('admin', fn (User $user): bool => $user->is_active && $user->isAdmin());
        Gate::define('operate-queues', fn (User $user): bool => $user->is_active);

        RateLimiter::for('kiosk', function (Request $request): Limit {
            $routeUnit = $request->route('unit');
            $unitId = $routeUnit instanceof Unit ? $routeUnit->id : (string) $routeUnit;

            return Limit::perMinute(max(1, (int) config('queue_system.kiosk_rate_limit')))
                ->by(($unitId ?: 'unknown').'|'.$request->ip());
        });

        DevCommands::artisan('queue:listen --tries=3 --timeout=0', 'queue');
        DevCommands::artisan('reverb:start', 'reverb');
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
