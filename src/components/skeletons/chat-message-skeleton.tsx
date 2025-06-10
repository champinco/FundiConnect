
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ChatMessageSkeletonProps {
  isCurrentUser?: boolean;
}

export default function ChatMessageSkeleton({ isCurrentUser = false }: ChatMessageSkeletonProps) {
  return (
    <div className={cn("flex", isCurrentUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-xl shadow space-y-2",
          isCurrentUser ? "bg-primary/80" : "bg-muted"
        )}
      >
        <Skeleton className={cn("h-4", Math.random() > 0.5 ? "w-24" : "w-32", isCurrentUser ? "bg-primary-foreground/30" : "bg-foreground/20")} />
        <Skeleton className={cn("h-4", Math.random() > 0.3 ? "w-40" : "w-28", isCurrentUser ? "bg-primary-foreground/30" : "bg-foreground/20")} />
        <Skeleton className={cn("h-3 w-12", isCurrentUser ? "bg-primary-foreground/30" : "bg-foreground/20")} /> {/* Timestamp */}
      </div>
    </div>
  );
}
