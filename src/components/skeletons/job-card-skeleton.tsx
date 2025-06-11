
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function JobCardSkeleton() {
  return (
    <Card className="overflow-hidden shadow-md flex flex-col h-full bg-card">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <Skeleton className="h-6 w-3/4 mb-1" /> {/* Job Title */}
          <Skeleton className="h-5 w-1/4" />   {/* Status Badge */}
        </div>
        <Skeleton className="h-4 w-1/2" /> {/* Category */}
      </CardHeader>
      <CardContent className="pt-0 pb-4 text-sm flex-grow space-y-2">
        <div className="flex items-center">
          <Skeleton className="h-4 w-4 mr-2 rounded-full" /> {/* MapPin Icon */}
          <Skeleton className="h-4 w-2/3" /> {/* Location */}
        </div>
        <div className="flex items-center">
          <Skeleton className="h-4 w-4 mr-2 rounded-full" /> {/* Calendar Icon */}
          <Skeleton className="h-4 w-1/2" /> {/* Posted Date */}
        </div>
        <Skeleton className="h-4 w-full" /> {/* Description Line 1 */}
        <Skeleton className="h-4 w-full" /> {/* Description Line 2 */}
        <Skeleton className="h-4 w-5/6" /> {/* Description Line 3 */}
      </CardContent>
      <CardFooter className="p-4 border-t bg-muted/30">
        <Skeleton className="h-10 w-full" /> {/* Button */}
      </CardFooter>
    </Card>
  );
}
