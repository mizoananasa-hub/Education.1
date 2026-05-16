import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  ClipboardList, Calendar, Clock, ChevronLeft, ChevronRight,
  CheckCircle2, Loader2, BookOpen, Award, AlertCircle, RotateCcw
} from "lucide-react";
import { format, formatDistanceToNow, isPast } from "date-fns";

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

type View = "list" | "take" | "result";

const STATUS_STYLES: Record<string, string> = {
  "Not Started": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "Submitted": "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  "Graded": "bg-green-500/10 text-green-600 border-green-500/20",
  "Overdue": "bg-red-500/10 text-red-600 border-red-500/20",
};

export default function StudentHomework() {
  const { user } = useAuth();
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("list");
  const [selected, setSelected] = useState<any | null>(null);
  const [hwDetail, setHwDetail] = useState<any | null>(null);
  const [result, setResult] = useState<any | null>(null);

  const load = async () => {
    try {
      const data = await apiFetch("/api/homework/student/available");
      setHomeworks(data);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleOpen = async (hw: any) => {
    if (hw.status === "Not Started" || hw.status === "Overdue") {
      if (hw.status === "Overdue") return;
      try {
        const detail = await apiFetch(`/api/homework/${hw.id}`);
        setHwDetail(detail);
        setSelected(hw);
        setView("take");
      } catch { }
    } else {
      try {
        const data = await apiFetch(`/api/homework/${hw.id}/my-result`);
        setResult(data);
        setSelected(hw);
        setView("result");
      } catch { }
    }
  };

  if (view === "take" && hwDetail) {
    return <HomeworkTake hw={hwDetail} onSubmit={async () => { await load(); setView("list"); }}
      onBack={() => setView("list")} />;
  }

  if (view === "result" && result && selected) {
    return <HomeworkResult hw={selected} result={result} onBack={() => setView("list")} />;
  }

  const notStarted = homeworks.filter(h => h.status === "Not Started");
  const submitted = homeworks.filter(h => h.status === "Submitted");
  const graded = homeworks.filter(h => h.status === "Graded");
  const overdue = homeworks.filter(h => h.status === "Overdue");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Homework</h1>
        <p className="text-muted-foreground mt-1">Your assigned homework and submissions.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : homeworks.length === 0 ? (
        <div className="text-center py-20 border border-dashed rounded-2xl">
          <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No homework assigned yet</p>
        </div>
      ) : (
        <div className="space-y-8">
          {notStarted.length > 0 && (
            <Section title="Pending" count={notStarted.length}>
              {notStarted.map(hw => <HomeworkCard key={hw.id} hw={hw} onClick={() => handleOpen(hw)} />)}
            </Section>
          )}
          {submitted.length > 0 && (
            <Section title="Submitted — Awaiting Grade" count={submitted.length}>
              {submitted.map(hw => <HomeworkCard key={hw.id} hw={hw} onClick={() => handleOpen(hw)} />)}
            </Section>
          )}
          {graded.length > 0 && (
            <Section title="Graded" count={graded.length}>
              {graded.map(hw => <HomeworkCard key={hw.id} hw={hw} onClick={() => handleOpen(hw)} />)}
            </Section>
          )}
          {overdue.length > 0 && (
            <Section title="Overdue" count={overdue.length}>
              {overdue.map(hw => <HomeworkCard key={hw.id} hw={hw} onClick={() => {}} />)}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {title} <span className="ml-1 text-foreground font-bold">{count}</span>
      </h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </div>
  );
}

function HomeworkCard({ hw, onClick }: { hw: any; onClick: () => void }) {
  const isOverdue = hw.status === "Overdue";
  return (
    <Card onClick={isOverdue ? undefined : onClick}
      className={cn("transition-all border-card-border", isOverdue ? "opacity-60" : "hover-elevate cursor-pointer")}>
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-2 gap-2">
          <h3 className="font-semibold text-base leading-tight">{hw.title}</h3>
          <Badge variant="outline" className={cn("text-xs shrink-0", STATUS_STYLES[hw.status])}>
            {hw.status}
          </Badge>
        </div>

        <div className="text-sm text-muted-foreground mb-3">
          <span className="font-medium text-foreground">{hw.subject}</span> — by {hw.teacherName}
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Due {format(new Date(hw.dueDate), "MMM d, yyyy 'at' h:mm a")}
          </div>
          {!isPast(new Date(hw.dueDate)) && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {formatDistanceToNow(new Date(hw.dueDate), { addSuffix: true })}
            </div>
          )}
          {hw.timeLimitMinutes && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {hw.timeLimitMinutes} min time limit
            </div>
          )}
        </div>

        {hw.submission?.status === "graded" && (
          <div className="mt-3 flex items-center gap-2">
            <Progress value={hw.submission.percentage} className="h-1.5 flex-1" />
            <span className="text-xs font-bold text-primary">{hw.submission.percentage}%</span>
          </div>
        )}

        {!isOverdue && (
          <div className="mt-4">
            <Button size="sm" className="w-full h-8 text-xs" variant={hw.status === "Not Started" ? "default" : "outline"}>
              {hw.status === "Not Started" ? "Start Homework" :
               hw.status === "Submitted" ? "View Submission" : "View Results"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HomeworkTake({ hw, onSubmit, onBack }: { hw: any; onSubmit: () => void; onBack: () => void }) {
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(hw.timeLimitMinutes ? hw.timeLimitMinutes * 60 : null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!hw.timeLimitMinutes) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t === null || t <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleSubmit = async (forced = false) => {
    if (!forced) setConfirmOpen(false);
    setSubmitting(true);
    try {
      const token = localStorage.getItem("learnova_auth_token");
      const res = await fetch(`/api/homework/${hw.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ answers: Object.entries(answers).map(([qId, answer]) => ({ questionId: Number(qId), answer })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Homework submitted!", description: `Score: ${data.percentage}%` });
      onSubmit();
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const qs = hw.questions ?? [];
  const answered = Object.keys(answers).length;
  const q = qs[currentIdx];

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60), s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2"><ChevronLeft className="w-4 h-4" /> Back</Button>
        <div className="text-center">
          <h1 className="text-xl font-bold">{hw.title}</h1>
          <p className="text-sm text-muted-foreground">{hw.subject} — {hw.teacherName}</p>
        </div>
        {timeLeft !== null ? (
          <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono font-bold text-sm",
            timeLeft < 60 ? "bg-red-500/10 border-red-500/30 text-red-600" : "bg-muted border-border")}>
            <Clock className="w-4 h-4" /> {formatTime(timeLeft)}
          </div>
        ) : <div className="w-24" />}
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{answered} of {qs.length} answered</span>
          <span>{Math.round((answered / qs.length) * 100)}%</span>
        </div>
        <Progress value={(answered / qs.length) * 100} className="h-2" />
      </div>

      {/* Question nav */}
      <div className="flex flex-wrap gap-2">
        {qs.map((_: any, i: number) => (
          <button key={i} onClick={() => setCurrentIdx(i)}
            className={cn("w-8 h-8 rounded-full text-xs font-bold border-2 transition-all",
              currentIdx === i ? "bg-primary text-primary-foreground border-primary" :
              answers[qs[i].id] ? "bg-green-500/20 border-green-500/40 text-green-600" :
              "border-border text-muted-foreground hover:border-primary/50")}>
            {i + 1}
          </button>
        ))}
      </div>

      {/* Question card */}
      {q && (
        <Card className="border-card-border shadow-md">
          <CardContent className="p-8">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-muted-foreground uppercase">Question {currentIdx + 1} of {qs.length}</span>
              <Badge variant="outline" className="text-xs">{q.points} pt{q.points !== 1 ? "s" : ""}</Badge>
            </div>
            <p className="text-xl font-semibold leading-relaxed mb-8">{q.questionText}</p>

            {q.questionType === "multiple_choice" && q.options && (
              <div className="space-y-3">
                {(JSON.parse(q.options) as string[]).filter(o => o.trim()).map((opt: string, i: number) => (
                  <button key={i} onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}
                    className={cn("w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all",
                      answers[q.id] === opt ? "bg-primary/10 border-primary text-primary font-medium" :
                      "border-border hover:border-primary/40 hover:bg-muted/40")}>
                    <span className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 shrink-0",
                      answers[q.id] === opt ? "bg-primary text-primary-foreground border-primary" : "border-current")}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {q.questionType === "true_false" && (
              <div className="flex gap-4">
                {["true", "false"].map(v => (
                  <button key={v} onClick={() => setAnswers(a => ({ ...a, [q.id]: v }))}
                    className={cn("flex-1 py-4 rounded-xl border-2 text-lg font-bold capitalize transition-all",
                      answers[q.id] === v ? "bg-primary/10 border-primary text-primary" :
                      "border-border hover:border-primary/40")}>
                    {v}
                  </button>
                ))}
              </div>
            )}

            {(q.questionType === "short_answer" || q.questionType === "fill_blank") && (
              <input
                value={answers[q.id] ?? ""}
                onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                placeholder={q.questionType === "fill_blank" ? "Fill in the blank…" : "Your answer…"}
                className="w-full h-12 px-4 rounded-xl border-2 border-border bg-background focus:border-primary outline-none text-base transition-colors"
              />
            )}

            {q.questionType === "paragraph" && (
              <textarea
                value={answers[q.id] ?? ""}
                onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                placeholder="Write your answer here…"
                className="w-full h-36 px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary outline-none text-base resize-none transition-colors"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation + Submit */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
        </Button>

        {currentIdx < qs.length - 1 ? (
          <Button onClick={() => setCurrentIdx(i => Math.min(qs.length - 1, i + 1))}>
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={() => setConfirmOpen(true)} className="bg-green-600 hover:bg-green-700 gap-2">
            <CheckCircle2 className="w-4 h-4" /> Submit Homework
          </Button>
        )}
      </div>

      {/* Confirm submit dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit Homework?</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
              <CheckCircle2 className={cn("w-8 h-8", answered === qs.length ? "text-green-500" : "text-yellow-500")} />
              <div>
                <p className="font-semibold">{answered} of {qs.length} questions answered</p>
                {answered < qs.length && (
                  <p className="text-sm text-muted-foreground">{qs.length - answered} question(s) unanswered will be marked as blank.</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Review Answers</Button>
            <Button onClick={() => handleSubmit()} disabled={submitting} className="bg-green-600 hover:bg-green-700 gap-2">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : "Confirm Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HomeworkResult({ hw, result, onBack }: { hw: any; result: any; onBack: () => void }) {
  const { submission, questions, answers } = result;
  const isPending = submission.status === "submitted";

  const getAnswer = (qId: number) => answers.find((a: any) => a.questionId === qId);
  const getScore = (a: any, q: any) => a?.autoScore ?? a?.manualScore ?? null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="gap-2"><ChevronLeft className="w-4 h-4" /> Back</Button>
        <div>
          <h1 className="text-2xl font-bold">{hw.title}</h1>
          <p className="text-sm text-muted-foreground">{hw.subject} — {hw.teacherName}</p>
        </div>
      </div>

      <Card className="border-primary/20 shadow-lg shadow-primary/5">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" className="stroke-muted" strokeWidth="10" />
                <circle cx="50" cy="50" r="42" fill="none"
                  className={isPending ? "stroke-yellow-400" : "stroke-primary"}
                  strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 42}
                  strokeDashoffset={isPending ? 0 : 2 * Math.PI * 42 * (1 - submission.percentage / 100)} />
              </svg>
              {isPending ? (
                <div className="text-center">
                  <Clock className="w-8 h-8 text-yellow-500 mx-auto" />
                  <p className="text-xs font-semibold mt-1">Pending</p>
                </div>
              ) : (
                <div className="text-center">
                  <span className="text-3xl font-bold">{submission.percentage}%</span>
                  <p className="text-xs text-muted-foreground">{submission.totalScore}/{submission.maxScore}</p>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-3 text-center md:text-left">
              <h2 className="text-2xl font-bold">
                {isPending ? "Awaiting Teacher Review" :
                 submission.percentage >= 80 ? "Excellent Work!" :
                 submission.percentage >= 60 ? "Good Job!" : "Keep Practicing!"}
              </h2>
              {isPending && <p className="text-muted-foreground">Some answers need manual grading. Check back later.</p>}
              {!isPending && (
                <div className="flex gap-3 justify-center md:justify-start">
                  <Badge variant="outline" className={cn("text-sm py-1 px-3",
                    submission.percentage >= 80 ? "text-green-600 border-green-500/30 bg-green-500/10" :
                    submission.percentage >= 60 ? "text-blue-600 border-blue-500/30 bg-blue-500/10" :
                    "text-orange-600 border-orange-500/30 bg-orange-500/10")}>
                    {submission.percentage >= 80 ? "Excellent" : submission.percentage >= 60 ? "Good" : "Needs Improvement"}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question review */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Question Review</h3>
        {questions.map((q: any, idx: number) => {
          const a = getAnswer(q.id);
          const score = getScore(a, q);
          const isCorrect = score === q.points;
          const isPendingGrade = score === null && q.gradingMode === "manual";

          return (
            <Card key={q.id} className={cn("border-l-4",
              isPendingGrade ? "border-l-yellow-400" :
              isCorrect ? "border-l-green-500" : "border-l-red-400")}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <p className="font-medium text-sm">Q{idx + 1}. {q.questionText}</p>
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border shrink-0",
                    isPendingGrade ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" :
                    isCorrect ? "bg-green-500/10 text-green-600 border-green-500/20" :
                    "bg-red-500/10 text-red-600 border-red-500/20")}>
                    {isPendingGrade ? "Pending" : `${score ?? 0}/${q.points}`}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your answer: <span className="text-foreground font-medium">{a?.answer || "(no answer)"}</span>
                </p>
                {a?.teacherFeedback && (
                  <p className="text-sm text-primary mt-2 italic">Teacher: "{a.teacherFeedback}"</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
