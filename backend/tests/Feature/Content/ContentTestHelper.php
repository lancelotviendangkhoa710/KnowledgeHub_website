<?php

namespace Tests\Feature\Content;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

trait ContentTestHelper
{
    /**
     * Create a user in the database and assign the specified role via user_roles.
     */
    protected function createUserWithRole(string $roleName = 'user'): User
    {
        $role = DB::table('roles')->where('name', $roleName)->first();
        if (!$role) {
            $roleId = Str::uuid()->toString();
            DB::table('roles')->insert([
                'id' => $roleId,
                'name' => $roleName,
                'description' => ucfirst($roleName) . ' role',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            $roleId = $role->id;
        }

        $userId = Str::uuid()->toString();
        $email = 'user_' . Str::random(10) . '@example.com';

        DB::table('users')->insert([
            'id' => $userId,
            'name' => ucfirst($roleName) . ' User',
            'email' => $email,
            'password' => bcrypt('secret123'),
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('user_roles')->insert([
            'user_id' => $userId,
            'role_id' => $roleId,
            'created_at' => now(),
        ]);

        $user = User::find($userId);
        $user->setKeyType('string');
        $user->incrementing = false;
        $user->role = $roleName;

        return $user;
    }
}
