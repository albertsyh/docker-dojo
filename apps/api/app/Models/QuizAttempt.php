<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QuizAttempt extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['participant_id', 'paper_token', 'score', 'total', 'passed', 'answers'];

    protected function casts(): array
    {
        return ['answers' => 'array', 'passed' => 'boolean'];
    }
}
