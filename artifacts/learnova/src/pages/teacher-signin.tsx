import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTeacherSignin } from "@workspace/api-client-react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, ArrowLeft, Loader2 } from "lucide-react";

const SUBJECTS = [
  "Mathematics",
  "French",
  "English",
  "Arabic",
  "ICT",
  "Science",
  "Social Studies",
  "Islamic Revision",
  "Christian Religion",
  "Biology",
  "Physics",
  "Chemistry",
] as const;

const schema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  subject: z.string().min(1, "Please select a subject"),
  subjectPassword: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

export default function TeacherSignin() {
  const [_, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      subject: "",
      subjectPassword: "",
    },
  });

  const signinMutation = useTeacherSignin();

  const onSubmit = (data: FormData) => {
    signinMutation.mutate({ data }, {
      onSuccess: (res) => {
        login(res.token);
        toast({
          title: "Welcome back!",
          description: "Successfully signed in to Teacher Portal.",
        });
        setLocation("/teacher");
      },
      onError: (err: any) => {
        toast({
          title: "Sign in failed",
          description: err.data?.error || "Invalid credentials.",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to home
        </Link>

        <div className="bg-card border border-card-border rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8 sm:p-12">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
              <BookOpen className="w-6 h-6" />
            </div>

            <h1 className="text-3xl font-bold tracking-tight mb-2">Teacher Portal</h1>
            <p className="text-muted-foreground mb-8">Sign in to manage your classes.</p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Mr. Smith" {...field} className="h-12" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger
                            className="h-12 transition-all duration-200 focus:ring-2 focus:ring-primary/40 hover:border-primary/50 hover:shadow-sm data-[state=open]:ring-2 data-[state=open]:ring-primary/40 data-[state=open]:border-primary"
                          >
                            <SelectValue placeholder="Select your subject…" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="animate-in fade-in-0 zoom-in-95 duration-150">
                          {SUBJECTS.map((s) => (
                            <SelectItem
                              key={s}
                              value={s}
                              className="cursor-pointer transition-colors hover:bg-primary/8 focus:bg-primary/10 py-2.5"
                            >
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subjectPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} className="h-12" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-medium"
                  disabled={signinMutation.isPending}
                >
                  {signinMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…</>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
