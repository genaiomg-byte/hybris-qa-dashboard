import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TestTubeDiagonal, Github, ArrowLeft, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Mode = "signin" | "signup" | "reset";

export default function Login() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { toast } = useToast();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error: any) {
      toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords do not match", description: "Please make sure both passwords are identical.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      toast({
        title: "Account created",
        description: "Check your email for a confirmation link before signing in.",
      });
      setMode("signin");
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (error: any) {
      toast({ title: "Reset failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    try {
      await supabase.auth.signInWithOAuth({ provider: "github" });
    } catch (error: any) {
      toast({ title: "GitHub login failed", description: error.message, variant: "destructive" });
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setResetSent(false);
    setPassword("");
    setConfirmPassword("");
  };

  const titles: Record<Mode, { title: string; description: string }> = {
    signin: { title: "Sign In", description: "Enter your credentials to access the control room." },
    signup: { title: "Create Account", description: "Set up your Storefront.QA access." },
    reset: { title: "Reset Password", description: "We'll send a reset link to your email." },
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 dark">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mb-4 text-primary">
            <TestTubeDiagonal className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Storefront.QA</h1>
          <p className="text-muted-foreground mt-2">B2C Ecommerce Test Automation Dashboard</p>
        </div>

        <Card className="border-border">
          <CardHeader>
            {mode !== "signin" && (
              <button
                onClick={() => switchMode("signin")}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2 -mt-1"
                data-testid="btn-back-to-signin"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </button>
            )}
            <CardTitle>{titles[mode].title}</CardTitle>
            <CardDescription>{titles[mode].description}</CardDescription>
          </CardHeader>

          <CardContent>
            {/* ── Reset sent confirmation ── */}
            {mode === "reset" && resetSent ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
                <p className="text-sm text-foreground font-medium">Reset link sent</p>
                <p className="text-xs text-muted-foreground">
                  Check <span className="text-foreground">{email}</span> for a password reset link.
                </p>
                <Button variant="outline" className="mt-2 w-full" onClick={() => switchMode("signin")} data-testid="btn-back-after-reset">
                  Back to sign in
                </Button>
              </div>
            ) : mode === "signin" ? (
              <>
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="engineer@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      data-testid="input-login-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <button
                        type="button"
                        onClick={() => switchMode("reset")}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        data-testid="btn-forgot-password"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      data-testid="input-login-password"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading} data-testid="btn-login-submit">
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>

                <div className="mt-6 flex items-center">
                  <div className="flex-grow border-t border-border" />
                  <span className="mx-4 text-xs text-muted-foreground uppercase">Or</span>
                  <div className="flex-grow border-t border-border" />
                </div>

                <Button variant="outline" className="w-full mt-4" onClick={handleGithubLogin} data-testid="btn-login-github">
                  <Github className="w-5 h-5 mr-2" />
                  Continue with GitHub
                </Button>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                  No account?{" "}
                  <button
                    onClick={() => switchMode("signup")}
                    className="text-primary hover:underline font-medium"
                    data-testid="btn-go-to-signup"
                  >
                    Create one
                  </button>
                </p>
              </>
            ) : mode === "signup" ? (
              <>
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="engineer@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      data-testid="input-signup-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      data-testid="input-signup-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      data-testid="input-signup-confirm-password"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading} data-testid="btn-signup-submit">
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>

                <div className="mt-6 flex items-center">
                  <div className="flex-grow border-t border-border" />
                  <span className="mx-4 text-xs text-muted-foreground uppercase">Or</span>
                  <div className="flex-grow border-t border-border" />
                </div>

                <Button variant="outline" className="w-full mt-4" onClick={handleGithubLogin} data-testid="btn-signup-github">
                  <Github className="w-5 h-5 mr-2" />
                  Continue with GitHub
                </Button>
              </>
            ) : (
              /* Reset password form */
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="engineer@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="input-reset-email"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading} data-testid="btn-reset-submit">
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
