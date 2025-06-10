
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProviderProfileSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="overflow-hidden shadow-xl">
        <CardHeader className="p-0">
          <Skeleton className="h-64 md:h-80 w-full" /> {/* Banner Image */}
          <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-6 md:p-8">
            <div className="flex items-start md:items-center space-x-4">
              <Skeleton className="relative w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-background shadow-lg" /> {/* Profile Picture */}
              <div>
                <Skeleton className="h-10 w-64 mb-2" /> {/* Business Name */}
                <Skeleton className="h-5 w-40 mb-2" /> {/* Rating & Reviews */}
                <Skeleton className="h-6 w-48" />    {/* Verified Badge */}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="md:col-span-2 space-y-4">
              {/* Tabs Skeleton */}
              <div className="flex space-x-1 border-b mb-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </div>
              {/* Tab Content Skeleton */}
              <Card>
                <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-3/4 mt-2" />
                  <Skeleton className="h-4 w-4/5" />
                </CardContent>
              </Card>
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-5/6" />
                  <Skeleton className="h-5 w-full mt-2" />
                  <Skeleton className="h-10 w-full mt-3" /> {/* Button */}
                  <Skeleton className="h-10 w-full mt-2" /> {/* Button */}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-16 w-full" /> {/* Textarea */}
                  <Skeleton className="h-10 w-full mt-2" /> {/* Button */}
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
