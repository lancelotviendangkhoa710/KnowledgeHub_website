<?php

namespace Tests\Feature\Auth;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminUserTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['user', 'contributor', 'admin'] as $name) {
            Role::insert(['id' => (string) Str::uuid(), 'name' => $name, 'description' => $name]);
        }
    }

    public function test_guest_user_and_contributor_cannot_use_admin_endpoints(): void
    {
        $target = $this->createUser('t@example.com');

        $this->getJson('/api/admin/users')->assertUnauthorized();
        $this->patchJson("/api/admin/users/{$target->id}/status", ['status' => 'banned'])->assertUnauthorized();

        foreach (['user', 'contributor'] as $role) {
            $actor = $this->createUser("$role@example.com", 'active', $role);
            $token = $actor->createToken('t')->plainTextToken;

            $this->withToken($token)->getJson('/api/admin/users')->assertForbidden();
            $this->withToken($token)->getJson("/api/admin/users/{$target->id}")->assertForbidden();
            $this->withToken($token)->patchJson("/api/admin/users/{$target->id}/status", ['status' => 'banned'])->assertForbidden();
        }

        $this->assertDatabaseHas('users', ['id' => $target->id, 'status' => 'active']);
    }

    public function test_authorization_is_checked_before_validation(): void
    {
        $user = $this->createUser('u@example.com');
        $admin = $this->createUser('admin@example.com', 'active', 'admin');
        $userToken = $user->createToken('t')->plainTextToken;
        $adminToken = $admin->createToken('t')->plainTextToken;

        $this->withToken($userToken)->getJson('/api/admin/users?status=bogus')->assertForbidden();
        $this->withToken($userToken)->patchJson("/api/admin/users/{$admin->id}/status", ['status' => 'bogus'])->assertForbidden();
        $this->withToken($adminToken)->patchJson("/api/admin/users/{$admin->id}/status", ['status' => 'bogus'])->assertForbidden();
    }

    public function test_last_active_admin_cannot_be_deactivated(): void
    {
        $actor = $this->createUser('actor@example.com', 'active', 'admin');
        $target = $this->createUser('target@example.com', 'active', 'admin');
        $token = $actor->createToken('t')->plainTextToken;
        $actor->forceFill(['status' => 'inactive'])->save();

        $this->withToken($token)->patchJson("/api/admin/users/{$target->id}/status", ['status' => 'banned'])->assertUnprocessable();
        $this->assertDatabaseHas('users', ['id' => $target->id, 'status' => 'active']);
    }

    public function test_admin_lists_filters_and_paginates_without_secrets(): void
    {
        $admin = $this->createUser('admin@example.com', 'active', 'admin');
        $this->createUser('alice@example.com', 'active');
        $this->createUser('bob@example.com', 'banned');
        $this->createUser('pend@example.com', 'pending');
        $this->createUser('gone@example.com')->delete();
        $token = $admin->createToken('t')->plainTextToken;

        $all = $this->withToken($token)->getJson('/api/admin/users')->assertOk();
        $this->assertSame(4, $all->json('meta.total'));
        $this->assertArrayNotHasKey('password', $all->json('data.0'));

        $this->assertSame(1, $this->withToken($token)->getJson('/api/admin/users?status=banned')->json('meta.total'));
        $this->assertSame(1, $this->withToken($token)->getJson('/api/admin/users?role=admin')->json('meta.total'));
        $this->assertSame(1, $this->withToken($token)->getJson('/api/admin/users?search=ALICE')->json('meta.total'));
        $this->assertSame(0, $this->withToken($token)->getJson('/api/admin/users?search=%25')->json('meta.total'));
        $this->assertCount(2, $this->withToken($token)->getJson('/api/admin/users?per_page=2')->json('data'));
        $this->withToken($token)->getJson('/api/admin/users?per_page=1000')->assertUnprocessable();
        $this->withToken($token)->getJson('/api/admin/users?status=bogus')->assertUnprocessable();
    }

    public function test_admin_views_user_and_deleted_or_malformed_ids_return_404(): void
    {
        $token = $this->createUser('admin@example.com', 'active', 'admin')->createToken('t')->plainTextToken;
        $user = $this->createUser('a@example.com');
        $gone = $this->createUser('gone@example.com');
        $gone->delete();

        $this->withToken($token)->getJson("/api/admin/users/{$user->id}")
            ->assertOk()->assertJsonPath('data.user.email', 'a@example.com');
        $this->withToken($token)->getJson("/api/admin/users/{$gone->id}")->assertNotFound();
        $this->withToken($token)->getJson('/api/admin/users/not-a-uuid')->assertNotFound();
    }

    public function test_admin_bans_user_and_all_their_tokens_are_revoked(): void
    {
        $token = $this->createUser('admin@example.com', 'active', 'admin')->createToken('t')->plainTextToken;
        $target = $this->createUser('t@example.com');
        $target->createToken('a');
        $target->createToken('b');

        $this->withToken($token)->patchJson("/api/admin/users/{$target->id}/status", ['status' => 'banned'])
            ->assertOk()->assertJsonPath('data.user.status', 'banned');

        $this->assertSame(0, $target->tokens()->count());
        $this->app['auth']->forgetGuards();
        $this->flushHeaders();
        $this->postJson('/api/auth/login', ['email' => 't@example.com', 'password' => 'password-123'])
            ->assertUnprocessable();
    }

    public function test_admin_activates_pending_user_who_can_then_login(): void
    {
        $token = $this->createUser('admin@example.com', 'active', 'admin')->createToken('t')->plainTextToken;
        $target = $this->createUser('p@example.com', 'pending');

        $this->withToken($token)->patchJson("/api/admin/users/{$target->id}/status", ['status' => 'active'])->assertOk();
        $this->app['auth']->forgetGuards();
        $this->flushHeaders();

        $this->postJson('/api/auth/login', ['email' => 'p@example.com', 'password' => 'password-123'])->assertOk();
    }

    public function test_pending_user_cannot_be_moved_to_another_non_active_status(): void
    {
        $token = $this->createUser('admin@example.com', 'active', 'admin')->createToken('t')->plainTextToken;
        $target = $this->createUser('p@example.com', 'pending');

        $this->withToken($token)->patchJson("/api/admin/users/{$target->id}/status", ['status' => 'banned'])
            ->assertUnprocessable();

        $this->assertDatabaseHas('users', ['id' => $target->id, 'status' => 'pending']);
    }

    public function test_status_payload_is_strictly_validated_and_admin_cannot_change_own_status(): void
    {
        $admin = $this->createUser('admin@example.com', 'active', 'admin');
        $token = $admin->createToken('t')->plainTextToken;
        $target = $this->createUser('t@example.com');

        $this->withToken($token)->patchJson("/api/admin/users/{$target->id}/status", ['status' => 'pending'])->assertUnprocessable();
        $this->withToken($token)->patchJson("/api/admin/users/{$target->id}/status", ['status' => 'banned', 'roles' => ['admin']])->assertUnprocessable();
        $this->withToken($token)->patchJson("/api/admin/users/{$admin->id}/status", ['status' => 'banned'])->assertForbidden();

        $this->assertDatabaseHas('users', ['id' => $target->id, 'status' => 'active']);
        $this->assertDatabaseHas('users', ['id' => $admin->id, 'status' => 'active']);
        $this->assertDatabaseCount('user_roles', 2);
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
