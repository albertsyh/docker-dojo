<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExerciseCompletion extends Model
{
    public $timestamps = false;

    public $incrementing = false;

    protected $primaryKey = null;

    protected $fillable = ['participant_id', 'exercise_id', 'completed_at'];
}
