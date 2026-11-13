<?php

namespace Tests\Feature\Auth;

use App\Http\Middleware\EnforceSessionPolicy;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

/** AUTH-06: cookie session for the web app (stateful requests). */
class CookieSessionTest extends TestCase
{
    use RefreshDatabase;

    private const WEB = ['Origin' => 'http://localhost:3000', 'Referer' => 'http://localhost:3000/login'];

    protected function setUp(): void
    {
        parent::setUp();

        Role::insert([['id' => (string) Str::uuid(), 'name' => 'user', 'description' => 'Default user role']]);
    }

    public function test_web_login_starts_a_session_and_returns_no_token(): void
    {
        $user = $this->createUser('web@example.com', 'active');

        $this->withHeaders(self::WEB)
            ->postJson('/api/auth/login', ['email' => 'web@example.com', 'password' => 'password-123'])
            ->assertOk()
            ->assertJsonPath('data.user.email', 'web@example.com')
            ->assertJsonMissingPath('data.token');

        $this->assertAuthenticatedAs($user, 'web');
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_login_without_web_origin_still_returns_a_token(): void
    {
        $this->createUser('api@example.com', 'active');

        $this->postJson('/api/auth/login', ['email' => 'api@example.com', 'password' => 'password-123'])
            ->assertOk()
            ->assertJsonStructure(['data' => ['user', 'token']]);
    }

    public function test_session_can_read_me_and_logout_ends_it(): void
    {
        $user = $this->createUser('me@example.com', 'active');
        $session = ['login_at' => time()];

        $this->actingAs($user, 'web')->withSession($session)->withHeaders(self::WEB)
            ->getJson('/api/me')->assertOk()->assertJsonPath('data.user.email', 'me@example.com');

        $this->actingAs($user, 'web')->withSession($session)->withHeaders(self::WEB)
            ->postJson('/api/auth/logout')->assertOk();

        $this->assertGuest('web');
    }

    public function test_session_older_than_the_absolute_lifetime_is_rejected(): void
    {
        $user = $this->createUser('old@example.com', 'active');

        $this->actingAs($user, 'web')
            ->withSession(['login_at' => time() - EnforceSessionPolicy::ABSOLUTE_LIFETIME_SECONDS - 1])
            ->withHeaders(self::WEB)
            ->getJson('/api/me')
            ->assertUnauthorized();
    }

    public function test_session_of_an_account_that_is_no_longer_active_is_rejected(): void
    {
        $user = $this->createUser('banned@example.com', 'banned');

        $this->actingAs($user, 'web')->withSession(['login_at' => time()])->withHeaders(self::WEB)
            ->getJson('/api/me')
            ->assertUnauthorized();
    }

    private function createUser(string $email, string $status): User
    {
        $user = new User(['name' => 'Test User', 'email' => $email, 'password' => Hash::make('password-123')]);
        $user->id = (string) Str::uuid();
        $user->status = $status;
        $user->save();
        $user->roles()->attach(Role::where('name', 'user')->value('id'));

        return $user;
    }
}
