<?php

namespace App\Traits;

use App\Services\ActivityLogService;

trait Auditable
{
    /**
     * Boot the trait and attach model event listeners
     */
    public static function bootAuditable(): void
    {
        static::created(function ($model) {
            $newValues = static::filterIgnoredAttributes($model->getAttributes());
            ActivityLogService::log(
                action: 'created',
                subject: $model,
                oldValues: null,
                newValues: $newValues,
                logType: 'audit'
            );
        });

        static::updated(function ($model) {
            $oldValues = [];
            $newValues = [];

            $ignored = static::getIgnoredAttributes();
            $changes = $model->getChanges();

            foreach ($changes as $key => $newValue) {
                if (in_array($key, $ignored)) {
                    continue;
                }
                $oldValues[$key] = $model->getOriginal($key);
                $newValues[$key] = $newValue;
            }

            if (!empty($newValues)) {
                ActivityLogService::log(
                    action: 'updated',
                    subject: $model,
                    oldValues: $oldValues,
                    newValues: $newValues,
                    logType: 'audit'
                );
            }
        });

        static::deleted(function ($model) {
            $oldValues = static::filterIgnoredAttributes($model->getOriginal());
            
            // Distinguish soft delete vs force delete if SoftDeletes trait is used
            $action = method_exists($model, 'isForceDeleting') && $model->isForceDeleting()
                ? 'force_deleted'
                : 'deleted';

            ActivityLogService::log(
                action: $action,
                subject: $model,
                oldValues: $oldValues,
                newValues: null,
                logType: 'audit'
            );
        });

        if (method_exists(static::class, 'restored')) {
            static::restored(function ($model) {
                $newValues = static::filterIgnoredAttributes($model->getAttributes());
                ActivityLogService::log(
                    action: 'restored',
                    subject: $model,
                    oldValues: null,
                    newValues: $newValues,
                    logType: 'audit'
                );
            });
        }
    }

    /**
     * Attributes ignored from change diffs
     */
    protected static function getIgnoredAttributes(): array
    {
        return ['updated_at', 'created_at', 'remember_token', 'password'];
    }

    /**
     * Filter ignored attributes from array
     */
    protected static function filterIgnoredAttributes(array $attributes): array
    {
        $ignored = static::getIgnoredAttributes();
        return array_diff_key($attributes, array_flip($ignored));
    }
}
