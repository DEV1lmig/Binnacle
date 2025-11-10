"use client";

import Link from "next/link";
import * as Clerk from "@clerk/elements/common";
import * as SignUp from "@clerk/elements/sign-up";

const fieldClasses =
  "w-full rounded-lg border border-[var(--bkl-color-border)] bg-[var(--bkl-color-bg-secondary)] px-4 py-3 text-[var(--bkl-color-text-primary)] placeholder:text-[var(--bkl-color-text-tertiary)] focus:border-[var(--bkl-color-accent-primary)] focus:outline-none transition-colors";

/**
 * Presents the multi-step Clerk Elements sign-up flow with Binnacle design.
 */
export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bkl-color-bg-primary)] px-4 py-16">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-[var(--bkl-color-border)] bg-[var(--bkl-color-bg-primary)] shadow-[var(--bkl-shadow-2xl)] lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)]">
        <section className="hidden flex-col justify-between border-r border-[var(--bkl-color-border)] bg-gradient-to-br from-[var(--bkl-color-accent-secondary)]/20 via-[var(--bkl-color-accent-primary)]/10 to-transparent p-12 lg:flex relative overflow-hidden">
          {/* Gradient orb effect */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--bkl-color-accent-secondary)] rounded-full blur-[120px] opacity-15" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-[var(--bkl-color-accent-primary)] rounded-full blur-[100px] opacity-20" />
          
          <div className="flex flex-col gap-6 relative z-10">
            <Link href="/" className="text-[var(--bkl-color-accent-primary)] hover:text-[var(--bkl-color-accent-hover)] transition-colors">
              <span style={{ fontSize: 'var(--bkl-font-size-xl)', fontWeight: 'var(--bkl-font-weight-semibold)', letterSpacing: '0.05em' }}>
                BINNACLE
              </span>
            </Link>
            <h1 className="text-4xl font-bold leading-tight text-[var(--bkl-color-text-primary)]">
              Start your gaming adventure today.
            </h1>
            <p className="max-w-sm text-base text-[var(--bkl-color-text-secondary)]">
              Build your library, track every session, and discover what your crew is playing next.
            </p>
          </div>
          
          <ul className="flex flex-col gap-4 text-sm text-[var(--bkl-color-text-secondary)] relative z-10">
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-2 w-2 flex-shrink-0 rounded-full bg-[var(--bkl-color-accent-secondary)]" />
              Curate personalized lists for every mood
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-2 w-2 flex-shrink-0 rounded-full bg-[var(--bkl-color-accent-primary)]" />
              Keep progress synced across all platforms
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-2 w-2 flex-shrink-0 rounded-full bg-[var(--bkl-color-accent-secondary)]" />
              Share reviews and discover recommendations
            </li>
          </ul>
        </section>
        
        <div className="flex flex-col gap-8 p-8 sm:p-12">
          <header className="flex flex-col gap-2 text-left lg:hidden">
            <Link href="/" className="text-[var(--bkl-color-accent-primary)] hover:text-[var(--bkl-color-accent-hover)] transition-colors">
              <span style={{ fontSize: 'var(--bkl-font-size-lg)', fontWeight: 'var(--bkl-font-weight-semibold)', letterSpacing: '0.05em' }}>
                BINNACLE
              </span>
            </Link>
            <h1 className="text-3xl font-bold text-[var(--bkl-color-text-primary)]">Create your account</h1>
            <p className="max-w-md text-base text-[var(--bkl-color-text-secondary)]">
              Start tracking your backlog and connect with gamers worldwide.
            </p>
          </header>
          
          <SignUp.Root routing="path" path="/sign-up">
            <SignUp.Step name="start" className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <Clerk.Connection name="google" asChild>
                  <button className="flex w-full items-center justify-center gap-3 rounded-lg border border-[var(--bkl-color-border)] bg-[var(--bkl-color-bg-secondary)] px-4 py-3 text-sm font-medium text-[var(--bkl-color-text-primary)] hover:border-[var(--bkl-color-accent-primary)] hover:bg-[var(--bkl-color-bg-tertiary)] transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 533.5 544.3" className="h-5 w-5" aria-hidden="true">
                      <path fill="#4285f4" d="M533.5 278.4c0-17.4-1.5-34.1-4.3-50.4H272v95.3h147.5c-6.4 34.5-26.1 63.7-55.6 83.3v68.9h89.8c52.6-48.4 82.8-119.7 82.8-197.1" />
                      <path fill="#34a853" d="M272 544.3c74.9 0 137.7-24.7 183.6-67.3l-89.8-68.9c-24.9 16.7-56.7 26.5-93.8 26.5-71.9 0-132.9-48.6-154.7-114.1H24.9v71.6c45.5 90.2 139.1 152.2 247.1 152.2" />
                      <path fill="#fbbc05" d="M117.3 320.5c-11.2-33.5-11.2-69.7 0-103.2V145.7h-92.4c-39.4 78.8-39.4 171.4 0 250.2z" />
                      <path fill="#ea4335" d="M272 107.7c40.7-.6 79.8 14.9 109.6 43.5l81.6-81.6C421.4 24.6 349.2-1.1 272 0 164.1 0 70.4 62 24.9 152.2l92.4 71.6C139.1 156.3 200.1 107.7 272 107.7" />
                    </svg>
                    Continue with Google
                  </button>
                </Clerk.Connection>
                <Clerk.Connection name="discord" asChild>
                  <button className="flex w-full items-center justify-center gap-3 rounded-lg border border-[var(--bkl-color-border)] bg-[var(--bkl-color-bg-secondary)] px-4 py-3 text-sm font-medium text-[var(--bkl-color-text-primary)] hover:border-[var(--bkl-color-accent-primary)] hover:bg-[var(--bkl-color-bg-tertiary)] transition-all">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#5865F2">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    Continue with Discord
                  </button>
                </Clerk.Connection>
              </div>
              
              <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-[var(--bkl-color-text-tertiary)]">
                <span className="h-px flex-1 bg-[var(--bkl-color-border)]" />
                or
                <span className="h-px flex-1 bg-[var(--bkl-color-border)]" />
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Clerk.Field name="firstName">
                    <Clerk.Label className="text-sm font-medium text-[var(--bkl-color-text-secondary)]">First name</Clerk.Label>
                    <Clerk.Input asChild>
                      <input className={fieldClasses} autoComplete="given-name" />
                    </Clerk.Input>
                    <Clerk.FieldError className="text-sm text-red-400 mt-1" />
                  </Clerk.Field>
                  <Clerk.Field name="lastName">
                    <Clerk.Label className="text-sm font-medium text-[var(--bkl-color-text-secondary)]">Last name</Clerk.Label>
                    <Clerk.Input asChild>
                      <input className={fieldClasses} autoComplete="family-name" />
                    </Clerk.Input>
                    <Clerk.FieldError className="text-sm text-red-400 mt-1" />
                  </Clerk.Field>
                </div>
                <Clerk.Field name="username">
                  <Clerk.Label className="text-sm font-medium text-[var(--bkl-color-text-secondary)]">Username</Clerk.Label>
                  <Clerk.Input asChild>
                    <input className={fieldClasses} autoComplete="username" />
                  </Clerk.Input>
                  <Clerk.FieldError className="text-sm text-red-400 mt-1" />
                </Clerk.Field>
                <Clerk.Field name="emailAddress">
                  <Clerk.Label className="text-sm font-medium text-[var(--bkl-color-text-secondary)]">Email address</Clerk.Label>
                  <Clerk.Input asChild>
                    <input className={fieldClasses} type="email" autoComplete="email" />
                  </Clerk.Input>
                  <Clerk.FieldError className="text-sm text-red-400 mt-1" />
                </Clerk.Field>
                <Clerk.Field name="password">
                  <Clerk.Label className="text-sm font-medium text-[var(--bkl-color-text-secondary)]">Password</Clerk.Label>
                  <Clerk.Input asChild>
                    <input className={fieldClasses} type="password" autoComplete="new-password" />
                  </Clerk.Input>
                  <Clerk.FieldError className="text-sm text-red-400 mt-1" />
                </Clerk.Field>
              </div>
              
              <SignUp.Captcha className="rounded-lg border border-[var(--bkl-color-border)] bg-[var(--bkl-color-bg-secondary)] px-4 py-3" />
              
              <SignUp.Action submit asChild>
                <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--bkl-color-accent-primary)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--bkl-color-accent-hover)] transition-all shadow-[var(--bkl-shadow-glow)]">
                  Create account
                </button>
              </SignUp.Action>
              
              <p className="text-center text-sm text-[var(--bkl-color-text-secondary)]">
                Already have an account?{" "}
                <Clerk.Link
                  navigate="sign-in"
                  className="text-[var(--bkl-color-accent-primary)] hover:text-[var(--bkl-color-accent-hover)] font-medium transition-colors"
                >
                  Sign in
                </Clerk.Link>
              </p>
            </SignUp.Step>
            
            <SignUp.Step name="continue" className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-semibold text-[var(--bkl-color-text-primary)]">Complete your profile</h2>
                <p className="text-sm text-[var(--bkl-color-text-secondary)]">
                  Help us personalize your experience by completing your profile.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Clerk.Field name="firstName">
                    <Clerk.Label className="text-sm font-medium text-[var(--bkl-color-text-secondary)]">First name</Clerk.Label>
                    <Clerk.Input asChild>
                      <input className={fieldClasses} autoComplete="given-name" />
                    </Clerk.Input>
                    <Clerk.FieldError className="text-sm text-red-400 mt-1" />
                  </Clerk.Field>
                  <Clerk.Field name="lastName">
                    <Clerk.Label className="text-sm font-medium text-[var(--bkl-color-text-secondary)]">Last name</Clerk.Label>
                    <Clerk.Input asChild>
                      <input className={fieldClasses} autoComplete="family-name" />
                    </Clerk.Input>
                    <Clerk.FieldError className="text-sm text-red-400 mt-1" />
                  </Clerk.Field>
                </div>
                <Clerk.Field name="username">
                  <Clerk.Label className="text-sm font-medium text-[var(--bkl-color-text-secondary)]">Username</Clerk.Label>
                  <Clerk.Input asChild>
                    <input className={fieldClasses} autoComplete="username" />
                  </Clerk.Input>
                  <Clerk.FieldError className="text-sm text-red-400 mt-1" />
                </Clerk.Field>
              </div>
              <SignUp.Action submit asChild>
                <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--bkl-color-accent-primary)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--bkl-color-accent-hover)] transition-all shadow-[var(--bkl-shadow-glow)]">
                  Continue to Binnacle
                </button>
              </SignUp.Action>
            </SignUp.Step>
            
            <SignUp.Step name="verifications" className="flex flex-col gap-6">
              <SignUp.Strategy name="email_code">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-xl font-semibold text-[var(--bkl-color-text-primary)]">Verify your email</h2>
                    <p className="text-sm text-[var(--bkl-color-text-secondary)]">
                      Enter the verification code we sent to your inbox to secure your account.
                    </p>
                  </div>
                  <Clerk.Field name="code">
                    <Clerk.Label className="text-sm font-medium text-[var(--bkl-color-text-secondary)]">Verification code</Clerk.Label>
                    <Clerk.Input asChild>
                      <input className={fieldClasses} inputMode="numeric" />
                    </Clerk.Input>
                    <Clerk.FieldError className="text-sm text-red-400 mt-1" />
                  </Clerk.Field>
                  <SignUp.Action submit asChild>
                    <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--bkl-color-accent-primary)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--bkl-color-accent-hover)] transition-all shadow-[var(--bkl-shadow-glow)]">
                      Verify email
                    </button>
                  </SignUp.Action>
                </div>
              </SignUp.Strategy>
            </SignUp.Step>
          </SignUp.Root>
        </div>
      </div>
    </main>
  );
}
