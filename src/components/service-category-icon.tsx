import { Wrench, Zap, Wind, Sun, Trash2, Sprout, LucideProps, HelpCircle } from 'lucide-react';
import type { FC } from 'react';

export type ServiceCategory =
  | 'Plumbing'
  | 'Electrical'
  | 'HVAC'
  | 'Solar Installation'
  | 'Garbage Collection'
  | 'Landscaping'
  | 'Other';

interface ServiceCategoryIconProps extends LucideProps {
  category: ServiceCategory;
  iconOnly?: boolean;
}

const serviceIcons: Record<ServiceCategory, FC<LucideProps>> = {
  Plumbing: Wrench,
  Electrical: Zap,
  HVAC: Wind,
  'Solar Installation': Sun,
  'Garbage Collection': Trash2,
  Landscaping: Sprout,
  Other: HelpCircle,
};

const ServiceCategoryIcon: FC<ServiceCategoryIconProps> = ({ category, className, iconOnly = false, ...props }) => {
  const IconComponent = serviceIcons[category] || HelpCircle;

  if (iconOnly) {
    return <IconComponent className={className} {...props} />;
  }

  return (
    <div className="flex flex-col items-center space-y-2 p-4 rounded-lg hover:bg-card transition-colors cursor-pointer">
      <div className="p-3 bg-primary/10 rounded-full">
         <IconComponent className={`h-8 w-8 text-primary ${className}`} {...props} />
      </div>
      <span className="text-sm font-medium text-center">{category}</span>
    </div>
  );
};

export default ServiceCategoryIcon;
