"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Activity } from "lucide-react";

type Action = (
  prev: unknown,
  formData: FormData
) => Promise<{ error?: string } | void>;

export function AuthForm({
  action,
  mode,
  siteName,
}: {
  action: Action;
  mode: "login" | "setup";
  siteName: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const isSetup = mode === "setup";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Activity className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">{siteName}</h1>
            <p className="text-sm text-muted-foreground">
              {isSetup ? "Create your owner account" : "Sign in to the admin panel"}
            </p>
          </div>
        </div>

        <form action={formAction} className="space-y-4 rounded-[var(--radius)] border border-border bg-card p-6 shadow-sm">
          {isSetup && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="Jane Doe" autoComplete="name" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="you@example.com" autoComplete="email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              autoComplete={isSetup ? "new-password" : "current-password"}
            />
            {isSetup && (
              <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
            )}
          </div>

          {state?.error && (
            <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Please wait…" : isSetup ? "Create account" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
