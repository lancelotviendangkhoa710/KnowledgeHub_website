<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Normalize legacy role names to the approved three-role model.
 * Maps learner assignments to user; removes obsolete reviewer assignments.
 */
return new class extends Migration
{
    public function up(): void
    {
        $userRoleId = DB::table('roles')->where('name', 'user')->value('id');
        $learnerRoleId = DB::table('roles')->where('name', 'learner')->value('id');

        if ($learnerRoleId && $userRoleId) {
            DB::statement(
                'INSERT INTO user_roles (user_id, role_id, created_at)
                 SELECT user_id, ?, created_at FROM user_roles WHERE role_id = ?
                 ON CONFLICT (user_id, role_id) DO NOTHING',
                [$userRoleId, $learnerRoleId]
            );
            DB::table('user_roles')->where('role_id', $learnerRoleId)->delete();
            DB::table('roles')->where('id', $learnerRoleId)->delete();
        } elseif ($learnerRoleId) {
            DB::table('roles')->where('id', $learnerRoleId)->update(['name' => 'user']);
        }

        $reviewerRoleId = DB::table('roles')->where('name', 'reviewer')->value('id');
        if ($reviewerRoleId) {
            DB::table('user_roles')->where('role_id', $reviewerRoleId)->delete();
            DB::table('roles')->where('id', $reviewerRoleId)->delete();
        }
    }

    public function down(): void
    {
        // Legacy reviewer assignments cannot be restored; role normalization is irreversible.
    }
};
