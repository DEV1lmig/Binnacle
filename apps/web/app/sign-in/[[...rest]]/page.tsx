"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import { AuthLayout } from "../../components/auth/AuthLayout";

export default function SignInPage() {
  return (
    <AuthLayout>
      <SignIn.Root routing="path" path="/sign-in">
        <SignIn.Step name="start" className="flex flex-col gap-6">
          <header className="mb-2">
            <h1 className="text-[2.5rem] font-bold text-gray-900 tracking-tight">Sign in</h1>
          </header>

          {/* Fields */}
          <div className="flex flex-col gap-5">
            <Clerk.Field name="identifier">
              <Clerk.Label className="text-sm font-semibold text-gray-700 mb-2 block">
                Email
              </Clerk.Label>
              <Clerk.Input asChild>
                <input
                  className="w-full border-b-2 border-gray-200 focus:border-[#F97380] py-2 outline-none transition-colors text-gray-800 placeholder-gray-400 bg-transparent"
                  autoComplete="email"
                  placeholder="demo@email.com"
                />
              </Clerk.Input>
              <Clerk.FieldError className="text-xs text-red-500 mt-1 block" />
            </Clerk.Field>

            <Clerk.Field name="password">
              <Clerk.Label className="text-sm font-semibold text-gray-700 mb-2 block">
                Password
              </Clerk.Label>
              <div className="relative">
                <Clerk.Input asChild>
                  <input
                    className="w-full border-b-2 border-gray-200 focus:border-[#F97380] py-2 outline-none transition-colors text-gray-800 placeholder-gray-400 bg-transparent pr-10"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                  />
                </Clerk.Input>
                {/* Eye icon placeholder */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </div>
              </div>
              <Clerk.FieldError className="text-xs text-red-500 mt-1 block" />
            </Clerk.Field>
          </div>

          <div className="flex items-center justify-between mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-[#F97380] rounded border-gray-300" />
              <span className="text-xs font-semibold text-gray-700">Remember Me</span>
            </label>
            <SignIn.Action navigate="forgot-password" asChild>
              <button className="text-xs font-semibold text-[#F97380] hover:text-[#e45a66] transition-colors bg-transparent border-none p-0 cursor-pointer">
                Forgot Password?
              </button>
            </SignIn.Action>
          </div>

          <div className="mt-4">
            <SignIn.Action submit asChild>
              <button
                className="w-full bg-[#F97380] hover:bg-[#e45a66] text-white font-bold py-4 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
              >
                Login
              </button>
            </SignIn.Action>
          </div>

          <p className="text-center text-xs font-medium text-gray-500 mt-4">
            Don&apos;t have an Account?{" "}
            <Clerk.Link navigate="sign-up" className="text-[#F97380] hover:text-[#e45a66] font-bold bg-transparent border-none p-0 cursor-pointer">
              Sign up
            </Clerk.Link>
          </p>

          <div className="flex items-center gap-4 mt-6">
            <span className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-semibold text-gray-400 uppercase">or connect with</span>
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          <div className="flex flex-col gap-3 mt-2">
            <Clerk.Connection name="google" asChild>
              <button className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-gray-100 py-3 font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 533.5 544.3" className="h-4 w-4" aria-hidden="true">
                  <path fill="#4285f4" d="M533.5 278.4c0-17.4-1.5-34.1-4.3-50.4H272v95.3h147.5c-6.4 34.5-26.1 63.7-55.6 83.3v68.9h89.8c52.6-48.4 82.8-119.7 82.8-197.1" />
                  <path fill="#34a853" d="M272 544.3c74.9 0 137.7-24.7 183.6-67.3l-89.8-68.9c-24.9 16.7-56.7 26.5-93.8 26.5-71.9 0-132.9-48.6-154.7-114.1H24.9v71.6c45.5 90.2 139.1 152.2 247.1 152.2" />
                  <path fill="#fbbc05" d="M117.3 320.5c-11.2-33.5-11.2-69.7 0-103.2V145.7h-92.4c-39.4 78.8-39.4 171.4 0 250.2z" />
                  <path fill="#ea4335" d="M272 107.7c40.7-.6 79.8 14.9 109.6 43.5l81.6-81.6C421.4 24.6 349.2-1.1 272 0 164.1 0 70.4 62 24.9 152.2l92.4 71.6C139.1 156.3 200.1 107.7 272 107.7" />
                </svg>
                Google
              </button>
            </Clerk.Connection>
            <Clerk.Connection name="discord" asChild>
              <button className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-gray-100 py-3 font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#5865F2" aria-hidden="true">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                Discord
              </button>
            </Clerk.Connection>
          </div>
        </SignIn.Step>

        <SignIn.Step name="verifications" className="flex flex-col gap-6">
          <SignIn.Strategy name="email_code">
            <header className="mb-2">
              <h1 className="text-[2rem] font-bold text-gray-900 tracking-tight">Check your email</h1>
              <p className="text-gray-500 font-medium mt-1">Enter the verification code sent to you</p>
            </header>
            <div className="flex flex-col gap-4">
              <Clerk.Field name="code">
                <Clerk.Label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Verification Code
                </Clerk.Label>
                <Clerk.Input asChild>
                  <input
                    className="w-full border-b-2 border-gray-200 focus:border-[#F97380] py-2 outline-none transition-colors text-gray-800 placeholder-gray-400 bg-transparent text-center text-xl tracking-widest font-mono"
                    inputMode="numeric"
                  />
                </Clerk.Input>
                <Clerk.FieldError className="text-xs text-red-500 mt-1 block" />
              </Clerk.Field>
              <SignIn.Action submit asChild>
                <button className="w-full bg-[#F97380] hover:bg-[#e45a66] text-white font-bold py-4 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] mt-4">
                  Verify and continue
                </button>
              </SignIn.Action>
            </div>
          </SignIn.Strategy>
        </SignIn.Step>
      </SignIn.Root>
    </AuthLayout>
  );
}
