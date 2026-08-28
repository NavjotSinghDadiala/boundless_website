import Link from "next/link";
import { TrendingUpIcon, UsersIcon, ImageIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function TripCardAdmin({ trip }) {
  const coverImage = trip.images?.[0]?.url;

  return (
    <Link href={`/admin/trip/view/${trip.id}`}>
      <Card className="@container/card cursor-pointer overflow-hidden transition-shadow hover:shadow-md">
        {coverImage && (
          <div className="aspect-video w-full overflow-hidden">
            <img
              src={coverImage}
              alt={trip.name}
              className="h-full w-full object-cover transition-transform hover:scale-105"
            />
          </div>
        )}
        {!coverImage && (
          <div className="flex aspect-video w-full items-center justify-center bg-muted">
            <ImageIcon className="size-12 text-muted-foreground/30" />
          </div>
        )}
        <CardHeader className="relative pb-2">
          <CardTitle className="@[250px]/card:text-xl text-lg font-semibold">
            {trip.name}
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
              <UsersIcon className="size-3" />
              {trip.totalJoined || 0} Joined
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-3 pt-0 text-sm">
          {trip.description && (
            <p className="line-clamp-2 text-muted-foreground">
              {trip.description}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {trip.femaleReservedSeats > 0 && (
              <Badge variant="secondary" className="text-xs">
                {trip.femaleReservedSeats} female
              </Badge>
            )}
            {trip.images?.length > 0 && (
              <Badge variant="outline" className="flex gap-1 text-xs">
                <ImageIcon className="size-3" />
                {trip.images.length}
              </Badge>
            )}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
