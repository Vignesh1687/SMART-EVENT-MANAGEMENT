import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getVenueBlocksStatus,
  getStatusColor,
  getStatusLabel,
  type VenueBlockInfo,
} from "@/lib/venue-management";
import { formatTime } from "@/lib/conflict-detection";

export const VenueBlockScheduler = () => {
  const [blocks, setBlocks] = useState<VenueBlockInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchBuilding, setSearchBuilding] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "available" | "occupied" | "upcoming">("all");
  
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastBlocksRef = useRef<string>("");

  // Memoized load function
  const loadBlocks = useCallback(async () => {
    // Skip if scrolling
    if (isScrollingRef.current) return;
    
    try {
      const blockStatus = await getVenueBlocksStatus();
      const blocksJson = JSON.stringify(blockStatus);
      
      // Only update if data changed (prevent unnecessary re-renders)
      if (lastBlocksRef.current !== blocksJson) {
        lastBlocksRef.current = blocksJson;
        setBlocks(blockStatus);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error loading blocks:", error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load
    setLoading(true);
    loadBlocks();
  }, [loadBlocks]);

  // Setup scroll listener
  useEffect(() => {
    const handleScroll = () => {
      isScrollingRef.current = true;
      
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Resume refresh 2 seconds after scroll stops
      scrollTimeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false;
      }, 2000);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Setup refresh interval (only refresh when not scrolling)
  useEffect(() => {
    // Don't start interval until first load is complete
    if (loading) return;
    
    // Set up interval that calls loadBlocks
    intervalRef.current = setInterval(() => {
      loadBlocks();
    }, 5000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [loadBlocks, loading]);

  // Handle tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadBlocks(false);
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadBlocks]);

  const filteredBlocks = blocks.filter((block) => {
    if (searchBuilding && !block.venue.name.toLowerCase().includes(searchBuilding.toLowerCase())) {
      return false;
    }
    if (filterStatus !== "all" && block.status !== filterStatus) {
      return false;
    }
    return true;
  });

  const statusCounts = {
    available: blocks.filter((b) => b.status === "available").length,
    occupied: blocks.filter((b) => b.status === "occupied").length,
    upcoming: blocks.filter((b) => b.status === "upcoming").length,
  };

  if (loading) {
    return <div className="p-8 text-center">Loading venue blocks...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="glass-card border-2 border-cyan-500/50 bg-gradient-to-br from-cyan-500/30 to-cyan-500/5 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(34,211,238,0.4)]">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-6xl font-bold text-cyan-300 drop-shadow-lg">{statusCounts.available}</div>
              <div className="text-sm text-cyan-200 font-semibold uppercase tracking-wide">Available Blocks</div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-2 border-amber-500/50 bg-gradient-to-br from-amber-500/30 to-amber-500/5 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(251,146,60,0.4)]">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-6xl font-bold text-amber-300 drop-shadow-lg">{statusCounts.upcoming}</div>
              <div className="text-sm text-amber-200 font-semibold uppercase tracking-wide">Upcoming Events</div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-2 border-rose-500/50 bg-gradient-to-br from-rose-500/30 to-rose-500/5 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(244,63,94,0.4)]">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-6xl font-bold text-rose-300 drop-shadow-lg">{statusCounts.occupied}</div>
              <div className="text-sm text-rose-200 font-semibold uppercase tracking-wide">Occupied Blocks</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card border-white/10 bg-slate-950/70 backdrop-blur-2xl">
        <CardHeader>
          <CardTitle className="text-white">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="search" className="text-slate-300">Search Block</Label>
              <Input
                id="search"
                placeholder="e.g., Block A-1, Building B..."
                value={searchBuilding}
                onChange={(e) => setSearchBuilding(e.target.value)}
                className="bg-slate-900/70 border-slate-700 text-white placeholder-slate-500"
              />
            </div>
            <div>
              <Label htmlFor="status-filter" className="text-slate-300">Filter by Status</Label>
              <select
                id="status-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as "all" | "available" | "occupied" | "upcoming")}
                className="w-full border border-slate-700 rounded px-3 py-2 bg-slate-900/70 text-white"
              >
                <option value="all">All Blocks</option>
                <option value="available">Available Only</option>
                <option value="occupied">Occupied Only</option>
                <option value="upcoming">Upcoming Events</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Venue Blocks Grid */}
      <Card className="glass-card border-white/10 bg-slate-950/70 backdrop-blur-2xl">
        <CardHeader>
          <CardTitle className="text-white">Venue Blocks ({filteredBlocks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredBlocks.map((block) => (
              <div
                key={block.venue.id}
                className={`border-2 rounded-xl p-3 transition-all cursor-pointer hover:shadow-2xl hover:scale-105 ${getStatusColor(
                  block.status
                )}`}
              >
                {/* Block Name */}
                <div className="font-bold text-sm mb-2 text-white">{block.venue.name}</div>

                {/* Status Badge */}
                <Badge variant="outline" className="mb-2 text-xs w-full justify-center">
                  {getStatusLabel(block.status)}
                </Badge>

                {/* Capacity */}
                <div className="text-xs mb-2">
                  <span className="font-semibold">Capacity:</span> {block.venue.capacity}
                </div>

                {/* Current Event Info */}
                {block.currentEvent && (
                  <div className="text-xs bg-white bg-opacity-70 rounded p-1 mb-2">
                    <div className="font-semibold text-red-700">Now:</div>
                    <div className="truncate">{block.currentEvent.title}</div>
                    <div className="text-red-600">
                      {formatTime(block.currentEvent.start_time)} - {formatTime(block.currentEvent.end_time)}
                    </div>
                  </div>
                )}

                {/* Next Event Info */}
                {block.nextEvent && !block.currentEvent && (
                  <div className="text-xs bg-white bg-opacity-70 rounded p-1">
                    <div className="font-semibold text-yellow-700">Next:</div>
                    <div className="truncate">{block.nextEvent.title}</div>
                    <div className="text-yellow-600">
                      @ {formatTime(block.nextEvent.start_time)}
                    </div>
                  </div>
                )}

                {/* Available Message */}
                {block.status === "available" && !block.nextEvent && (
                  <div className="text-xs text-green-700 font-semibold">
                    ✓ Ready to book
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="glass-card border-white/10 bg-slate-950/70 backdrop-blur-2xl">
        <CardHeader>
          <CardTitle className="text-white">Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2 p-3 rounded-lg border border-rose-500/30 bg-rose-500/10">
              <div className="w-6 h-6 bg-rose-500/40 border-2 border-rose-500 rounded"></div>
              <div className="text-sm">
                <div className="font-semibold text-rose-300">RED - Occupied</div>
                <div className="text-xs text-rose-200">Cannot select, event in progress</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
              <div className="w-6 h-6 bg-amber-500/40 border-2 border-amber-500 rounded"></div>
              <div className="text-sm">
                <div className="font-semibold text-amber-300">YELLOW - Upcoming</div>
                <div className="text-xs text-amber-200">Next event queued after current</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10">
              <div className="w-6 h-6 bg-cyan-500/40 border-2 border-cyan-500 rounded"></div>
              <div className="text-sm">
                <div className="font-semibold text-cyan-300">GREEN - Available</div>
                <div className="text-xs text-cyan-200">Ready to book for new events</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VenueBlockScheduler;
