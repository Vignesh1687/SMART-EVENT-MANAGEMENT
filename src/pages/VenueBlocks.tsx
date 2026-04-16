import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import VenueBlockScheduler from "@/components/VenueBlockScheduler";
import { Info } from "lucide-react";

export default function VenueBlocks() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Venue Block Management</h1>
        <p className="text-gray-600 mt-2">
          Real-time venue availability and scheduling across all college blocks
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This system shows 100 venue blocks (Building A-D with 25 rooms each). The color status
          updates in real-time:
          <ul className="mt-2 space-y-1 ml-4 text-sm">
            <li>🟥 <strong>RED (Occupied)</strong>: Event currently in progress - cannot select</li>
            <li>🟨 <strong>YELLOW (Upcoming)</strong>: Next event scheduled - waiting for venue to become available</li>
            <li>🟩 <strong>GREEN (Available)</strong>: Ready to use - can book new events</li>
          </ul>
        </AlertDescription>
      </Alert>

      <VenueBlockScheduler />
    </div>
  );
}
