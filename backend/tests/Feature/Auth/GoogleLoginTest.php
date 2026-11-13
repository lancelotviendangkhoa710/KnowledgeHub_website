<?php

namespace Tests\Feature\Auth;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as GoogleUser;
use Mockery;
use RuntimeException;
use Tests\TestCase;

/** AUTH-07: Google sign-in. The Google API itself is mocked; only our rules are under test. */
class GoogleLoginTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::insert([
            ['id' => (string) Str::uuid(), 'name' => 'user', 'description' => 'Default user role'],
            ['id' => (string) Str::uuid(), 'name' => 'contributor', 'description' => 'Content team'],
        ]);
    }

    public function test_redirect_sends_the_browser_to_google(): void
    {
        config(['services.google.client_id' => 'test-client']);
        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('redirect')->once()->andReturn(new RedirectResponse('https://accounts.google.com/o/oauth2/auth'));
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $this->get('/api/auth/google/redirect')->assertRedirect('https://accounts.google.com/o/oauth2/auth');
    }

    public function test_redirect_without_google_credentials_goes_back_to_login(): void
    {
        config(['services.google.client_id' => null]);

        $this->get('/api/auth/google/redirect')->assertRedirect('/login?error=google_not_configured');
    }

    public function test_new_verified_email_creates_an_active_user_and_signs_in(): void
    {
        $this->mockGoogle('New.Person@Example.com', 'New Person');

        $this->get('/api/auth/google/callback')->assertRedirect('/login');

        $user = User::where('email', 'new.person@example.com')->firstOrFail();
        $this->assertSame('active', $user->status);
        $this->assertNotNull($user->email_verified_at);
        $this->assertSame(['user'], $user->roles()->pluck('name')->all());
        $this->assertAuthenticatedAs($user, 'web');
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_google_only_account_has_no_usable_password(): void
    {
        $this->mockGoogle('nopass@example.com', 'No Pass');
        $this->get('/api/auth/google/callback');

        $user = User::where('email', 'nopass@example.com')->firstOrFail();
        $this->assertFalse(Hash::check('', $user->password));
        $this->flushSession();
        $this->app['auth']->forgetGuards(); // sign out of the Google session first (login is guest-only)
        $this->postJson('/api/auth/login', ['email' => 'nopass@example.com', 'password' => 'anything-123'])
            ->assertUnprocessable();
    }

    public function test_existing_active_account_is_reused_with_its_roles(): void
    {
        $existing = $this->createUser('member@example.com', 'active', 'contributor');
        $this->mockGoogle('member@example.com', 'Member');

        $this->get('/api/auth/google/callback')->assertRedirect('/login');

        $this->assertDatabaseCount('users', 1);
        $this->assertAuthenticatedAs($existing, 'web');
        $this->assertSame(['contributor'], $existing->roles()->pluck('name')->all());
    }

    public function test_existing_account_that_is_not_active_is_refused(): void
    {
        foreach (['pending', 'inactive', 'banned'] as $i => $status) {
            $email = "blocked{$i}@example.com";
            $this->createUser($email, $status);
            $this->mockGoogle($email, 'Blocked');

            $this->get('/api/auth/google/callback')->assertRedirect('/login?error=google_unavailable');

            $this->assertGuest('web');
            $this->assertSame($status, User::where('email', $email)->value('status'));
        }
    }

    public function test_unverified_google_email_is_refused_and_creates_nothing(): void
    {
        $this->mockGoogle('unverified@example.com', 'Unverified', verified: false);

        $this->get('/api/auth/google/callback')->assertRedirect('/login?error=google_unverified');

        $this->assertDatabaseCount('users', 0);
        $this->assertGuest('web');
    }

    public function test_google_failure_goes_back_to_login(): void
    {
        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('user')->andThrow(new RuntimeException('invalid state'));
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $this->get('/api/auth/google/callback')->assertRedirect('/login?error=google_failed');

        $this->assertGuest('web');
    }

    public function test_email_of_a_deleted_account_gets_a_fresh_account(): void
    {
        $old = $this->createUser('back@example.com', 'active');
        $old->delete(); // soft delete frees the email
        $this->mockGoogle('back@example.com', 'Back Again');

        $this->get('/api/auth/google/callback')->assertRedirect('/login');

        $this->assertNotSame($old->id, User::where('email', 'back@example.com')->value('id'));
    }

    private function mockGoogle(string $email, string $name, bool $verified = true): void
    {
        $googleUser = (new GoogleUser)->setRaw(['email_verified' => $verified])->map(['id' => '1', 'name' => $name, 'email' => $email]);
        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('user')->andReturn($googleUser);
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
    }

    private function createUser(string $email, string $status, string $role = 'user'): User
    {
        $user = new User(['name' => 'Test User', 'email' => $email, 'password' => Hash::make('password-123')]);
        $user->id = (string) Str::uuid();
        $user->status = $status;
        $user->save();
        $user->roles()->attach(Role::where('name', $role)->value('id'));

        return $user;
    }
}
