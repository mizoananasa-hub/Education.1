import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, ArrowLeft, Loader2, Clock } from "lucide-react";

const schema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  grade: z.coerce.number().min(1, "Grade must be 1–12").max(12, "Grade must be 1–12"),
  religion: z.enum(["Islamic", "Christian"]),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

type FormData = z.infer<typeof schema>;

export default function StudentSignup() {
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "", grade: 1, religion: "Islamic", password: "", confirmPassword: "" },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch(getApiUrl("/api/auth/student/signup"), {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Signup failed");
      return json;
    },
    onSuccess: () => setSubmitted(true),
    onError: (err: Error) => toast({ title: "Signup failed", description: err.message, variant: "destructive" }),
  });

  if (submitted) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-card border border-card-border rounded-2xl shadow-xl p-12">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-6">
              <Clock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Account Pending Approval</h2>
            <p className="text-muted-foreground mb-6">Your account has been submitted. An administrator will review and approve it. You'll be able to sign in once approved.</p>
            <Link href="/student/signin"><Button className="w-full h-12">Go to Sign In</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-xl">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to home
        </Link>
        <div className="bg-card border border-card-border rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8 sm:p-12">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Create Student Account</h1>
            <p className="text-muted-foreground mb-2">Join Learnova to access your learning materials.</p>
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-8">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              Your account requires admin approval before you can sign in.
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((d) => signupMutation.mutate(d))} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                      <FormControl><Input type="email" placeholder="john@example.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="grade" render={({ field }) => (
                    <FormItem><FormLabel>Grade (1–12)</FormLabel><FormControl><Input type="number" min={1} max={12} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="religion" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Religion</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select religion" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Islamic">Islamic</SelectItem>
                          <SelectItem value="Christian">Christian</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="Min. 6 characters" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                    <FormItem><FormLabel>Confirm Password</FormLabel><FormControl><Input type="password" placeholder="Repeat password" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <Button type="submit" className="w-full h-12 text-base font-medium mt-4" disabled={signupMutation.isPending}>
                  {signupMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account…</> : "Create Account"}
                </Button>
              </form>
            </Form>
            <div className="mt-8 text-center text-sm text-muted-foreground border-t border-border pt-6">
              Already have an account?{" "}
              <Link href="/student/signin" className="text-primary font-medium hover:underline">Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
