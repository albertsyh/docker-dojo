<?php

namespace App\Support;

use App\Events\ChatUpdated;
use App\Models\ChatMeToo;
use App\Models\ChatMessage;
use App\Models\Participant;
use Throwable;

/**
 * The questions chat. A participant id works like a password (it is all you need to act
 * as that student), so it never appears in what this returns: authors are shown by
 * display name, and "mine" is worked out here for the one viewer who asked.
 */
class Chat
{
    public const MAX_LENGTH = 500;

    public const HISTORY = 200;

    public static function messages(?string $viewerId = null): array
    {
        $messages = ChatMessage::query()->withCount('meToos')->latest('id')->limit(self::HISTORY)->get()->reverse()->values();
        $mine = $viewerId
            ? ChatMeToo::where('participant_id', $viewerId)->whereIn('message_id', $messages->pluck('id'))->pluck('message_id')->flip()
            : collect();

        return $messages->map(fn (ChatMessage $m) => [
            'id' => $m->id,
            'author' => Participant::displayName($m->participant_id),
            'body' => $m->body,
            'exercise' => $m->exercise_id,
            'createdAt' => $m->created_at->toIso8601String(),
            'meTooCount' => $m->me_toos_count,
            ...($viewerId ? ['mine' => $m->participant_id === $viewerId, 'meToo' => $mine->has($m->id)] : []),
        ])->all();
    }

    /** Tell every open chat to refetch. A Reverb outage must never fail the student's own request. */
    public static function broadcast(): void
    {
        try {
            ChatUpdated::dispatch();
        } catch (Throwable $e) {
            report($e);
        }
    }
}
