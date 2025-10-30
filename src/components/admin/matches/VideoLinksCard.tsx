import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { ExternalLink, Youtube } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface VideoLink {
  type: 'tba' | 'youtube' | 'other';
  url: string;
  label: string;
}

interface VideoLinksCardProps {
  videos: VideoLink[];
}

export function VideoLinksCard({ videos }: VideoLinksCardProps) {
  if (!videos || videos.length === 0) {
    return (
      <Card className="h-[120px]">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            No video links available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[120px]">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Match Videos
        </h3>
        <div className="flex flex-wrap gap-2">
          {videos.map((video, index) => (
            <a
              key={index}
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              {video.type === 'youtube' && (
                <Youtube className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
              {video.type === 'tba' && (
                <Badge variant="default" className="text-xs px-2 py-0">TBA</Badge>
              )}
              <span className="text-gray-900 dark:text-gray-100">{video.label}</span>
              <ExternalLink className="h-3 w-3 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" />
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
