
"use client";

import Link from 'next/link';
import { MapPin, CalendarDays, Briefcase, ChevronRight } from 'lucide-react';
import ServiceCategoryIcon, { type ServiceCategory } from './service-category-icon';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Job, JobStatus } from '@/models/job'; 
import { formatDynamicDate } from '@/lib/dateUtils'; // Updated import

export interface JobCardProps {
  job: Pick<Job, 'id' | 'title' | 'serviceCategory' | 'otherCategoryDescription' | 'location' | 'postedAt' | 'status' | 'description'>;
}

export default function JobCard({ job }: JobCardProps) {
  const jobStatusDisplay: Record<JobStatus, string> = {
    open: 'Open',
    pending_quotes: 'Awaiting Quotes',
    assigned: 'Assigned',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    disputed: 'Disputed',
  };

  return (
    <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col h-full bg-card">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
            <CardTitle className="text-xl font-headline line-clamp-2 group-hover:text-primary transition-colors">
                <Link href={`/jobs/${job.id}`} className="hover:underline">
                    {job.title}
                </Link>
            </CardTitle>
            <Badge 
              variant={job.status === 'open' ? 'secondary' : job.status === 'completed' ? 'default' : 'outline'}
              className={`capitalize text-xs px-2 py-0.5 whitespace-nowrap ${
                job.status === 'open' ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-800/30 dark:text-blue-300 dark:border-blue-700' : 
                job.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-800/30 dark:text-yellow-300 dark:border-yellow-700' :
                job.status === 'completed' ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-800/30 dark:text-green-300 dark:border-green-700' :
                job.status === 'assigned' ? 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-800/30 dark:text-purple-300 dark:border-purple-700' :
                'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800/30 dark:text-gray-300 dark:border-gray-700' 
              }`}
            >
              {jobStatusDisplay[job.status] || job.status.replace('_', ' ')}
            </Badge>
        </div>
         <CardDescription className="flex items-center text-xs text-muted-foreground pt-1">
            <ServiceCategoryIcon category={job.serviceCategory} iconOnly className="h-3.5 w-3.5 mr-1.5" />
            {job.serviceCategory}
            {job.serviceCategory === 'Other' && job.otherCategoryDescription && ` (${job.otherCategoryDescription})`}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 pb-4 text-sm flex-grow">
        <div className="flex items-center text-muted-foreground mb-1.5">
          <MapPin className="h-4 w-4 mr-2 text-primary shrink-0" />
          <span>{job.location}</span>
        </div>
        <div className="flex items-center text-muted-foreground mb-3">
          <CalendarDays className="h-4 w-4 mr-2 text-primary shrink-0" />
          <span>Posted: {formatDynamicDate(job.postedAt)}</span>
        </div>
        <p className="text-muted-foreground line-clamp-3">
          {job.description}
        </p>
      </CardContent>
      <CardFooter className="p-4 border-t bg-muted/30">
        <Button asChild variant="default" className="w-full bg-primary hover:bg-primary/90">
          <Link href={`/jobs/${job.id}`}>
            View Details <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
