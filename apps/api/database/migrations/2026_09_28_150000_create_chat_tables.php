<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Questions chat: messages, and who tapped "Me too" on which. */
    public function up(): void
    {
        Schema::create('chat_messages', function (Blueprint $table) {
            $table->id();
            $table->string('participant_id', 40);
            $table->text('body');
            $table->string('exercise_id', 64)->nullable();
            $table->timestamp('created_at')->useCurrent()->index();

            $table->foreign('participant_id')->references('id')->on('participants')->cascadeOnDelete();
        });

        Schema::create('chat_me_toos', function (Blueprint $table) {
            $table->foreignId('message_id')->constrained('chat_messages')->cascadeOnDelete();
            $table->string('participant_id', 40);

            $table->primary(['message_id', 'participant_id']);
            $table->foreign('participant_id')->references('id')->on('participants')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_me_toos');
        Schema::dropIfExists('chat_messages');
    }
};
