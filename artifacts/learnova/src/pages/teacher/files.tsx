import { useState, useRef } from "react";
import { useAuth } from "@/components/auth-provider";
import { useGetFiles, useDeleteFile, getGetFilesQueryKey } from "@workspace/api-client-react";
import { uploadFormDataFile } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Upload, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function TeacherFiles() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  
  const { data: files, isLoading } = useGetFiles(
    { subject: user?.subject || "" },
    { query: { enabled: !!user?.subject, queryKey: getGetFilesQueryKey({ subject: user?.subject || "" }) } }
  );

  const deleteMutation = useDeleteFile();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.subject) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("subject", user.subject);

      await uploadFormDataFile("/api/files", formData);
      
      queryClient.invalidateQueries({ queryKey: getGetFilesQueryKey({ subject: user.subject }) });
      toast({ title: "File uploaded successfully" });
    } catch (err: any) {
      toast({ 
        title: "Upload failed", 
        description: err.message || "Failed to upload file", 
        variant: "destructive" 
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to delete this file?")) return;
    
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        if (user?.subject) {
          queryClient.invalidateQueries({ queryKey: getGetFilesQueryKey({ subject: user.subject }) });
        }
        toast({ title: "File deleted" });
      },
      onError: (err) => {
        toast({ 
          title: "Delete failed", 
          description: err.data?.error || "Failed to delete file", 
          variant: "destructive" 
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Files: {user?.subject}</h1>
          <p className="text-muted-foreground mt-1">Manage learning materials for your students.</p>
        </div>
        
        <div>
          <input 
            type="file" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleUpload}
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.ppt,.pptx"
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Upload File
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : files?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border rounded-2xl bg-card border-dashed">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No files yet</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            Upload documents, presentations, or assignments for your {user?.subject} students.
          </p>
          <Button onClick={() => fileInputRef.current?.click()} variant="outline">
            Upload First File
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files?.map((file) => (
            <Card key={file.id} className="group hover-elevate border-card-border overflow-hidden">
              <CardContent className="p-0">
                <div className="p-5 flex items-start justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate text-foreground" title={file.filename}>
                        {file.filename}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(new Date(file.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(file.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
