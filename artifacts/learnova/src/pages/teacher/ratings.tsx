import { useAuth } from "@/components/auth-provider";
import { useGetRatingsBySubject, getGetRatingsBySubjectQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

function getLabelColor(label: string) {
  switch (label) {
    case "Excellent": return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
    case "Good": return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "Average": return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
    default: return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
  }
}

export default function TeacherRatings() {
  const { user } = useAuth();
  
  const { data: ratings, isLoading } = useGetRatingsBySubject({
    query: { enabled: !!user, queryKey: getGetRatingsBySubjectQueryKey() }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Given Ratings</h1>
        <p className="text-muted-foreground mt-1">History of evaluations for your students.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : ratings?.length === 0 ? (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">No ratings yet</h3>
            <p className="text-muted-foreground">You haven't rated any students yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ratings?.map((rating) => (
            <Card key={rating.id} className="overflow-hidden hover-elevate transition-all border-card-border">
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{rating.studentName}</h3>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(rating.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-primary">{rating.score}</span>
                    <span className="text-sm text-muted-foreground">/100</span>
                  </div>
                </div>
                
                <Progress value={rating.score} className="h-2 mb-4" />
                
                <div className="mb-4">
                  <Badge variant="outline" className={getLabelColor(rating.label)}>
                    {rating.label}
                  </Badge>
                </div>
                
                {rating.comment && (
                  <div className="bg-muted/50 rounded-lg p-3 text-sm italic text-muted-foreground border border-border">
                    "{rating.comment}"
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
