<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quiz_attempts', function (Blueprint $table) {
            $table->id();
            $table->string('participant_id', 40)->index();
            $table->unsignedTinyInteger('score');
            $table->unsignedTinyInteger('total');
            $table->boolean('passed');
            $table->json('answers');
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('participant_id')->references('id')->on('participants')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quiz_attempts');
    }
};
