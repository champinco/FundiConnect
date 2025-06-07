import { CheckCircle2 } from 'lucide-react';
import type { FC } from 'react';

interface VerifiedBadgeProps {
  authority: string; // e.g., "NCA Verified", "EPRA Verified"
  isVerified: boolean;
}

const VerifiedBadge: FC<VerifiedBadgeProps> = ({ authority, isVerified }) => {
  if (!isVerified) {
    return null;
  }

  return (
    <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 dark:bg-teal-700 dark:text-teal-100">
      <CheckCircle2 className="h-3.5 w-3.5" />
      <span>{authority}</span>
    </div>
  );
};

export default VerifiedBadge;
