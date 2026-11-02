<?php

namespace Tests\Feature\Auth;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminUserRoleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['user', 'contributor', 'admin'] as $name) {
            Role::insert(['id' => (string) Str::uuid(), 'name' => $name, 'description' => $name]);
        }
    }

    public function test_guest_user_and_contributor_cannot_assign_roles(): void
    {
        $target = $this->createUser('t@example.com');

        $this->putJson("/api/admin/users/{$target->id}/role", ['role' => 'admin'])->assertUnauthorized();

        foreach (['user', 'contributor'] as $role) {
            $token = $this->createUser("$role@example.com", 'active', $role)->createToken('t')->plainTextToken;
            $this->withToken($token)->putJson("/api/admin/users/{$target->id}/role", ['role' => 'admin', 'current_password' => 'password-123'])
                ->assertForbidden();
        }

        $this->assertSame(['user'], $this->roles($target));
    }

    public function test_admin_replaces_role_and_target_tokens_are_revoked(): void
    {
        $token = $this->createUser('admin@example.com', 'active', 'admin')->createToken('t')->plainTextToken;
        $target = $this->createUser('t@example.com');
        $target->createToken('old');

        $this->withToken($token)->putJson("/api/admin/users/{$target->id}/role", ['role' => 'contributor'])
            ->assertOk()->assertJsonPath('data.user.roles.0', 'contributor');

        $this->assertSame(['contributor'], $this->roles($target));
        $this->assertSame(0, $target->tokens()->count());

        // Same role again is a no-op, never a duplicate row.
        $this->withToken($token)->putJson("/api/admin/users/{$target->id}/role", ['role' => 'contributor'])->assertOk();
        $this->assertSame(1, $target->roles()->count());
    }

    public function test_granting_or_revoking_admin_needs_the_actor_password(): void
    {
        $token = $this->createUser('admin@example.com', 'active', 'admin')->createToken('t')->plainTextToken;
        $target = $this->createUser('t@example.com');

        $this->withToken($token)->putJson("/api/admin/users/{$target->id}/role", ['role' => 'admin'])->assertUnprocessable();
        $this->withToken($token)->putJson("/api/admin/users/{$target->id}/role", ['role' => 'admin', 'current_password' => 'wrong'])->assertUnprocessable();
        $this->assertSame(['user'], $this->roles($target));

        $this->withToken($token)->putJson("/api/admin/users/{$target->id}/role", ['role' => 'admin', 'current_password' => 'password-123'])->assertOk();
        $this->assertSame(['admin'], $this->roles($target));

        $this->withToken($token)->putJson("/api/admin/users/{$target->id}/role", ['role' => 'user'])->assertUnprocessable();
        $this->withToken($token)->putJson("/api/admin/users/{$target->id}/role", ['role' => 'user', 'current_password' => 'password-123'])->assertOk();
    }

    public function test_admin_cannot_change_own_role(): void
    {
        $admin = $this->createUser('admin@example.com', 'active', 'admin');
        $token = $admin->createToken('t')->plainTextToken;

        $this->withToken($token)->putJson("/api/admin/users/{$admin->id}/role", ['role' => 'user', 'current_password' => 'password-123'])->assertForbidden();
        $this->assertSame(['admin'], $this->roles($admin));
    }

    public function test_last_active_admin_cannot_lose_the_role(): void
    {
        $actor = $this->createUser('actor@example.com', 'active', 'admin');
        $target = $this->createUser('target@example.com', 'active', 'admin');
        $token = $actor->createToken('t')->plainTextToken;

        // The actor stops being an active admin, leaving the target as the only one.
        $actor->forceFill(['status' => 'inactive'])->save();

        $this->withToken($token)->putJson("/api/admin/users/{$target->id}/role", ['role' => 'user', 'current_password' => 'password-123'])
            ->assertUnprocessable();
        $this->assertSame(['admin'], $this->roles($target));
    }

    public function test_banned_pending_deleted_and_invalid_targets_or_roles_are_rejected(): void
    {
        $token = $this->createUser('admin@example.com', 'active', 'admin')->createToken('t')->plainTextToken;
        $banned = $this->createUser('b@example.com', 'banned');
        $pending = $this->createUser('p@example.com', 'pending');
        $gone = $this->createUser('g@example.com');
        $gone->delete();
        $ok = $this->createUser('ok@example.com', 'inactive');

        foreach ([$banned, $pending] as $target) {
            $this->withToken($token)->putJson("/api/admin/users/{$target->id}/role", ['role' => 'contributor'])->assertUnprocessable();
            $this->assertSame(['user'], $this->roles($target));
        }

        $this->withToken($token)->putJson("/api/admin/users/{$gone->id}/role", ['role' => 'contributor'])->assertNotFound();
        $this->withToken($token)->putJson('/api/admin/users/not-a-uuid/role', ['role' => 'contributor'])->assertNotFound();

        foreach (['learner', 'reviewer', 'moderator', '', ['admin']] as $bad) {
            $this->withToken($token)->putJson("/api/admin/users/{$ok->id}/role", ['role' => $bad])->assertUnprocessable();
        }
        $this->withToken($token)->putJson("/api/admin/users/{$ok->id}/role", ['role' => 'contributor', 'status' => 'banned'])->assertUnprocessable();
        $this->assertSame(['user'], $this->roles($ok));

        $this->withToken($token)->putJson("/api/admin/users/{$ok->id}/role", ['role' => 'contributor'])->assertOk();
    }

    private function roles(User $user): array
    {
        return $user->roles()->pluck('name')->all();
    }

    private function createUser(string $email, string $status = 'active', string $role = 'user'): User
    {
        $user = new User(['name' => 'Test User', 'email' => $email, 'password' => Hash::make('password-123')]);
        $user->id = (string) Str::uuid();
        $user->status = $status;
        $user->save();
        $user->roles()->attach(Role::where('name', $role)->value('id'));

        return $user;
    }
}
