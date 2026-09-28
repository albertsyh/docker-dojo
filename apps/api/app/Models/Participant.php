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

    public function completions(): HasMany
    {
        return $this->hasMany(ExerciseCompletion::class);
    }

    public function quizAttempts(): HasMany
    {
        return $this->hasMany(QuizAttempt::class);
    }
}
