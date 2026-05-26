import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { GraduationCap, ArrowLeft, Loader2 } from "lucide-react";
import { getApiUrl } from "@/lib/api";

const schema = z.object({
  identifier: z.string().min(1, "Student code or email is required"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

export default function StudentSignin() {
  const [_, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "", password: "" },
  });

  const signinMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch(getApiUrl("/api/auth/student/signin"), {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Sign in failed");
      return json;
    },
    onSuccess: (res) => {
      login(res.token);
      toast({ title: "Welcome back!", description: "Signed in to Learnova." });
      setLocation("/student");
    },
    onError: (err: Error) => toast({ title: "Sign in failed", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to home
        </Link>
        <div className="bg-card border border-card-border rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8 sm:p-12">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Student Portal</h1>
            <p className="text-muted-foreground mb-8">Sign in with your student code or email.</p>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((d) => signinMutation.mutate(d))} className="space-y-6">
                <FormField control={form.control} name="identifier" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student Code or Email</FormLabel>
                    <FormControl><Input placeholder="STU-1001 or email@example.com" {...field} className="h-12" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl><Input type="password" placeholder="••••••••" {...field} className="h-12" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full h-12 text-base font-medium" disabled={signinMutation.isPending}>
                  {signinMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…</> : "Sign in"}
                </Button>
              </form>
            </Form>
            <div className="mt-8 text-center text-sm text-muted-foreground border-t border-border pt-6">
              Don't have an account?{" "}
              <Link href="/student/signup" className="text-primary font-medium hover:underline">Create one</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
