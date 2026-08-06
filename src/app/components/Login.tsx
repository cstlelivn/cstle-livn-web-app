import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { initializeDatabase, apiCall } from "../utils/supabase/client.tsx";
import svgPaths from "../imports/svg-ydinhr03gq";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Alert, AlertDescription } from "./ui/alert";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { isWorkPortalHost } from "../src/lib/workPortal";

function Logo() {
  return (
    <div className="h-[41.657px] relative w-[64px]">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 64 42">
        <g>
          <path d={svgPaths.pa34ae40} fill="white" />
          <path d={svgPaths.p4786000} fill="white" />
        </g>
      </svg>
    </div>
  );
}

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"Super Admin" | "Manager" | "Contractor" | "Associate">("Associate");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Load saved email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("cstle-livn-remembered-email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      // Handle remember me - save or clear email
      if (rememberMe) {
        localStorage.setItem("cstle-livn-remembered-email", email);
      } else {
        localStorage.removeItem("cstle-livn-remembered-email");
      }

      if (isSignUp) {
        await signUp(email, password, name, role);
        setSuccess("Account created successfully! Logging you in...");
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      const errorMessage = err.message || "Authentication failed. Please try again.";
      const errorMessageLower = errorMessage.toLowerCase();
      
      // Check if this is a 409 conflict (user already exists)
      if (err.status === 409 || err.data?.userExists || errorMessageLower.includes("already registered") || errorMessageLower.includes("account recovered")) {
        // Check if account was recovered
        const wasRecovered = err.data?.recovered || errorMessageLower.includes("recovered");
        const message = wasRecovered 
          ? "✓ Account recovered! Switching to Sign In mode..."
          : "✓ This email is already registered. Switching to Sign In mode...";
        
        setError(message);
        // Auto-switch to sign in mode
        setTimeout(() => {
          setIsSignUp(false);
          setError(null);
          const successMsg = wasRecovered
            ? "Your account has been recovered. Please sign in with your password."
            : "Please enter your password to sign in with your existing account.";
          setSuccess(successMsg);
        }, 1500);
      } else if (errorMessage.includes("Invalid login credentials")) {
        setError("Invalid email or password. If you haven't created an account yet, please click 'Sign Up' below to create one first.");
      } else if (errorMessage.includes("Email not confirmed")) {
        setError("Please confirm your email address before signing in.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitialize = async () => {
    setError(null);
    setSuccess(null);
    setIsInitializing(true);

    try {
      const result = await initializeDatabase();
      setSuccess(result.message || "Database initialized successfully!");
    } catch (err: any) {
      setError(err.message || "Initialization failed. Please try again.");
    } finally {
      setIsInitializing(false);
    }
  };

  const handleDebugCheck = async () => {
    if (!email) {
      setError("Please enter an email address to check");
      return;
    }

    try {
      const result = await fetch(
        `https://${window.location.hostname.includes('localhost') ? 'YOUR_PROJECT_ID' : window.location.hostname.split('.')[0]}.supabase.co/functions/v1/make-server-bcab437c/debug/user/${encodeURIComponent(email)}`
      );
      const data = await result.json();
      setDebugInfo(data);
      setShowDebugInfo(true);
    } catch (err: any) {
      setError("Debug check failed: " + err.message);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-[32px]">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex justify-center mb-[48px]">
          <Logo />
        </div>

        {/* Card */}
        <div className="bg-card rounded-[var(--radius-card)] border border-border p-[32px]">
          <div className="mb-[24px]">
            <h2 className="font-['Anybody'] text-[24px] tracking-[-0.6px] text-foreground mb-[8px]" style={{ fontVariationSettings: "'wdth' 137", fontWeight: 800 }}>
              {isSignUp ? "Create Account" : "Welcome Back"}
            </h2>
            <p className="font-['Roboto_Mono'] text-[11px] text-muted-foreground">
              {isSignUp ? "Sign up to get started with Cstle Livn" : "Sign in to your account"}
            </p>
          </div>

          {error && (
            <Alert className="mb-[16px] bg-destructive/10 border-destructive/20">
              <AlertDescription className="font-['Roboto_Mono'] text-[11px] text-destructive">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-[16px] bg-success/10 border-success/20">
              <AlertDescription className="font-['Roboto_Mono'] text-[11px] text-success">
                {success}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-[16px]">
            {isSignUp && (
              <div>
                <Label htmlFor="name" className="font-['Roboto_Mono'] text-[11px] font-bold">
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isSignUp}
                  className="mt-[4px] font-['Roboto_Mono'] text-[14px]"
                  placeholder="John Doe"
                />
              </div>
            )}

            <div>
              <Label htmlFor="email" className="font-['Roboto_Mono'] text-[11px] font-bold">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-[4px] font-['Roboto_Mono'] text-[14px]"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <Label htmlFor="password" className="font-['Roboto_Mono'] text-[11px] font-bold">
                Password
              </Label>
              <div className="relative mt-[4px]">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="font-['Roboto_Mono'] text-[14px] pr-[40px]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#111111] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!isSignUp && (
              <div className="flex items-center gap-[8px]">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  className="h-[16px] w-[16px]"
                />
                <Label
                  htmlFor="remember"
                  className="font-['Roboto_Mono'] text-[11px] font-normal cursor-pointer text-muted-foreground"
                >
                  Remember my email
                </Label>
              </div>
            )}

            {isSignUp && !isWorkPortalHost() && (
              <div>
                <Label htmlFor="role" className="font-['Roboto_Mono'] text-[11px] font-bold">
                  Role
                </Label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="mt-[4px] w-full h-[40px] rounded-[var(--radius)] border border-border bg-input-background px-[12px] font-['Roboto_Mono'] text-[14px] focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="Associate">Associate</option>
                  <option value="Contractor">Contractor</option>
                </select>
                <p className="mt-[8px] font-['Roboto_Mono'] text-[9px] text-muted-foreground">
                  Note: Only Super Admins can assign Manager or Super Admin roles. Your role can be updated later by an administrator.
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full font-['Roboto_Mono'] text-[14px] h-[44px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-[8px] h-[16px] w-[16px] animate-spin" />
                  {isSignUp ? "Creating Account..." : "Signing In..."}
                </>
              ) : (
                <>{isSignUp ? "Create Account" : "Sign In"}</>
              )}
            </Button>
          </form>

          <div className="mt-[24px] text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setSuccess(null);
              }}
              className="font-['Roboto_Mono'] text-[11px] text-primary hover:text-primary/80 transition-colors"
            >
              {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-[24px] bg-muted/30 rounded-[var(--radius)] p-[16px]">
          <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground mb-[8px]">
            {isSignUp 
              ? "Getting Started with Cstle Livn"
              : "Sign in with your registered account"
            }
          </p>
          {isSignUp && isWorkPortalHost() && (
            <p className="font-['Roboto_Mono'] text-[9px] text-muted-foreground">
              Create your account to see the tasks assigned to you and log your time on site.
            </p>
          )}
          {isSignUp && !isWorkPortalHost() && (
            <div className="space-y-[4px]">
              <p className="font-['Roboto_Mono'] text-[9px] text-muted-foreground">
                • <span className="text-foreground">Associate:</span> Can view projects, vendors, team, and inventory
              </p>
              <p className="font-['Roboto_Mono'] text-[9px] text-muted-foreground">
                • <span className="text-foreground">Contractor:</span> Can view and work on projects & inventory
              </p>
              <p className="mt-[8px] font-['Roboto_Mono'] text-[9px] text-accent">
                💡 Manager and Super Admin roles can only be assigned by existing Super Admins through User Management
              </p>
            </div>
          )}
          {!isSignUp && (
            <div className="space-y-[4px]">
              <p className="font-['Roboto_Mono'] text-[9px] text-success">
                ℹ️ First time? Click "Sign Up" above to create your account.
              </p>
              <p className="font-['Roboto_Mono'] text-[9px] text-muted-foreground">
                Returning user? Enter your email and password to sign in.
              </p>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}