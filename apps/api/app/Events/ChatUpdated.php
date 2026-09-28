<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * "The chat changed, fetch it again." Carries no messages, so nothing per-viewer
 * (whose message is whose) and no participant ids travel over the public channel.
 */
class ChatUpdated implements ShouldBroadcastNow
{
    use Dispatchable;

    public function broadcastOn(): array
    {
        return [new Channel('chat')];
    }

    public function broadcastAs(): string
    {
        return 'chat.updated';
    }

    public function broadcastWith(): array
    {
        return ['at' => now()->toIso8601String()];
    }
}
