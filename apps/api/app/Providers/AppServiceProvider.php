<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

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
        // Rerolls are cheap reads, but a whole classroom may share one IP.
        RateLimiter::for('suggest', fn (Request $request) => Limit::perMinute(600)->by($request->ip()));
        RateLimiter::for('join', fn (Request $request) => Limit::perMinute(config('dojo.join_per_minute'))->by($request->ip()));

        // Keyed by participant, not IP, so a classroom behind one NAT isn't throttled as one user.
        RateLimiter::for('participant', fn (Request $request) => Limit::perMinute(120)->by('p:'.$request->route('id')));
        RateLimiter::for('quiz', fn (Request $request) => Limit::perMinute(20)->by('q:'.$request->route('id')));
    }
}
