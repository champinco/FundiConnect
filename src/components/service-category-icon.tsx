import { Wrench, Zap, Wind, Sun, Trash2, Sprout, LucideProps, HelpCircle, Settings, PaintRoller, Hammer, Layers, Bug, KeyRound, Car } from 'lucide-react';
import type { FC } from 'react';

export type ServiceCategory =
  | 'Plumbing'
  | 'Electrical'
  | 'Appliance Repair'
  | 'Garbage Collection'
  | 'Vehicle Mechanics'
  // Tier 2
  | 'HVAC'
  | 'Solar Installation'
  | 'Painting & Decorating'
  | 'Carpentry & Furniture'
  // Tier 3
  | 'Landscaping'
  | 'Tiling & Masonry'
  | 'Pest Control'
  | 'Locksmith'
  // Fallback
  | 'Other';

interface ServiceCategoryIconProps extends LucideProps {
  category: ServiceCategory;
  iconOnly?: boolean;
  displayName?: string;
}

const serviceIcons: Record<ServiceCategory, FC<LucideProps>> = {
  'Plumbing': Wrench,
  'Electrical': Zap,
  'Appliance Repair': Settings,
  'Garbage Collection': Trash2,
  'Vehicle Mechanics': Car,
  'HVAC': Wind,
  'Solar Installation': Sun,
  'Painting & Decorating': PaintRoller,
  'Carpentry & Furniture': Hammer,
  'Landscaping': Sprout,
  'Tiling & Masonry': Layers,
  'Pest Control': Bug,
  'Locksmith': KeyRound,
  'Other': HelpCircle,
};

const ServiceCategoryIcon: FC<ServiceCategoryIconProps> = ({ category, displayName, className, iconOnly = false, ...props }) => {
  const IconComponent = serviceIcons[category] || HelpCircle;

  if (iconOnly) {
    return <IconComponent className={className} {...props} />;
  }

  return (
    <div className="flex flex-col items-center space-y-2 p-3 sm:p-4 rounded-lg hover:bg-card transition-colors cursor-pointer">
      <div className="p-2 sm:p-3 bg-primary/10 rounded-full">
         <IconComponent className={`h-7 w-7 sm:h-8 sm:w-8 text-primary ${className}`} {...props} />
      </div>
      <span className="text-xs sm:text-sm font-medium text-center">{displayName || category}</span>
    </div>
  );
};

export default ServiceCategoryIcon;
