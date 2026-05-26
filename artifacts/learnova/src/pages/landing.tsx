import { Link } from "wouter";
import { ArrowRight, BookOpen, GraduationCap, Shield, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/30">
      <header className="px-6 py-6 lg:px-12 flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-md">
            L
          </div>
          <span className="font-semibold text-xl tracking-tight">Learnova</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/teacher/signin">Teacher Login</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/student/signin">Student Login</Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive">
            <Link href="/admin/signin">
              <Shield className="w-3.5 h-3.5 mr-1.5" />
              Admin
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-5xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-8 border border-border/50">
          <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
          The Modern LMS for K-12
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-balance mb-6">
          A cockpit of learning.<br />
          <span className="text-muted-foreground">Organized, fast, intelligent.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-12 text-balance leading-relaxed">
          Learnova brings Notion-like organization and Google Classroom simplicity to your K-12 curriculum. Powerful tools for teachers, an engaging environment for students.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          {/* Student card */}
          <div className="group relative flex flex-col items-start p-8 rounded-2xl bg-card border border-card-border hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <GraduationCap className="w-32 h-32" />
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">I am a Student</h2>
            <p className="text-muted-foreground mb-6 text-left text-balance">
              Access your subjects, notes, AI flashcards, and teacher feedback.
            </p>
            <div className="flex gap-3 mt-auto">
              <Link href="/student/signin">
                <Button size="sm" className="gap-1.5">
                  Sign In <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
              <Link href="/student/signup">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" /> Create Account
                </Button>
              </Link>
            </div>
          </div>

          {/* Teacher card */}
          <div className="group relative flex flex-col items-start p-8 rounded-2xl bg-card border border-card-border hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <BookOpen className="w-32 h-32" />
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
              <BookOpen className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">I am a Teacher</h2>
            <p className="text-muted-foreground mb-6 text-left text-balance">
              Manage files, evaluate student performance, and track progress.
            </p>
            <div className="flex gap-3 mt-auto">
              <Link href="/teacher/signin">
                <Button size="sm" className="gap-1.5">
                  Sign In <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
              <Link href="/teacher/signup">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" /> Create Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
