"use client";

import Link from "next/link";
import * as Clerk from "@clerk/elements/common";
import * as SignUp from "@clerk/elements/sign-up";

const fieldClasses =
  "w-full rounded-xl border border-white/15 bg-stone-900/60 px-4 py-3 text-white placeholder:text-stone-500 focus:border-blue-400 focus:outline-none";

/**
 * Presents the multi-step Clerk Elements sign-up flow with the custom Binnacle layout.
 */
export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-stone-950 via-stone-950/95 to-stone-900 px-4 py-16 text-white">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2.25rem] border border-white/10 bg-stone-950/80 shadow-[0_40px_80px_rgba(2,6,23,0.55)] backdrop-blur-xl lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <section className="hidden flex-col justify-between border-b border-white/10 bg-gradient-to-br from-blue-600/40 via-indigo-600/30 to-sky-500/30 p-10 lg:flex">
          <div className="flex flex-col gap-6">
            <Link href="/" className="text-sm uppercase tracking-[0.3em] text-blue-100/80">
              Binnacle
            </Link>
            <h1 className="text-4xl font-semibold leading-tight text-white">
              Chart a smarter backlog.
            </h1>
            <p className="max-w-sm text-base text-blue-100/90">
              Build your library, log every play session, and invite your crew to discover new adventures together.
            </p>
          </div>
          <ul className="flex flex-col gap-4 text-sm text-blue-100/90">
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-full bg-blue-300" />
              Curate personalized lists for every mood or gaming night.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-full bg-sky-300" />
              Keep progress synced across platforms with automated updates.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-full bg-indigo-300" />
              Share reviews and recommendations instantly with friends.
            </li>
          </ul>
        </section>
        <div className="flex flex-col gap-8 p-8 sm:p-12">
          <header className="flex flex-col gap-2 text-left lg:hidden">
            <Link href="/" className="text-sm uppercase tracking-[0.3em] text-blue-300/70">
              Binnacle
            </Link>
            <h1 className="text-3xl font-semibold">Create your free account</h1>
            <p className="max-w-md text-base text-stone-300">
              Start curating your backlog, track every play session, and follow what friends are playing.
            </p>
          </header>
          <SignUp.Root routing="path" path="/sign-up">
            <SignUp.Step name="start" className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <Clerk.Connection name="google" asChild>
                  <button className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-stone-900/70 px-4 py-3 text-sm font-medium text-white hover:border-blue-400/70 hover:text-blue-100 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 533.5 544.3" className="h-5 w-5" aria-hidden="true">
                      <path fill="#4285f4" d="M533.5 278.4c0-17.4-1.5-34.1-4.3-50.4H272v95.3h147.5c-6.4 34.5-26.1 63.7-55.6 83.3v68.9h89.8c52.6-48.4 82.8-119.7 82.8-197.1" />
                      <path fill="#34a853" d="M272 544.3c74.9 0 137.7-24.7 183.6-67.3l-89.8-68.9c-24.9 16.7-56.7 26.5-93.8 26.5-71.9 0-132.9-48.6-154.7-114.1H24.9v71.6c45.5 90.2 139.1 152.2 247.1 152.2" />
                      <path fill="#fbbc05" d="M117.3 320.5c-11.2-33.5-11.2-69.7 0-103.2V145.7h-92.4c-39.4 78.8-39.4 171.4 0 250.2z" />
                      <path fill="#ea4335" d="M272 107.7c40.7-.6 79.8 14.9 109.6 43.5l81.6-81.6C421.4 24.6 349.2-1.1 272 0 164.1 0 70.4 62 24.9 152.2l92.4 71.6C139.1 156.3 200.1 107.7 272 107.7" />
                    </svg>
                    Continue with Google
                  </button>
                </Clerk.Connection>
                <Clerk.Connection name="apple" asChild>
                  <button className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-stone-900/60 px-4 py-3 text-sm font-medium text-white hover:border-stone-300/70 hover:text-stone-100 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 814 1000" className="h-5 w-5" aria-hidden="true">
                      <path fill="currentColor" d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
                    </svg>
                    Continue with Apple
                  </button>
                </Clerk.Connection>
                <Clerk.Connection name="discord" asChild>
                  <button className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-stone-900/60 px-4 py-3 text-sm font-medium text-white hover:border-indigo-400/70 hover:text-indigo-100 transition">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-400 text-xs font-bold text-stone-900">D</span>
                    Continue with Discord
                  </button>
                </Clerk.Connection>
              </div>
              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.35em] text-stone-500">
                <span className="h-px flex-1 bg-white/10" />
                or
                <span className="h-px flex-1 bg-white/10" />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Clerk.Field name="firstName">
                    <Clerk.Label className="text-sm text-stone-300">First name</Clerk.Label>
                    <Clerk.Input asChild>
                      <input className={fieldClasses} autoComplete="given-name" />
                    </Clerk.Input>
                    <Clerk.FieldError className="text-sm text-red-400" />
                  </Clerk.Field>
                  <Clerk.Field name="lastName">
                    <Clerk.Label className="text-sm text-stone-300">Last name</Clerk.Label>
                    <Clerk.Input asChild>
                      <input className={fieldClasses} autoComplete="family-name" />
                    </Clerk.Input>
                    <Clerk.FieldError className="text-sm text-red-400" />
                  </Clerk.Field>
                </div>
                <Clerk.Field name="username">
                  <Clerk.Label className="text-sm text-stone-300">Username</Clerk.Label>
                  <Clerk.Input asChild>
                    <input className={fieldClasses} autoComplete="username" />
                  </Clerk.Input>
                  <Clerk.FieldError className="text-sm text-red-400" />
                </Clerk.Field>
                <Clerk.Field name="emailAddress">
                  <Clerk.Label className="text-sm text-stone-300">Email address</Clerk.Label>
                  <Clerk.Input asChild>
                    <input className={fieldClasses} type="email" autoComplete="email" />
                  </Clerk.Input>
                  <Clerk.FieldError className="text-sm text-red-400" />
                </Clerk.Field>
                <Clerk.Field name="password">
                  <Clerk.Label className="text-sm text-stone-300">Password</Clerk.Label>
                  <Clerk.Input asChild>
                    <input className={fieldClasses} type="password" autoComplete="new-password" />
                  </Clerk.Input>
                  <Clerk.FieldError className="text-sm text-red-400" />
                </Clerk.Field>
              </div>
              <SignUp.Captcha className="rounded-xl border border-white/10 bg-stone-900/60 px-4 py-3" />
              <SignUp.Action submit asChild>
                <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400">
                  Create account
                </button>
              </SignUp.Action>
              <Clerk.Link
                navigate="sign-in"
                className="text-sm text-stone-400 transition hover:text-blue-200"
              >
                Already have an account?
                <span className="ml-2 text-blue-300">Sign in</span>
              </Clerk.Link>
            </SignUp.Step>
            <SignUp.Step name="continue" className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-semibold">Complete your profile</h2>
                <p className="text-sm text-stone-400">
                  Help us personalize your experience by completing your profile.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Clerk.Field name="firstName">
                    <Clerk.Label className="text-sm text-stone-300">First name</Clerk.Label>
                    <Clerk.Input asChild>
                      <input className={fieldClasses} autoComplete="given-name" />
                    </Clerk.Input>
                    <Clerk.FieldError className="text-sm text-red-400" />
                  </Clerk.Field>
                  <Clerk.Field name="lastName">
                    <Clerk.Label className="text-sm text-stone-300">Last name</Clerk.Label>
                    <Clerk.Input asChild>
                      <input className={fieldClasses} autoComplete="family-name" />
                    </Clerk.Input>
                    <Clerk.FieldError className="text-sm text-red-400" />
                  </Clerk.Field>
                </div>
                <Clerk.Field name="username">
                  <Clerk.Label className="text-sm text-stone-300">Username</Clerk.Label>
                  <Clerk.Input asChild>
                    <input className={fieldClasses} autoComplete="username" />
                  </Clerk.Input>
                  <Clerk.FieldError className="text-sm text-red-400" />
                </Clerk.Field>
              </div>
              <SignUp.Action submit asChild>
                <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400">
                  Continue to Binnacle
                </button>
              </SignUp.Action>
            </SignUp.Step>
            <SignUp.Step name="verifications" className="flex flex-col gap-6">
              <SignUp.Strategy name="email_code">
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-stone-300">
                    Enter the verification code we sent to your inbox so we can secure your new account.
                  </p>
                  <Clerk.Field name="code">
                    <Clerk.Label className="text-sm text-stone-300">Verification code</Clerk.Label>
                    <Clerk.Input asChild>
                      <input className={fieldClasses} inputMode="numeric" />
                    </Clerk.Input>
                    <Clerk.FieldError className="text-sm text-red-400" />
                  </Clerk.Field>
                  <SignUp.Action submit asChild>
                    <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400">
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
