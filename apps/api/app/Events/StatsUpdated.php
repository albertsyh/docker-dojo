<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Sent straight to Reverb (ShouldBroadcastNow), so no queue worker is needed.
 */
class StatsUpdated implements ShouldBroadcastNow
{
    use Dispatchable;

    public function __construct(public array $stats) {}

    public function broadcastOn(): array
    {
        return [new Channel('tracker')];
    }

    public function broadcastAs(): string
    {
        return 'stats.updated';
    }

    public function broadcastWith(): array
    {
        return $this->stats;
    }
}
