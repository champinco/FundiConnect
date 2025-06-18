
import Image from 'next/image';
import Link from 'next/link';
import { Star, MapPin } from 'lucide-react';
import VerifiedBadge from './verified-badge';
import ServiceCategoryIcon, { type ServiceCategory } from './service-category-icon';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface Provider {
  id: string;
  name: string;
  profilePictureUrl: string;
  rating: number;
  reviewsCount: number;
  location: string;
  mainService: ServiceCategory;
  otherMainServiceDescription?: string; // Added
  isVerified: boolean;
  verificationAuthority?: string; // e.g., "NCA" or "EPRA"
  bioSummary: string;
}

interface ProviderCardProps {
  provider: Provider;
}

export default function ProviderCard({ provider }: ProviderCardProps) {
  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
      <CardHeader className="p-0">
        <div className="relative h-48 w-full">
          <Image
            src={provider.profilePictureUrl || 'https://placehold.co/300x300.png'}
            alt={provider.name}
            fill
            style={{ objectFit: 'cover' }}
            data-ai-hint="professional portrait"
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="text-xl font-headline">{provider.name}</CardTitle>
          {provider.isVerified && provider.verificationAuthority && (
            <VerifiedBadge authority={`${provider.verificationAuthority} Verified`} isVerified={provider.isVerified} />
          )}
        </div>
        <div className="flex items-center space-x-1 text-sm text-muted-foreground mb-1">
          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
          <span>{provider.rating.toFixed(1)}</span>
          <span>({provider.reviewsCount} reviews)</span>
        </div>
        <div className="flex items-center space-x-1 text-sm text-muted-foreground mb-3">
          <MapPin className="h-4 w-4 text-primary" />
          <span>{provider.location}</span>
        </div>
        <div className="mb-3 flex items-center">
          <ServiceCategoryIcon category={provider.mainService} iconOnly className="h-6 w-6 text-primary inline-block mr-2" />
          <span className="text-sm font-semibold">
            {provider.mainService === 'Other' && provider.otherMainServiceDescription ? provider.otherMainServiceDescription : provider.mainService}
          </span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-3">
          {provider.bioSummary}
        </p>
      </CardContent>
      <CardFooter className="p-4 border-t">
        <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link href={`/providers/${provider.id}`}>View Profile</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
