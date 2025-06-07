import { Wrench, Zap, Wind, Sun, Trash2, Sprout, LucideProps, HelpCircle, Settings, PaintRoller, Hammer, Layers, Bug, KeyRound } from 'lucide-react';
import type { FC } from 'react';

export type ServiceCategory =
  | 'Plumbing'
  | 'Electrical'
  | 'Appliance Repair'
  | 'Garbage Collection'
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
}

const serviceIcons: Record<ServiceCategory, FC<LucideProps>> = {
  'Plumbing': Wrench,
  'Electrical': Zap,
  'Appliance Repair': Settings, // Core Tier 1
  'Garbage Collection': Trash2, // Core Tier 1
  'HVAC': Wind, // Tier 2
  'Solar Installation': Sun, // Tier 2
  'Painting & Decorating': PaintRoller, // Tier 2
  'Carpentry & Furniture': Hammer, // Tier 2
  'Landscaping': Sprout, // Tier 3
  'Tiling & Masonry': Layers, // Tier 3
  'Pest Control': Bug, // Tier 3
  'Locksmith': KeyRound, // Tier 3
  'Other': HelpCircle,
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
