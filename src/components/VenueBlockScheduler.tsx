import { useEffect, useState } from "react";
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

  useEffect(() => {
    const loadBlocks = async () => {
      setLoading(true);
      const blockStatus = await getVenueBlocksStatus();
      setBlocks(blockStatus);
      setLoading(false);
    };

    loadBlocks();
    
    // Refresh every 5 seconds instead of 30 for real-time updates
    const interval = setInterval(loadBlocks, 5000);
    
    // Also refetch when page becomes visible (tab focus)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadBlocks();
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

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
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{statusCounts.available}</div>
              <div className="text-sm text-green-700">Available Blocks</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">{statusCounts.upcoming}</div>
              <div className="text-sm text-yellow-700">Upcoming Events</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{statusCounts.occupied}</div>
              <div className="text-sm text-red-700">Occupied Blocks</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="search">Search Block</Label>
              <Input
                id="search"
                placeholder="e.g., Block A-1, Building B..."
                value={searchBuilding}
                onChange={(e) => setSearchBuilding(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="status-filter">Filter by Status</Label>
              <select
                id="status-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full border rounded px-3 py-2"
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
      <Card>
        <CardHeader>
          <CardTitle>Venue Blocks ({filteredBlocks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredBlocks.map((block) => (
              <div
                key={block.venue.id}
                className={`border-2 rounded-lg p-3 transition-all cursor-pointer hover:shadow-lg ${getStatusColor(
                  block.status
                )}`}
              >
                {/* Block Name */}
                <div className="font-bold text-sm mb-2">{block.venue.name}</div>

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
      <Card>
        <CardHeader>
          <CardTitle>Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-100 border-2 border-red-500 rounded"></div>
              <div className="text-sm">
                <div className="font-semibold">RED - Occupied</div>
                <div className="text-xs text-gray-600">Cannot select, event in progress</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-yellow-100 border-2 border-yellow-500 rounded"></div>
              <div className="text-sm">
                <div className="font-semibold">YELLOW - Upcoming</div>
                <div className="text-xs text-gray-600">Next event queued after current</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-100 border-2 border-green-500 rounded"></div>
              <div className="text-sm">
                <div className="font-semibold">GREEN - Available</div>
                <div className="text-xs text-gray-600">Ready to book for new events</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VenueBlockScheduler;
