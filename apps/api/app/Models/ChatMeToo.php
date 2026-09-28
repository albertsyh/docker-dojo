<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatMeToo extends Model
{
    public $timestamps = false;

    public $incrementing = false;

    protected $primaryKey = null;

    protected $fillable = ['message_id', 'participant_id'];
}
