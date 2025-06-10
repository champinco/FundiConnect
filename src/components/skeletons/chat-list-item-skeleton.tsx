
import { Skeleton } from "@/components/ui/skeleton";

export default function ChatListItemSkeleton() {
  return (
    <div className="flex items-center space-x-4 p-4 rounded-lg border bg-card">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-3/4" /> {/* Display Name */}
          <Skeleton className="h-3 w-1/4" /> {/* Timestamp */}
        </div>
        <Skeleton className="h-4 w-full" /> {/* Last message */}
      </div>
      <Skeleton className="h-3 w-3 rounded-full" /> {/* Unread indicator */}
    </div>
  );
}
