<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class SyncAcceptanceStagePhase extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sync:acceptance-stage-phase';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Đồng bộ phase_id cho các acceptance stages từ task.phase_id';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Đang đồng bộ phase_id cho các acceptance stages...');

        $stages = \App\Models\AcceptanceStage::whereNotNull('task_id')
            ->whereNull('phase_id')
            ->with('task')
            ->get();

        $updated = 0;
        foreach ($stages as $stage) {
            if ($stage->task && $stage->task->phase_id) {
                $stage->phase_id = $stage->task->phase_id;
                $stage->save();
                $updated++;
            }
        }

        $this->info("Đã cập nhật {$updated} acceptance stages.");
        return 0;
    }
}
