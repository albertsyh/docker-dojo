<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Participant extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['id', 'last_seen_at'];

    protected function casts(): array
    {
        return ['last_seen_at' => 'datetime', 'quiz_opened_at' => 'datetime'];
    }

    private const ADJECTIVES = ['swift', 'calm', 'brave', 'bright', 'clever', 'eager', 'gentle', 'happy', 'jolly', 'keen', 'lucky', 'mighty', 'nimble', 'proud', 'quick', 'sunny', 'tidy', 'witty', 'zesty', 'bold'];

    private const ANIMALS = ['whale', 'otter', 'panda', 'falcon', 'koala', 'lynx', 'orca', 'owl', 'penguin', 'seal', 'tiger', 'turtle', 'walrus', 'yak', 'zebra', 'badger', 'dolphin', 'heron', 'marmot', 'squid'];

    /** Friendly but unguessable: two words plus 6 random base36 characters. */
    public static function newId(): string
    {
        return self::ADJECTIVES[random_int(0, count(self::ADJECTIVES) - 1)]
            .'-'.self::ANIMALS[random_int(0, count(self::ANIMALS) - 1)]
            .'-'.Str::lower(Str::random(6));
    }

    /**
     * Only ids built from our own word lists are accepted, so a client that
     * claims an id can't smuggle arbitrary words into the database.
     */
    public static function isValidId(string $id): bool
    {
        return preg_match('/^([a-z]+)-([a-z]+)-[a-z0-9]{6}$/', $id, $m) === 1
            && in_array($m[1], self::ADJECTIVES, true)
            && in_array($m[2], self::ANIMALS, true);
    }

    /** What others see in the chat: the words only. The random suffix is what makes an id secret. */
    public static function displayName(string $id): string
    {
        return implode(' ', array_slice(explode('-', $id), 0, 2));
    }

    /** 404 for unknown ids, and record activity for the "active now" count. */
    public static function touchOrFail(string $id): self
    {
        abort_unless(self::isValidId($id), 404, __('dojo.unknown_participant'));
        // Not update()'s row count: MySQL reports 0 affected rows when the timestamp
        // is unchanged (two requests in the same second), which isn't "not found".
        $participant = self::find($id);
        abort_unless($participant, 404, __('dojo.unknown_participant'));
        $participant->forceFill(['last_seen_at' => now()])->save();

        return $participant;
    }

    public function completions(): HasMany
    {
        return $this->hasMany(ExerciseCompletion::class);
    }

    public function quizAttempts(): HasMany
    {
        return $this->hasMany(QuizAttempt::class);
    }
}
