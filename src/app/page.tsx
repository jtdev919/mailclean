"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  if (status === "loading" || session) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            MailClean
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            Clean up your Gmail inbox in seconds. Remove spam, junk, and
            unwanted emails — take back control of your email.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => signIn("google")}
            className="w-full flex items-center justify-center gap-3 rounded-lg bg-white px-6 py-3 text-base font-medium text-gray-700 shadow-md ring-1 ring-gray-300 hover:bg-gray-50 hover:shadow-lg transition-all cursor-pointer"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </button>
          <p className="text-sm text-gray-500">
            We only access your email metadata to help you clean up. We never
            read your email content.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">1</div>
            <p className="text-sm text-gray-600 mt-1">Sign in</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">2</div>
            <p className="text-sm text-gray-600 mt-1">Review</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">3</div>
            <p className="text-sm text-gray-600 mt-1">Clean</p>
          </div>
        </div>
      </div>
    </div>
  );
}
