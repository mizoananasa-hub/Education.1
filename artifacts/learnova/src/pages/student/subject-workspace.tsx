import { useState, useRef, useEffect } from "react";
import { useRoute } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/auth-provider";
import { 
  useGetFiles, getGetFilesQueryKey,
  useGetNotebooks, getGetNotebooksQueryKey, useCreateNotebook, useDeleteNotebook,
  useGetNotes, getGetNotesQueryKey, useCreateNote, useUpdateNote, useDeleteNote,
  useGetNoteFiles, getGetNoteFilesQueryKey, useDeleteNoteFile,
  useSummarizeFile, useGenerateFlashcards,
  useGetMyRatingBySubject, getGetMyRatingBySubjectQueryKey
} from "@workspace/api-client-react";
import { uploadFormDataFile } from "@/lib/upload";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Plus, Book, Trash2, Save, Sparkles, RefreshCcw, ChevronLeft, ChevronRight, Check, Eye, X, Image, FileCode } from "lucide-react";
import { format } from "date-fns";

function getLabelColor(label: string) {
  switch (label) {
    case "Excellent": return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
    case "Good": return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "Average": return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
    default: return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
  }
}

const VALID_TABS = ["files", "notes", "summarize", "flashcards", "reviews"] as const;
type TabValue = (typeof VALID_TABS)[number];

function getTabFromSearch(): TabValue {
  const param = new URLSearchParams(window.location.search).get("tab");
  if (param && (VALID_TABS as readonly string[]).includes(param)) return param as TabValue;
  return "files";
}

export default function SubjectWorkspace() {
  const [match, params] = useRoute("/student/subjects/:subject");
  const subjectName = decodeURIComponent(params?.subject || "");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabValue>(getTabFromSearch);

  // Sync tab when URL search param changes (sidebar navigation)
  useEffect(() => {
    const onPopState = () => setActiveTab(getTabFromSearch());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Keep URL in sync when tab is changed via the tab bar itself
  const handleTabChange = (val: string) => {
    const tab = val as TabValue;
    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === "files") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", tab);
    }
    window.history.replaceState(null, "", url.toString());
  };

  // Also sync on first render and whenever the search string changes
  useEffect(() => {
    setActiveTab(getTabFromSearch());
  }, [window.location.search]);

  if (!match) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">{subjectName} Workspace</h1>
        <p className="text-muted-foreground">Access materials, manage notes, and generate AI study aids.</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto bg-muted/50 p-1 h-auto flex-wrap gap-0.5">
          <TabsTrigger value="files" className="py-2.5 px-5 transition-all duration-200">Files</TabsTrigger>
          <TabsTrigger value="notes" className="py-2.5 px-5 transition-all duration-200">Notes</TabsTrigger>
          <TabsTrigger value="summarize" className="py-2.5 px-5 transition-all duration-200">Summarize</TabsTrigger>
          <TabsTrigger value="flashcards" className="py-2.5 px-5 transition-all duration-200">Flash Cards</TabsTrigger>
          <TabsTrigger value="reviews" className="py-2.5 px-5 transition-all duration-200">Reviews</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="files"><FilesTab subject={subjectName} /></TabsContent>
          <TabsContent value="notes"><NotesTab subject={subjectName} /></TabsContent>
          <TabsContent value="summarize"><SummarizeTab subject={subjectName} /></TabsContent>
          <TabsContent value="flashcards"><FlashcardsTab subject={subjectName} /></TabsContent>
          <TabsContent value="reviews"><ReviewsTab subject={subjectName} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// --- TABS COMPONENTS ---

function getFileType(filename: string): "pdf" | "image" | "text" | "other" {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) return "image";
  if (["txt", "md", "csv", "json", "xml", "html", "css", "js", "ts"].includes(ext)) return "text";
  return "other";
}

function FileIcon({ filename }: { filename: string }) {
  const t = getFileType(filename);
  if (t === "pdf") return <FileText className="w-5 h-5" />;
  if (t === "image") return <Image className="w-5 h-5" />;
  if (t === "text") return <FileCode className="w-5 h-5" />;
  return <FileText className="w-5 h-5" />;
}

type FileItem = { id: number; filename: string; filepath: string; createdAt: string; uploadedBy: string };

function FileViewerModal({ file, onClose }: { file: FileItem; onClose: () => void }) {
  const type = getFileType(file.filename);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textError, setTextError] = useState(false);

  useEffect(() => {
    if (type === "text") {
      fetch(file.filepath)
        .then(r => r.text())
        .then(setTextContent)
        .catch(() => setTextError(true));
    }
  }, [file.filepath, type]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="truncate pr-8">{file.filename}</DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">{format(new Date(file.createdAt), "MMM d, yyyy")} • Uploaded by {file.uploadedBy}</p>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-muted/30">
          {type === "pdf" && (
            <iframe
              src={`${file.filepath}#toolbar=1&view=FitH`}
              className="w-full h-full border-0"
              title={file.filename}
            />
          )}
          {type === "image" && (
            <div className="w-full h-full flex items-center justify-center p-6 overflow-auto">
              <img
                src={file.filepath}
                alt={file.filename}
                className="max-w-full max-h-full object-contain rounded shadow-lg"
              />
            </div>
          )}
          {type === "text" && (
            <div className="w-full h-full overflow-auto p-6">
              {textError ? (
                <p className="text-muted-foreground text-center py-12">Could not load file content.</p>
              ) : textContent === null ? (
                <p className="text-muted-foreground text-center py-12">Loading...</p>
              ) : (
                <pre className="text-sm font-mono whitespace-pre-wrap break-words leading-relaxed">{textContent}</pre>
              )}
            </div>
          )}
          {type === "other" && (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <FileText className="w-16 h-16 opacity-30" />
              <p className="text-lg font-medium">Preview not available</p>
              <p className="text-sm">This file type cannot be previewed in the browser.</p>
              <Button asChild>
                <a href={file.filepath} download={file.filename}>
                  <Download className="w-4 h-4 mr-2" /> Download to view
                </a>
              </Button>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t flex-shrink-0 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button asChild>
            <a href={file.filepath} download={file.filename}>
              <Download className="w-4 h-4 mr-2" /> Download
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FilesTab({ subject }: { subject: string }) {
  const { data: files, isLoading } = useGetFiles(
    { subject },
    { query: { enabled: !!subject, queryKey: getGetFilesQueryKey({ subject }) } }
  );
  const [viewingFile, setViewingFile] = useState<FileItem | null>(null);

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading files...</div>;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {files?.map(file => (
          <Card key={file.id} className="hover-elevate transition-all">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded bg-primary/10 text-primary shrink-0">
                  <FileIcon filename={file.filename} />
                </div>
                <div className="truncate">
                  <p className="font-medium truncate" title={file.filename}>{file.filename}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(file.createdAt), "MMM d, yyyy")} • By {file.uploadedBy}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={() => setViewingFile(file as FileItem)}
                >
                  <Eye className="w-4 h-4 mr-1.5" /> View
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={file.filepath} download={file.filename}>
                    <Download className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {files?.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">No files uploaded by the teacher yet.</div>
        )}
      </div>
      {viewingFile && <FileViewerModal file={viewingFile} onClose={() => setViewingFile(null)} />}
    </>
  );
}

function NotesTab({ subject }: { subject: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedNotebook, setSelectedNotebook] = useState<number | null>(null);
  const [newNotebookName, setNewNotebookName] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const { data: notebooks, isLoading } = useGetNotebooks(
    { subject },
    { query: { enabled: !!subject, queryKey: getGetNotebooksQueryKey({ subject }) } }
  );

  const createNb = useCreateNotebook();
  const deleteNb = useDeleteNotebook();

  const handleCreate = () => {
    if (!newNotebookName.trim()) return;
    createNb.mutate({ data: { subject, notebookName: newNotebookName } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetNotebooksQueryKey({ subject }) });
        setCreateModalOpen(false);
        setNewNotebookName("");
        toast({ title: "Notebook created" });
      }
    });
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete notebook?")) return;
    deleteNb.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetNotebooksQueryKey({ subject }) });
        if (selectedNotebook === id) setSelectedNotebook(null);
        toast({ title: "Notebook deleted" });
      }
    });
  };

  if (selectedNotebook) {
    return <NoteEditor notebookId={selectedNotebook} onBack={() => setSelectedNotebook(null)} />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold">Your Notebooks</h3>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Notebook
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {notebooks?.map(nb => (
          <Card key={nb.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedNotebook(nb.id)}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-secondary rounded-xl text-primary">
                  <Book className="w-6 h-6" />
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => handleDelete(nb.id, e)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <h4 className="font-semibold text-lg">{nb.notebookName}</h4>
              <p className="text-xs text-muted-foreground mt-2">{format(new Date(nb.createdAt), "MMM d, yyyy")}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Notebook</DialogTitle></DialogHeader>
          <Input placeholder="Notebook name..." value={newNotebookName} onChange={e => setNewNotebookName(e.target.value)} />
          <DialogFooter>
            <Button onClick={handleCreate} disabled={!newNotebookName.trim() || createNb.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type SaveState = "idle" | "saving" | "saved" | "failed";

const DRAFT_KEY = (id: number) => `learnova_note_draft_${id}`;

function NoteEditor({ notebookId, onBack }: { notebookId: number, onBack: () => void }) {
  const { data: notes } = useGetNotes({ notebookId }, { query: { queryKey: getGetNotesQueryKey({ notebookId }) } });
  const { data: noteFiles } = useGetNoteFiles({ notebookId }, { query: { queryKey: getGetNoteFilesQueryKey({ notebookId }) } });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNoteFile = useDeleteNoteFile();

  const activeNote = notes?.[0];
  const [content, setContent] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const initialized = useRef(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create empty note if none exists
  useEffect(() => {
    if (notes && notes.length === 0 && !createNote.isPending) {
      createNote.mutate({ data: { notebookId, content: "" } }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetNotesQueryKey({ notebookId }) })
      });
    }
  }, [notes, notebookId]);

  // Initialize content — prefer any saved draft over DB value
  useEffect(() => {
    if (activeNote && !initialized.current) {
      const draft = localStorage.getItem(DRAFT_KEY(activeNote.id));
      setContent(draft ?? activeNote.content);
      if (draft) {
        console.log("[NoteEditor] Restored unsaved draft for note", activeNote.id);
      }
      initialized.current = true;
    }
  }, [activeNote]);

  const doSave = (val: string, noteId: number) => {
    setSaveState("saving");
    console.log("[NoteEditor] Auto-saving note", noteId);
    updateNote.mutate({ id: noteId, data: { content: val } }, {
      onSuccess: () => {
        setSaveState("saved");
        localStorage.removeItem(DRAFT_KEY(noteId));
        console.log("[NoteEditor] Note saved successfully");
        if (savedTimer.current) clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => setSaveState("idle"), 2500);
      },
      onError: (err) => {
        setSaveState("failed");
        localStorage.setItem(DRAFT_KEY(noteId), val);
        console.error("[NoteEditor] Save failed, draft stored locally", err);
      },
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    setSaveState("idle");
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    if (activeNote) {
      saveTimeout.current = setTimeout(() => doSave(val, activeNote.id), 1500);
    }
  };

  const handleManualSave = () => {
    if (activeNote) {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      doSave(content, activeNote.id);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("notebookId", notebookId.toString());
      await uploadFormDataFile("/api/note-files", formData);
      queryClient.invalidateQueries({ queryKey: getGetNoteFilesQueryKey({ notebookId }) });
      toast({ title: "File uploaded" });
    } catch (err) {
      toast({ title: "Upload failed", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-[600px] border rounded-xl overflow-hidden bg-card">
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <Button variant="ghost" onClick={onBack} size="sm"><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button>
        <div className="flex items-center gap-3">
          {/* Save state indicator */}
          {saveState === "saving" && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <RefreshCcw className="w-3 h-3 animate-spin" /> Saving...
            </span>
          )}
          {saveState === "saved" && (
            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
          {saveState === "failed" && (
            <span className="text-xs text-destructive flex items-center gap-1">
              <X className="w-3 h-3" /> Failed to save
            </span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSave}
            disabled={saveState === "saving" || !activeNote}
          >
            <Save className="w-4 h-4 mr-1.5" /> Save Notes
          </Button>

          <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Plus className="w-4 h-4 mr-1.5" /> Add File
          </Button>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        <Textarea 
          className="flex-1 resize-none border-0 rounded-none focus-visible:ring-0 p-6 text-base bg-transparent"
          placeholder="Start typing your notes here... Changes are saved automatically."
          value={content}
          onChange={handleChange}
        />
        
        {noteFiles && noteFiles.length > 0 && (
          <div className="w-64 border-l bg-muted/10 p-4 overflow-y-auto">
            <h4 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Attached Files</h4>
            <div className="space-y-2">
              {noteFiles.map(nf => (
                <div key={nf.id} className="flex items-center justify-between p-2 rounded border bg-card text-sm group">
                  <a href={nf.filepath} target="_blank" rel="noopener noreferrer" className="truncate hover:underline text-primary">
                    {nf.filename}
                  </a>
                  <button onClick={() => deleteNoteFile.mutate({ id: nf.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetNoteFilesQueryKey({ notebookId }) }) })} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummarizeTab({ subject }: { subject: string }) {
  const { data: files } = useGetFiles({ subject }, { query: { queryKey: getGetFilesQueryKey({ subject }) } });
  const [selectedFile, setSelectedFile] = useState<number | null>(null);
  const summarize = useSummarizeFile();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex gap-4">
        <select 
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          value={selectedFile || ""}
          onChange={e => setSelectedFile(Number(e.target.value))}
        >
          <option value="">Select a teacher file...</option>
          {files?.map(f => <option key={f.id} value={f.id}>{f.filename}</option>)}
        </select>
        <Button 
          onClick={() => summarize.mutate({ data: { fileId: selectedFile! } })}
          disabled={!selectedFile || summarize.isPending}
        >
          {summarize.isPending ? <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Summarize with AI
        </Button>
      </div>

      {summarize.data && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-primary/20 shadow-lg shadow-primary/5">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Sparkles className="w-5 h-5" /> Main Topic
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 text-lg font-medium">{summarize.data.mainTopic}</CardContent>
          </Card>
          
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Key Points</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {summarize.data.keyPoints.map((pt, i) => (
                    <li key={i} className="flex gap-3"><Check className="w-5 h-5 text-primary shrink-0" /> <span>{pt}</span></li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardHeader><CardTitle>Important Notes</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-3 text-muted-foreground list-disc pl-5">
                  {summarize.data.importantNotes.map((pt, i) => <li key={i}>{pt}</li>)}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function FlashcardsTab({ subject }: { subject: string }) {
  const { data: notebooks } = useGetNotebooks({ subject }, { query: { queryKey: getGetNotebooksQueryKey({ subject }) } });
  const [selectedNbs, setSelectedNbs] = useState<number[]>([]);
  const generate = useGenerateFlashcards();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const toggleNb = (id: number) => setSelectedNbs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const cards = generate.data?.flashcards;

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex(prev => Math.min(prev + 1, (cards?.length || 1) - 1)), 150);
  };
  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex(prev => Math.max(prev - 1, 0)), 150);
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col items-center">
      {!cards && (
        <div className="w-full space-y-6">
          <h3 className="text-lg font-semibold">Select notebooks to generate flashcards from:</h3>
          <div className="flex flex-wrap gap-2">
            {notebooks?.map(nb => (
              <Badge 
                key={nb.id} 
                variant={selectedNbs.includes(nb.id) ? "default" : "outline"}
                className="cursor-pointer py-1.5 px-3 text-sm hover:border-primary"
                onClick={() => toggleNb(nb.id)}
              >
                {nb.notebookName}
              </Badge>
            ))}
          </div>
          <Button 
            className="w-full h-12 text-lg" 
            onClick={() => generate.mutate({ data: { notebookIds: selectedNbs } })}
            disabled={selectedNbs.length === 0 || generate.isPending}
          >
            {generate.isPending ? <RefreshCcw className="w-5 h-5 mr-2 animate-spin" /> : <Sparkles className="w-5 h-5 mr-2" />}
            Generate Flashcards
          </Button>
        </div>
      )}

      {cards && cards.length > 0 && (
        <div className="w-full max-w-xl animate-in fade-in zoom-in-95 duration-500">
          <div className="mb-6 flex justify-between items-center text-sm font-medium text-muted-foreground">
            <span>Card {currentIndex + 1} of {cards.length}</span>
            <div className="flex items-center gap-3">
              <Progress value={((currentIndex + 1) / cards.length) * 100} className="w-32 h-2" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { generate.reset(); setCurrentIndex(0); setIsFlipped(false); }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <RefreshCcw className="w-3 h-3 mr-1" /> New Set
              </Button>
            </div>
          </div>

          <div 
            className="relative w-full aspect-[4/3] perspective-1000 cursor-pointer"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div className={cn(
              "w-full h-full relative transition-transform duration-700 transform-style-3d shadow-xl rounded-2xl",
              isFlipped ? "rotate-y-180" : ""
            )}>
              {/* Front */}
              <div className="absolute inset-0 backface-hidden bg-card border-2 border-primary/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                <span className="absolute top-4 left-4 text-xs font-bold text-primary uppercase tracking-widest">Question</span>
                <h3 className="text-2xl font-semibold leading-relaxed">{cards[currentIndex].question}</h3>
                <span className="absolute bottom-4 text-xs text-muted-foreground">Click to flip</span>
              </div>
              
              {/* Back */}
              <div className="absolute inset-0 backface-hidden bg-primary text-primary-foreground rounded-2xl p-8 flex flex-col items-center justify-center text-center rotate-y-180">
                <span className="absolute top-4 left-4 text-xs font-bold text-primary-foreground/70 uppercase tracking-widest">Answer</span>
                <p className="text-xl font-medium leading-relaxed">{cards[currentIndex].answer}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0}><ChevronLeft className="w-4 h-4 mr-2" /> Prev</Button>
            <Button onClick={handleNext} disabled={currentIndex === cards.length - 1}>Next <ChevronRight className="w-4 h-4 ml-2" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewsTab({ subject }: { subject: string }) {
  const { data: rating, isLoading } = useGetMyRatingBySubject(subject, { 
    query: { queryKey: getGetMyRatingBySubjectQueryKey(subject) } 
  });

  if (isLoading) return <div>Loading...</div>;

  if (!rating) return <div className="text-center py-12 text-muted-foreground">No review available for this subject yet.</div>;

  return (
    <Card className="max-w-2xl mx-auto border-primary/20 shadow-lg">
      <div className="bg-muted/30 p-4 border-b flex justify-between items-center">
        <span className="font-semibold text-muted-foreground">Evaluated by {rating.teacherName}</span>
        <span className="text-sm text-muted-foreground">{format(new Date(rating.createdAt), "MMMM d, yyyy")}</span>
      </div>
      <CardContent className="p-8">
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-8">
          <div className="shrink-0 flex flex-col items-center justify-center w-40 h-40 rounded-full border-8 border-muted relative">
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle cx="50%" cy="50%" r="46%" className="stroke-primary fill-none stroke-[8%]" strokeDasharray="289" strokeDashoffset={289 - (289 * rating.score) / 100} strokeLinecap="round" />
            </svg>
            <span className="text-4xl font-bold">{rating.score}</span>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Score</span>
          </div>
          
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-2">Performance Level</h3>
              <Badge variant="outline" className={cn("text-lg py-1 px-4", getLabelColor(rating.label))}>
                {rating.label}
              </Badge>
            </div>
            
            {rating.comment && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-2 mt-6">Teacher's Comment</h3>
                <p className="text-lg italic leading-relaxed text-foreground">"{rating.comment}"</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Utility class since it's not natively in tailwind without a plugin
function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}
