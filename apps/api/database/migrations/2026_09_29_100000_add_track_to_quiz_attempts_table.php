<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Which quiz an attempt belongs to: the workshop ("core") or a take-home track. */
    public function up(): void
    {
        Schema::table('quiz_attempts', function (Blueprint $table) {
            $table->string('track', 16)->default('core')->after('participant_id');
            $table->index(['participant_id', 'track']);
        });
    }

    public function down(): void
    {
        Schema::table('quiz_attempts', function (Blueprint $table) {
            $table->dropIndex(['participant_id', 'track']);
            $table->dropColumn('track');
        });
    }
};
