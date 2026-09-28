<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** The exercise page the participant has open, for the tracker's "here now" counts. */
    public function up(): void
    {
        Schema::table('participants', function (Blueprint $table) {
            $table->string('current_exercise_id', 64)->nullable()->after('quiz_opened_at');
        });
    }

    public function down(): void
    {
        Schema::table('participants', function (Blueprint $table) {
            $table->dropColumn('current_exercise_id');
        });
    }
};
