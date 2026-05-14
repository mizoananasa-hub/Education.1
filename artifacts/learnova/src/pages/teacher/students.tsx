import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useGetStudents, useUpsertRating, getGetStudentsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Search, Star, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { Student } from "@workspace/api-client-react";

function getLabelFromScore(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Average";
  return "Needs Improvement";
}

export default function TeacherStudents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  const [score, setScore] = useState([50]);
  const [comment, setComment] = useState("");

  const { data: students, isLoading } = useGetStudents(
    { search: debouncedSearch || undefined },
    { query: { enabled: !!user, queryKey: getGetStudentsQueryKey({ search: debouncedSearch || undefined }) } }
  );

  const upsertMutation = useUpsertRating();

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    const timeout = setTimeout(() => {
      setDebouncedSearch(e.target.value);
    }, 500);
    return () => clearTimeout(timeout);
  };

  const openRatingModal = (student: Student) => {
    setSelectedStudent(student);
    setScore([50]);
    setComment("");
    setRatingModalOpen(true);
  };

  const submitRating = () => {
    if (!selectedStudent || !user?.subject) return;

    upsertMutation.mutate({
      studentId: selectedStudent.id,
      data: { score: score[0], comment }
    }, {
      onSuccess: () => {
        toast({ title: "Rating saved successfully" });
        setRatingModalOpen(false);
      },
      onError: (err) => {
        toast({ 
          title: "Failed to save rating", 
          description: err.data?.error || "An error occurred", 
          variant: "destructive" 
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground mt-1">Search and rate your students.</p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search students..." 
            className="pl-9"
            value={search}
            onChange={handleSearch}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Students</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : students?.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No students found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 font-medium">Name / Code</th>
                    <th className="px-6 py-3 font-medium">Grade</th>
                    <th className="px-6 py-3 font-medium">Religion</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students?.map((student) => (
                    <tr key={student.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{student.fullName}</div>
                        <div className="text-xs text-muted-foreground">{student.studentCode}</div>
                      </td>
                      <td className="px-6 py-4">Grade {student.grade}</td>
                      <td className="px-6 py-4">{student.religion}</td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="secondary" size="sm" onClick={() => openRatingModal(student)}>
                          <Star className="w-4 h-4 mr-2" />
                          Rate Student
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={ratingModalOpen} onOpenChange={setRatingModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate Student: {selectedStudent?.fullName}</DialogTitle>
            <DialogDescription>
              Evaluate the student's performance in {user?.subject}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="flex justify-between">
                <Label>Score: {score[0]}</Label>
                <span className="text-sm font-medium text-primary">
                  {getLabelFromScore(score[0])}
                </span>
              </div>
              <Slider
                value={score}
                onValueChange={setScore}
                max={100}
                step={1}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Comment (Optional)</Label>
              <Textarea 
                placeholder="Leave feedback for the student..." 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRatingModalOpen(false)}>Cancel</Button>
            <Button onClick={submitRating} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Rating
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
