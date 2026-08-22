import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateRun, TestResultModule } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Play, Lock, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const ALL_MODULES = Object.values(TestResultModule);

export default function NewRun() {
  const { canCreateRun } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createRun = useCreateRun();

  const [url, setUrl] = useState("https://store.company.com");
  const [environmentTag, setEnvironmentTag] = useState("staging");
  const [selectedModules, setSelectedModules] = useState<string[]>(ALL_MODULES);
  const [testUsername, setTestUsername] = useState("");
  const [testPassword, setTestPassword] = useState("");

  const toggleModule = (module: string) => {
    setSelectedModules(prev =>
      prev.includes(module)
        ? prev.filter(m => m !== module)
        : [...prev, module]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) {
      toast({ title: "Error", description: "Target URL is required", variant: "destructive" });
      return;
    }
    if (selectedModules.length === 0) {
      toast({ title: "Error", description: "Select at least one module to test", variant: "destructive" });
      return;
    }
    createRun.mutate(
      { data: { url, environmentTag: environmentTag || undefined, moduleSelection: selectedModules, testUsername: testUsername || undefined, testPassword: testPassword || undefined } },
      {
        onSuccess: (run) => {
          toast({ title: "Test run initiated", description: "Navigating to run details..." });
          setLocation(`/runs/${run.id}`);
        },
        onError: (err: any) => {
          toast({ title: "Failed to create test run", description: err.response?.data?.error || err.message, variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Initiate Test Run</h2>
        <p className="text-muted-foreground mt-1">Configure and launch a new automated test suite.</p>
      </div>

      {/* Access notice — shown only when user is NOT allowed */}
      {!canCreateRun && (
        <div className="flex items-start gap-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3">
          <Lock className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
          <p className="text-sm text-rose-400 leading-relaxed">
            <span className="font-semibold">Access restricted.</span>{" "}
            Please drop an email to{" "}
            <a href="mailto:genai.omg.@gmail.com" className="underline underline-offset-2 font-medium hover:text-rose-300 transition-colors">
              genai.omg.@gmail.com
            </a>{" "}
            to get access!!
          </p>
        </div>
      )}

      <fieldset disabled={!canCreateRun} className={!canCreateRun ? "opacity-50 [&_*]:cursor-not-allowed" : ""}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>Target Configuration</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="url">Target URL</Label>
                  <Input id="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." data-testid="input-run-url" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="env">Environment Tag (Optional)</Label>
                  <Input id="env" value={environmentTag} onChange={e => setEnvironmentTag(e.target.value)} placeholder="e.g. staging, prod-eu" data-testid="input-run-env" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test Credentials</CardTitle>
                <CardDescription>Leave blank to use default configuration.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" value={testUsername} onChange={e => setTestUsername(e.target.value)} data-testid="input-run-username" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={testPassword} onChange={e => setTestPassword(e.target.value)} data-testid="input-run-password" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Module Selection</CardTitle>
                <CardDescription>Select areas to cover.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ALL_MODULES.map(module => (
                    <div key={module} className="flex items-center space-x-2">
                      <Checkbox
                        id={`module-${module}`}
                        checked={selectedModules.includes(module)}
                        onCheckedChange={() => toggleModule(module)}
                        data-testid={`checkbox-module-${module}`}
                      />
                      <Label htmlFor={`module-${module}`} className="capitalize cursor-pointer">{module}</Label>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Button variant="outline" size="sm" onClick={(e) => { e.preventDefault(); setSelectedModules(ALL_MODULES); }} className="w-full text-xs">
                  Select All
                </Button>
              </CardFooter>
            </Card>

            <Button
              type={canCreateRun ? "submit" : "button"}
              onClick={canCreateRun ? handleSubmit : undefined}
              className="w-full h-12 text-lg font-medium shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all"
              disabled={!canCreateRun || createRun.isPending}
              data-testid="btn-submit-run"
            >
              {!canCreateRun ? (
                <><Mail className="w-5 h-5 mr-2" /> Request Access</>
              ) : createRun.isPending ? "Initiating..." : (
                <><Play className="w-5 h-5 mr-2" /> Launch Test Run</>
              )}
            </Button>
          </div>
        </div>
      </fieldset>
    </div>
  );
}
