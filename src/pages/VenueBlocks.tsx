import { Alert, AlertDescription } from "@/components/ui/alert";
import VenueBlockScheduler from "@/components/VenueBlockScheduler";
import { Info } from "lucide-react";

export default function VenueBlocks() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold uppercase tracking-[0.2em] text-white futuristic-title">Venue Block Management</h1>
        <p className="text-slate-300 mt-3">
          Real-time venue availability and scheduling across all college blocks
        </p>
      </div>

      <Alert className="glass-card border-white/10 bg-slate-950/85">
        <Info className="h-4 w-4 text-cyan-300" />
        <AlertDescription className="text-slate-100">
          This system shows 100 venue blocks (Building A-D with 25 rooms each). The color status
          updates in real-time:
          <ul className="mt-3 space-y-2 ml-4 text-sm text-slate-200">
            <li>🔴 <strong className="text-rose-300">RED (Occupied)</strong>: Event currently in progress - cannot select</li>
            <li>🟡 <strong className="text-amber-300">YELLOW (Upcoming)</strong>: Next event scheduled - waiting for venue to become available</li>
            <li>🟢 <strong className="text-cyan-300">GREEN (Available)</strong>: Ready to use - can book new events</li>
          </ul>
        </AlertDescription>
      </Alert>

      <VenueBlockScheduler />
    </div>
  );
}
