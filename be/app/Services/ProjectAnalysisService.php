<?php

namespace App\Services;

use App\Models\Project;
use App\Models\AdditionalCost;
use App\Models\ProjectBudget;
use App\Models\Notification;
use App\Constants\Permissions;
use Illuminate\Support\Facades\DB;
use Exception;

class ProjectAnalysisService
{
    protected $evmService;
    protected $notificationService;
    protected $budgetService;

    public function __construct(
        EvmCalculationService $evmService,
        NotificationService $notificationService,
        ProjectBudgetService $budgetService
    ) {
        $this->evmService = $evmService;
        $this->notificationService = $notificationService;
        $this->budgetService = $budgetService;
    }

    /**
     * Get project health analysis (EVM + Budget status)
     */
    public function getProjectAnalysis(Project $project): array
    {
        $evmAnalysis = $this->evmService->analyzePerformance($project);
        
        // Budget Status
        $activeBudget = $project->budgets()->where('status', 'active')->first();
        $approvedBudget = $project->budgets()->where('status', 'approved')->latest()->first();
        
        return [
            'evm' => $evmAnalysis,
            'budget' => [
                'has_active' => !!$activeBudget,
                'active_version' => $activeBudget ? $activeBudget->version : null,
                'has_approved' => !!$approvedBudget,
                'latest_approved_version' => $approvedBudget ? $approvedBudget->version : null,
            ],
            'additional_costs' => [
                'total_pending' => $project->additionalCosts()->where('status', 'pending_approval')->sum('amount'),
                'total_approved' => $project->additionalCosts()->where('status', 'approved')->sum('amount'),
            ]
        ];
    }

    /**
     * Handle Additional Cost Creation
     */
    public function createAdditionalCost(Project $project, array $data, $user): AdditionalCost
    {
        return DB::transaction(function () use ($project, $data, $user) {
            $attachmentIds = $data['attachment_ids'] ?? [];
            unset($data['attachment_ids']);

            $cost = AdditionalCost::create([
                'project_id' => $project->id,
                'proposed_by' => $user->id,
                'amount' => $data['amount'],
                'description' => $data['description'],
                'status' => 'pending_approval',
            ]);

            if (!empty($attachmentIds)) {
                $this->attachFilesToCost($cost, $attachmentIds, $user);
            }

            // Notify
            $this->notificationService->sendToPermissionUsers(
                Permissions::ADDITIONAL_COST_APPROVE,
                $project->id,
                Notification::TYPE_WORKFLOW,
                Notification::CATEGORY_WORKFLOW_APPROVAL,
                "Yêu cầu duyệt chi phí phát sinh",
                "Có một yêu cầu chi phí phát sinh mới cho dự án '{$project->name}' với số tiền " . number_format((float)$cost->amount) . " VND.",
                ['project_id' => $project->id, 'cost_id' => $cost->id],
                Notification::PRIORITY_HIGH,
                "/projects/{$project->id}/additional-costs"
            );

            return $cost;
        });
    }

    /**
     * Handle Additional Cost Approval
     */
    public function approveAdditionalCost(AdditionalCost $cost, $user): bool
    {
        return DB::transaction(function () use ($cost, $user) {
            if (!in_array($cost->status, ['pending_approval', 'pending'])) {
                throw new Exception('Chi phí không ở trạng thái chờ duyệt.');
            }

            if (!$cost->approve($user)) {
                throw new Exception('Không thể duyệt chi phí phát sinh.');
            }

            // Update contract value if exists
            $project = $cost->project;
            if ($project && $project->contract) {
                $project->contract->contract_value += $cost->amount;
                $project->contract->save();
            }

            // Notify Proposer
            $this->notificationService->sendToUser(
                $cost->proposed_by,
                Notification::TYPE_WORKFLOW,
                Notification::CATEGORY_WORKFLOW_APPROVAL,
                "Chi phí phát sinh đã được duyệt",
                "Chi phí phát sinh " . number_format((float)$cost->amount) . " VND cho dự án '{$project->name}' đã được duyệt.",
                ['project_id' => $project->id, 'cost_id' => $cost->id],
                Notification::PRIORITY_MEDIUM,
                "/projects/{$project->id}/additional-costs"
            );

            return true;
        });
    }

    /**
     * Handle Additional Cost Rejection
     */
    public function rejectAdditionalCost(AdditionalCost $cost, string $reason, $user): bool
    {
        if (!$cost->reject($reason, $user)) {
            throw new Exception('Không thể từ chối chi phí phát sinh.');
        }

        $this->notificationService->notifyCostRejected($cost, $reason);
        return true;
    }

    /**
     * EVM Calculation Wrapper
     */
    public function calculateEvm(Project $project, $asOfDate = null)
    {
        return $this->evmService->calculateEvm($project, $asOfDate);
    }

    /**
     * Get Latest EVM Metric
     */
    public function getLatestEvm(Project $project)
    {
        return $this->evmService->getLatestMetrics($project);
    }

    /**
     * Get EVM History
     */
    public function getEvmHistory(Project $project, $startDate = null, $endDate = null)
    {
        return $this->evmService->getMetricsHistory($project, $startDate, $endDate);
    }

    /**
     * Budget Comparison Wrapper
     */
    public function compareBudget(ProjectBudget $budget): array
    {
        return app(BudgetComparisonService::class)->compareBudget($budget);
    }

    /**
     * Category Comparison Wrapper
     */
    public function compareByCategory(ProjectBudget $budget): array
    {
        return app(BudgetComparisonService::class)->compareByCategory($budget);
    }

    /**
     * Cost Group Comparison Wrapper
     */
    public function compareByCostGroup(ProjectBudget $budget): array
    {
        return app(BudgetComparisonService::class)->compareByCostGroup($budget);
    }

    /**
     * Variance Analysis over time
     */
    public function getVarianceAnalysis(Project $project): array
    {
        return app(BudgetComparisonService::class)->getVarianceAnalysis($project);
    }

    /**
     * Helper to attach files
     */
    protected function attachFilesToCost(AdditionalCost $cost, array $attachmentIds, $user)
    {
        foreach ($attachmentIds as $attachmentId) {
            $attachment = \App\Models\Attachment::find($attachmentId);
            if ($attachment && ($attachment->uploaded_by === $user->id || $user->hasPermission(Permissions::SETTINGS_MANAGE))) {
                $attachment->update([
                    'attachable_type' => AdditionalCost::class,
                    'attachable_id' => $cost->id,
                ]);
            }
        }
    }
}
