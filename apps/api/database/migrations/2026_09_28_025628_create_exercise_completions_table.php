<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exercise_completions', function (Blueprint $table) {
            $table->string('participant_id', 40);
            $table->string('exercise_id', 64);
            $table->timestamp('completed_at')->useCurrent();

            $table->primary(['participant_id', 'exercise_id']);
            $table->index('exercise_id');
            $table->foreign('participant_id')->references('id')->on('participants')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exercise_completions');
    }
};
