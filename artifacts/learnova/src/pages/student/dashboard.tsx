import { useAuth } from "@/components/auth-provider";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { BookText, ChevronRight } from "lucide-react";

export default function StudentDashboard() {
  const { user } = useAuth();
  
  if (!user || user.role !== "student") return null;

  const allSubjects = [
    "Mathematics", "French", "English", "Arabic", "ICT", "Social Studies"
  ];
  
  if (user.grade && user.grade < 9) {
    allSubjects.push("Science");
  } else {
    allSubjects.push("Biology", "Physics", "Chemistry");
  }
  
  if (user.religion === "Islamic") {
    allSubjects.push("Islamic Revision");
  } else if (user.religion === "Christian") {
    allSubjects.push("Christian Religion");
  }

  return (
    <div className="space-y-8">
      <div className="bg-primary/5 rounded-2xl p-8 border border-primary/10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
          Welcome back, {user.fullName?.split(" ")[0]}
        </h1>
        <p className="text-lg text-muted-foreground">
          Grade {user.grade} • Ready to learn?
        </p>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-6">Your Subjects</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {allSubjects.map((subject) => (
            <Link key={subject} href={`/student/subjects/${encodeURIComponent(subject)}`}>
              <Card className="group h-full hover-elevate transition-all border-card-border overflow-hidden cursor-pointer">
                <CardContent className="p-0">
                  <div className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <BookText className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">{subject}</h3>
                    <div className="flex items-center text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors mt-4">
                      Open Workspace <ChevronRight className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </div>
                  </div>
                  <div className="h-1 w-full bg-gradient-to-r from-primary/50 to-primary transform scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
