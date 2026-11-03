<?php

namespace Tests\Feature\Auth;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Services\Auth\AdminUserService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
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

    public function test_actor_deactivated_after_authentication_cannot_change_roles(): void
    {
        $actor = $this->createUser('actor@example.com', 'active', 'admin');
        $target = $this->createUser('target@example.com', 'active', 'admin');
        $token = $actor->createToken('t')->plainTextToken;

        // Deactivated while the token is still held (e.g. mid-request); the service re-checks under lock.
        $actor->forceFill(['status' => 'inactive'])->save();

        $this->withToken($token)->putJson("/api/admin/users/{$target->id}/role", ['role' => 'user', 'current_password' => 'password-123'])
            ->assertForbidden();
        $this->assertSame(['admin'], $this->roles($target));
    }

    public function test_legacy_target_with_several_roles_is_checked_against_every_role(): void
    {
        $token = $this->createUser('admin@example.com', 'active', 'admin')->createToken('t')->plainTextToken;
        $target = $this->createUser('t@example.com');
        $target->roles()->attach(Role::where('name', 'admin')->value('id'));

        $this->withToken($token)->putJson("/api/admin/users/{$target->id}/role", ['role' => 'contributor'])->assertUnprocessable();
        $this->assertEqualsCanonicalizing(['user', 'admin'], $this->roles($target));

        $this->withToken($token)->putJson("/api/admin/users/{$target->id}/role", ['role' => 'contributor', 'current_password' => 'password-123'])->assertOk();
        $this->assertSame(['contributor'], $this->roles($target));
    }

    public function test_role_change_is_logged_only_when_the_transaction_commits(): void
    {
        $admin = $this->createUser('admin@example.com', 'active', 'admin');
        $target = $this->createUser('t@example.com');
        $service = app(AdminUserService::class);
        Log::spy();

        try {
            DB::transaction(function () use ($service, $admin, $target) {
                $service->changeRole($admin, $target, 'contributor', null);
                throw new \RuntimeException('rollback');
            });
        } catch (\RuntimeException) {
        }

        $this->assertSame(['user'], $this->roles($target));
        Log::shouldNotHaveReceived('info');

        $service->changeRole($admin, $target, 'contributor', null);
        Log::shouldHaveReceived('info')->once();
    }

    public function test_last_active_admin_guard_blocks_removing_the_admin_role(): void
    {
        $only = $this->createUser('only@example.com', 'active', 'admin');

        // Unreachable through the API (the policy blocks self-change); called on the service directly.
        $this->expectException(ValidationException::class);
        try {
            app(AdminUserService::class)->changeRole($only, $only, 'user', 'password-123');
        } finally {
            $this->assertSame(['admin'], $this->roles($only));
        }
    }

    public function test_logging_failure_after_commit_does_not_break_the_role_change(): void
    {
        $admin = $this->createUser('admin@example.com', 'active', 'admin');
        $target = $this->createUser('t@example.com');
        Log::shouldReceive('info')->andThrow(new \RuntimeException('log down'));

        app(AdminUserService::class)->changeRole($admin, $target, 'contributor', null);

        $this->assertSame(['contributor'], $this->roles($target));
    }

    public function test_missing_role_row_is_a_validation_error(): void
    {
        $token = $this->createUser('admin@example.com', 'active', 'admin')->createToken('t')->plainTextToken;
        $target = $this->createUser('t@example.com');
        Role::where('name', 'contributor')->delete();

        $this->withToken($token)->putJson("/api/admin/users/{$target->id}/role", ['role' => 'contributor'])->assertUnprocessable();
    }

    public function test_role_changes_are_throttled(): void
    {
        $token = $this->createUser('admin@example.com', 'active', 'admin')->createToken('t')->plainTextToken;
        $target = $this->createUser('t@example.com');

        foreach (range(1, 6) as $_) {
            $this->withToken($token)->putJson("/api/admin/users/{$target->id}/role", ['role' => 'admin', 'current_password' => 'wrong'])->assertUnprocessable();
        }
        $this->withToken($token)->putJson("/api/admin/users/{$target->id}/role", ['role' => 'admin', 'current_password' => 'password-123'])->assertStatus(429);
        $this->assertSame(['user'], $this->roles($target));
    }

    public function test_banned_pending_deleted_and_invalid_targets_or_roles_are_rejected(): void
    {
        // This test sends more than 6 requests; throttling has its own test.
        $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);
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

        foreach (['superuser', 'guest', 'ADMIN', '', ['admin']] as $bad) {
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
