import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { useState } from "react";

const schema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  grade: z.coerce.number().min(1).max(12),
  religion: z.enum(["Islamic", "Christian"]),
  parentContact: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function StudentRequest() {
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", grade: 1, religion: "Islamic", parentContact: "" },
  });

  const requestMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch(getApiUrl("/api/auth/student/request"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      return json;
    },
    onSuccess: () => setSubmitted(true),
    onError: (err: Error) => {
      toast({ title: "Request failed", description: err.message, variant: "destructive" });
    },
  });

  if (submitted) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-card border border-card-border rounded-2xl shadow-xl p-12">
            <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Request Submitted!</h2>
            <p className="text-muted-foreground mb-6">
              Your enrollment request has been submitted successfully. The admin will review it and you'll receive your student code and password once approved.
            </p>
            <Link href="/student/signin">
              <Button className="w-full h-12">Go to Sign In</Button>
            </Link>
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

            <h1 className="text-3xl font-bold tracking-tight mb-2">Request Student Account</h1>
            <p className="text-muted-foreground mb-2">Submit your enrollment request. An admin will review and approve it.</p>
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-8">
              <span className="font-medium">Note:</span> You'll receive a student code and password after admin approval.
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit((d) => requestMutation.mutate(d))} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="grade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grade (1–12)</FormLabel>
                        <FormControl><Input type="number" min={1} max={12} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="religion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Religion</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select religion" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Islamic">Islamic</SelectItem>
                            <SelectItem value="Christian">Christian</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="parentContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parent Phone/Email <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                        <FormControl><Input placeholder="+1 234 567 8900" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" className="w-full h-12 text-base font-medium mt-4" disabled={requestMutation.isPending}>
                  {requestMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>
                  ) : "Submit Enrollment Request"}
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
