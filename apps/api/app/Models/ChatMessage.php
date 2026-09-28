<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChatMessage extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['participant_id', 'body', 'exercise_id'];

    public function meToos(): HasMany
    {
        return $this->hasMany(ChatMeToo::class, 'message_id');
    }
}
