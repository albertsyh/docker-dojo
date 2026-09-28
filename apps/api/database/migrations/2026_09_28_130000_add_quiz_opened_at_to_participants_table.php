<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** When the participant last opened a quiz, for the tracker's "taking it now". */
    public function up(): void
    {
        Schema::table('participants', function (Blueprint $table) {
            $table->timestamp('quiz_opened_at')->nullable()->after('last_seen_at');
        });
    }

    public function down(): void
    {
        Schema::table('participants', function (Blueprint $table) {
            $table->dropColumn('quiz_opened_at');
        });
    }
};
