
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProviderCardSkeleton() {
  return (
    <Card className="overflow-hidden shadow-lg flex flex-col h-full">
      <CardHeader className="p-0">
        <Skeleton className="h-48 w-full" />
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <Skeleton className="h-6 w-3/4 mb-2" /> {/* CardTitle */}
        <div className="flex items-center space-x-1 text-sm text-muted-foreground mb-1">
          <Skeleton className="h-4 w-4 rounded-full" /> {/* Star icon */}
          <Skeleton className="h-4 w-10" /> {/* Rating */}
          <Skeleton className="h-4 w-20" /> {/* Reviews count */}
        </div>
        <div className="flex items-center space-x-1 text-sm text-muted-foreground mb-3">
          <Skeleton className="h-4 w-4 rounded-full" /> {/* MapPin icon */}
          <Skeleton className="h-4 w-1/2" /> {/* Location */}
        </div>
        <div className="mb-3 flex items-center">
          <Skeleton className="h-6 w-6 rounded-full mr-2" /> {/* ServiceCategoryIcon */}
          <Skeleton className="h-5 w-1/3" /> {/* Service category name */}
        </div>
        <Skeleton className="h-4 w-full mb-1" /> {/* Bio line 1 */}
        <Skeleton className="h-4 w-full mb-1" /> {/* Bio line 2 */}
        <Skeleton className="h-4 w-2/3" />      {/* Bio line 3 */}
      </CardContent>
      <CardFooter className="p-4 border-t">
        <Skeleton className="h-10 w-full" /> {/* Button */}
      </CardFooter>
    </Card>
  );
}
