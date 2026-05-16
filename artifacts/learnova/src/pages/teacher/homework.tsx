import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Plus, Trash2, ChevronDown, ClipboardList, Users, Clock,
  Calendar, CheckCircle2, Loader2, Eye, X, BookOpen, Award,
  AlignLeft, ToggleLeft, List, FileText, Minus
} from "lucide-react";
import { format } from "date-fns";

const QUESTION_TYPES = [
  { value: "multiple_choice", label: "Multiple Choice", icon: List },
  { value: "true_false", label: "True / False", icon: ToggleLeft },
  { value: "short_answer", label: "Short Answer", icon: Minus },
  { value: "paragraph", label: "Paragraph", icon: AlignLeft },
  { value: "fill_blank", label: "Fill in the Blank", icon: FileText },
] as const;

type QuestionType = (typeof QUESTION_TYPES)[number]["value"];

interface QuestionDraft {
  id: string;
  questionType: QuestionType;
  gradingMode: "auto" | "manual";
  questionText: string;
  options: string[];
  correctAnswer: string;
  points: number;
}

function newQuestion(): QuestionDraft {
  return {
    id: Math.random().toString(36).slice(2),
    questionType: "multiple_choice",
    gradingMode: "auto",
    questionText: "",
    options: ["", "", "", ""],
    correctAnswer: "",
    points: 1,
  };
}

function getToken() { return localStorage.getItem("learnova_auth_token"); }

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...(opts?.headers ?? {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function TeacherHomework() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewSubs, setViewSubs] = useState<any | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [gradingAnswer, setGradingAnswer] = useState<{ answerId: number; current: string } | null>(null);
  const [gradingScore, setGradingScore] = useState("");
  const [gradingFeedback, setGradingFeedback] = useState("");

  const load = async () => {
    try {
      const data = await apiFetch("/api/homework/teacher");
      setHomeworks(data);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openSubmissions = async (hw: any) => {
    setViewSubs(hw);
    setSubsLoading(true);
    try {
      const data = await apiFetch(`/api/homework/${hw.id}/submissions`);
      setSubmissions(data);
    } catch { } finally { setSubsLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this homework?")) return;
    try {
      await apiFetch(`/api/homework/${id}`, { method: "DELETE" });
      setHomeworks(prev => prev.filter(h => h.id !== id));
      toast({ title: "Homework deleted" });
    } catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
  };

  const handleGrade = async () => {
    if (!gradingAnswer) return;
    try {
      await apiFetch(`/api/homework/answers/${gradingAnswer.answerId}/grade`, {
        method: "PATCH",
        body: JSON.stringify({ manualScore: Number(gradingScore), teacherFeedback: gradingFeedback }),
      });
      toast({ title: "Answer graded" });
      setGradingAnswer(null);
      setGradingScore("");
      setGradingFeedback("");
      if (viewSubs) openSubmissions(viewSubs);
    } catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
  };

  const statusColor = (hw: any) => {
    if (new Date(hw.dueDate) < new Date()) return "bg-red-500/10 text-red-600 border-red-500/20";
    return "bg-green-500/10 text-green-600 border-green-500/20";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Homework</h1>
          <p className="text-muted-foreground mt-1">{user?.subject} — manage assignments</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Create Homework
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : homeworks.length === 0 ? (
        <div className="text-center py-20 border border-dashed rounded-2xl">
          <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No homework yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first assignment</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {homeworks.map(hw => (
            <Card key={hw.id} className="hover-elevate transition-all border-card-border">
              <CardContent className="p-5">
                <div className="flex justify-between items-start gap-2 mb-3">
                  <h3 className="font-semibold text-lg leading-tight">{hw.title}</h3>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => handleDelete(hw.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {hw.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{hw.description}</p>
                )}

                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    Due: {format(new Date(hw.dueDate), "MMM d, yyyy")}
                  </div>
                  {hw.timeLimitMinutes && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      {hw.timeLimitMinutes} min limit
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    {hw.submissionCount} submission{hw.submissionCount !== 1 ? "s" : ""}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={cn("text-xs", statusColor(hw))}>
                    {new Date(hw.dueDate) < new Date() ? "Past Due" : "Active"}
                  </Badge>
                  <Button size="sm" variant="outline" className="gap-1.5 h-8"
                    onClick={() => openSubmissions(hw)}>
                    <Eye className="w-3.5 h-3.5" /> View Submissions
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Homework Modal */}
      <CreateHomeworkModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); load(); }}
        subject={user?.subject ?? ""}
        teacherName={user?.fullName ?? ""}
      />

      {/* Submissions Dialog */}
      <Dialog open={!!viewSubs} onOpenChange={() => setViewSubs(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submissions — {viewSubs?.title}</DialogTitle>
          </DialogHeader>
          {subsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : submissions.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No submissions yet.</p>
          ) : (
            <div className="space-y-3">
              {submissions.map(sub => (
                <Card key={sub.id} className="border-card-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold">{sub.studentName}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(sub.submittedAt), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className={sub.status === "graded"
                          ? "text-green-600 border-green-500/30 bg-green-500/10"
                          : "text-yellow-600 border-yellow-500/30 bg-yellow-500/10"}>
                          {sub.status === "graded" ? `${sub.percentage}%` : "Needs Grading"}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {sub.answers?.map((a: any) => {
                        const needsGrading = a.autoScore == null && a.manualScore == null;
                        return (
                          <div key={a.id} className="p-3 rounded-lg bg-muted/40 text-sm">
                            <p className="text-muted-foreground mb-1">Q{a.id}: {a.answer || "(no answer)"}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs">
                                {a.autoScore != null && `Auto: ${a.autoScore}pts`}
                                {a.manualScore != null && `Manual: ${a.manualScore}pts`}
                                {a.teacherFeedback && ` · "${a.teacherFeedback}"`}
                              </span>
                              {needsGrading && (
                                <Button size="sm" variant="outline" className="h-6 text-xs gap-1"
                                  onClick={() => { setGradingAnswer({ answerId: a.id, current: a.answer }); setGradingScore(""); setGradingFeedback(""); }}>
                                  <Award className="w-3 h-3" /> Grade
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Grade Answer Dialog */}
      <Dialog open={!!gradingAnswer} onOpenChange={() => setGradingAnswer(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Grade Answer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p className="font-medium mb-1">Student's Answer:</p>
              <p className="text-muted-foreground">{gradingAnswer?.current || "(empty)"}</p>
            </div>
            <div className="space-y-2">
              <Label>Score (points)</Label>
              <Input type="number" min="0" value={gradingScore}
                onChange={e => setGradingScore(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>Feedback (optional)</Label>
              <Textarea value={gradingFeedback} onChange={e => setGradingFeedback(e.target.value)}
                placeholder="Add feedback for the student…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGradingAnswer(null)}>Cancel</Button>
            <Button onClick={handleGrade} disabled={!gradingScore}>Submit Grade</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateHomeworkModal({ open, onClose, onCreated, subject, teacherName }: {
  open: boolean; onClose: () => void; onCreated: () => void; subject: string; teacherName: string;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [timeLimit, setTimeLimit] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([newQuestion()]);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStep(1); setTitle(""); setDescription(""); setDueDate(""); setTimeLimit("");
    setQuestions([newQuestion()]);
  };

  const handleClose = () => { reset(); onClose(); };

  const addQuestion = () => setQuestions(prev => [...prev, newQuestion()]);
  const removeQuestion = (id: string) => setQuestions(prev => prev.filter(q => q.id !== id));
  const updateQuestion = (id: string, patch: Partial<QuestionDraft>) =>
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...patch } : q));

  const handleSubmit = async () => {
    if (!title.trim() || !dueDate) { toast({ title: "Title and due date are required", variant: "destructive" }); return; }
    const invalid = questions.find(q => !q.questionText.trim());
    if (invalid) { toast({ title: "All questions need text", variant: "destructive" }); return; }

    setSubmitting(true);
    try {
      const payload = {
        title, description, dueDate, timeLimitMinutes: timeLimit ? Number(timeLimit) : null,
        questions: questions.map(q => ({
          questionText: q.questionText,
          questionType: q.questionType,
          gradingMode: q.gradingMode,
          options: q.questionType === "multiple_choice" ? q.options.filter(o => o.trim()) : null,
          correctAnswer: q.gradingMode === "auto" ? q.correctAnswer : null,
          points: q.points,
        })),
      };
      const token = localStorage.getItem("learnova_auth_token");
      const res = await fetch("/api/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Homework created!", description: `${questions.length} question(s) added.` });
      reset();
      onCreated();
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Homework — {subject}</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-2">
          {[1, 2].map(s => (
            <button key={s} onClick={() => s === 2 && title && dueDate ? setStep(s as 1 | 2) : undefined}
              className={cn("flex items-center gap-2 text-sm font-medium transition-colors",
                step === s ? "text-primary" : "text-muted-foreground")}>
              <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors",
                step === s ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/30")}>
                {s}
              </span>
              {s === 1 ? "Assignment Details" : "Questions"}
            </button>
          ))}
          <div className="flex-1 h-px bg-border" />
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Chapter 5 Review" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>Instructions (optional)</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Describe what students need to do…" className="min-h-[80px]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>Time Limit (minutes, optional)</Label>
                <Input type="number" min="1" value={timeLimit} onChange={e => setTimeLimit(e.target.value)}
                  placeholder="e.g. 60" className="h-11" />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Subject:</span> {subject} &nbsp;·&nbsp;
              <span className="font-medium text-foreground">Teacher:</span> {teacherName}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <QuestionCard
                key={q.id}
                q={q}
                idx={idx}
                onChange={patch => updateQuestion(q.id, patch)}
                onRemove={questions.length > 1 ? () => removeQuestion(q.id) : undefined}
              />
            ))}
            <Button variant="outline" className="w-full gap-2 border-dashed" onClick={addQuestion}>
              <Plus className="w-4 h-4" /> Add Question
            </Button>
          </div>
        )}

        <DialogFooter className="gap-2 pt-2">
          {step === 2 && <Button variant="outline" onClick={() => setStep(1)}>Back</Button>}
          {step === 1 && (
            <Button onClick={() => { if (!title.trim() || !dueDate) { return; } setStep(2); }}
              disabled={!title.trim() || !dueDate}>
              Continue to Questions
            </Button>
          )}
          {step === 2 && (
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : <><CheckCircle2 className="w-4 h-4" /> Create Homework</>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuestionCard({ q, idx, onChange, onRemove }: {
  q: QuestionDraft; idx: number;
  onChange: (p: Partial<QuestionDraft>) => void;
  onRemove?: () => void;
}) {
  const typeInfo = QUESTION_TYPES.find(t => t.value === q.questionType)!;

  return (
    <div className="border rounded-xl p-4 bg-card space-y-3 transition-all">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Question {idx + 1}
        </span>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium",
            q.gradingMode === "auto"
              ? "bg-green-500/10 text-green-600 border-green-500/20"
              : "bg-orange-500/10 text-orange-600 border-orange-500/20")}>
            {q.gradingMode === "auto" ? "Auto-graded" : "Manual grading"}
          </span>
          {onRemove && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={onRemove}><Trash2 className="w-3.5 h-3.5" /></Button>
          )}
        </div>
      </div>

      {/* Question type selector */}
      <div className="flex flex-wrap gap-1.5">
        {QUESTION_TYPES.map(t => (
          <button key={t.value} onClick={() => onChange({ questionType: t.value, correctAnswer: "", options: ["", "", "", ""] })}
            className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
              q.questionType === t.value
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/50")}>
            <t.icon className="w-3 h-3" /> {t.label}
          </button>
        ))}
      </div>

      {/* Question text */}
      <Input value={q.questionText} onChange={e => onChange({ questionText: e.target.value })}
        placeholder="Enter your question…" className="h-10" />

      {/* Options for multiple choice */}
      {q.questionType === "multiple_choice" && (
        <div className="space-y-2">
          <Label className="text-xs">Answer Options</Label>
          {q.options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <span className="w-6 h-10 flex items-center justify-center text-xs font-bold text-muted-foreground">
                {String.fromCharCode(65 + i)}
              </span>
              <Input value={opt} onChange={e => {
                const opts = [...q.options]; opts[i] = e.target.value; onChange({ options: opts });
              }} placeholder={`Option ${String.fromCharCode(65 + i)}`} className="h-10" />
              {q.gradingMode === "auto" && (
                <button onClick={() => onChange({ correctAnswer: opt })}
                  className={cn("w-8 h-10 rounded flex items-center justify-center border text-xs transition-all",
                    q.correctAnswer === opt ? "bg-green-500 border-green-500 text-white" : "border-border text-muted-foreground hover:border-green-400")}>
                  ✓
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* True/False */}
      {q.questionType === "true_false" && q.gradingMode === "auto" && (
        <div className="flex gap-3">
          {["true", "false"].map(v => (
            <button key={v} onClick={() => onChange({ correctAnswer: v })}
              className={cn("flex-1 py-2 rounded-lg border text-sm font-medium capitalize transition-all",
                q.correctAnswer === v ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50")}>
              {v}
            </button>
          ))}
        </div>
      )}

      {/* Correct answer for short/fill */}
      {(q.questionType === "short_answer" || q.questionType === "fill_blank") && q.gradingMode === "auto" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Correct Answer</Label>
          <Input value={q.correctAnswer} onChange={e => onChange({ correctAnswer: e.target.value })}
            placeholder="Expected answer (exact match)" className="h-10" />
        </div>
      )}

      {/* Grading mode + points row */}
      <div className="flex items-center gap-4 pt-1">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Grading:</Label>
          <div className="flex rounded-lg border overflow-hidden">
            {(["auto", "manual"] as const).map(m => (
              <button key={m} onClick={() => onChange({ gradingMode: m, correctAnswer: "" })}
                className={cn("px-3 py-1 text-xs font-medium transition-colors",
                  q.gradingMode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                {m === "auto" ? "Auto" : "Manual"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Label className="text-xs text-muted-foreground">Points:</Label>
          <Input type="number" min="1" value={q.points}
            onChange={e => onChange({ points: Math.max(1, Number(e.target.value)) })}
            className="h-8 w-16 text-center" />
        </div>
      </div>
    </div>
  );
}
