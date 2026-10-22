<?php

namespace Tests\Feature\Auth;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::create(['name' => 'user', 'description' => 'Default user role']);
        Role::create(['name' => 'contributor', 'description' => 'Content team']);
        Role::create(['name' => 'admin', 'description' => 'Platform admin']);
    }

    public function test_guest_can_register_as_a_pending_user(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Test User',
            'email' => 'new@example.com',
            'password' => 'password-123',
            'password_confirmation' => 'password-123',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.user.email', 'new@example.com')
            ->assertJsonPath('data.user.status', 'pending')
            ->assertJsonPath('data.user.roles.0', 'user')
            ->assertJsonMissingPath('data.token');

        $this->assertDatabaseHas('users', [
            'email' => 'new@example.com',
            'status' => 'pending',
        ]);
        $this->assertDatabaseCount('user_roles', 1);
    }

    public function test_registration_rejects_duplicate_active_email(): void
    {
        $this->createUser('duplicate@example.com', 'active');

        $this->postJson('/api/auth/register', [
            'name' => 'Another User',
            'email' => 'DUPLICATE@example.com',
            'password' => 'password-123',
            'password_confirmation' => 'password-123',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');

        $this->assertDatabaseCount('users', 1);
    }

    public function test_registration_allows_email_from_a_soft_deleted_user(): void
    {
        $user = $this->createUser('reusable@example.com', 'inactive');
        $user->delete();

        $this->postJson('/api/auth/register', [
            'name' => 'Replacement User',
            'email' => 'REUSABLE@example.com',
            'password' => 'password-123',
            'password_confirmation' => 'password-123',
        ])->assertCreated();

        $this->assertDatabaseCount('users', 2);
        $this->assertDatabaseHas('users', [
            'email' => 'reusable@example.com',
            'deleted_at' => null,
            'status' => 'pending',
        ]);
    }

    public function test_pending_user_cannot_login(): void
    {
        $this->createUser('pending@example.com', 'pending');

        $this->postJson('/api/auth/login', [
            'email' => 'pending@example.com',
            'password' => 'password-123',
        ])->assertUnprocessable()->assertJsonPath('errors.email.0', 'The provided credentials are invalid.');

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_active_user_can_login_and_logout_revokes_current_token(): void
    {
        $this->createUser('active@example.com', 'active');

        $login = $this->postJson('/api/auth/login', [
            'email' => 'active@example.com',
            'password' => 'password-123',
        ])->assertOk();

        $token = $login->json('data.token');
        $this->assertNotEmpty($token);
        $this->assertDatabaseCount('personal_access_tokens', 1);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/auth/logout')
            ->assertOk();

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    private function createUser(string $email, string $status): User
    {
        $user = new User([
            'name' => 'Test User',
            'email' => $email,
            'password' => Hash::make('password-123'),
        ]);
        $user->id = (string) Str::uuid();
        $user->status = $status;
        $user->save();
        $user->roles()->attach(Role::where('name', 'user')->value('id'));

        return $user;
    }
}
