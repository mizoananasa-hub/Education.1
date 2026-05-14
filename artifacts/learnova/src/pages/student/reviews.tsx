import { useAuth } from "@/components/auth-provider";
import { useGetMyRatings, getGetMyRatingsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Loader2, Star } from "lucide-react";

function getLabelColor(label: string) {
  switch (label) {
    case "Excellent": return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
    case "Good": return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "Average": return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
    default: return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
  }
}

export default function StudentReviews() {
  const { user } = useAuth();
  
  const { data: ratings, isLoading } = useGetMyRatings({
    query: { enabled: !!user, queryKey: getGetMyRatingsQueryKey() }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Star className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance Reviews</h1>
          <p className="text-muted-foreground mt-1">Feedback across all your subjects.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : ratings?.length === 0 ? (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">No reviews yet</h3>
            <p className="text-muted-foreground">Teachers haven't submitted any evaluations for you.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {ratings?.map((rating) => (
            <Card key={rating.id} className="overflow-hidden hover-elevate transition-all border-card-border flex flex-col">
              <div className="bg-muted/50 p-4 border-b border-border flex justify-between items-center">
                <span className="font-semibold">{rating.subject}</span>
                <span className="text-xs text-muted-foreground">By {rating.teacherName}</span>
              </div>
              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <Badge variant="outline" className={getLabelColor(rating.label)}>
                      {rating.label}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <span className="text-4xl font-bold text-primary tracking-tighter">{rating.score}</span>
                    <span className="text-muted-foreground">/100</span>
                  </div>
                </div>
                
                <Progress value={rating.score} className="h-3 mb-6" />
                
                {rating.comment ? (
                  <div className="bg-card border border-border rounded-xl p-4 text-sm mt-auto shadow-sm">
                    <p className="italic text-muted-foreground">"{rating.comment}"</p>
                  </div>
                ) : (
                  <div className="mt-auto text-sm text-muted-foreground text-center italic py-2">
                    No comments provided.
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
