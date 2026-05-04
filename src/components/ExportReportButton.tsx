import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { generateDailyRegistrationReport } from "@/lib/generate-report";

interface ExportReportButtonProps {
  reportDate: string;
}

export const ExportReportButton = ({ reportDate }: ExportReportButtonProps) => {
  const handleExport = async () => {
    await generateDailyRegistrationReport(reportDate);
  };

  return (
    <Button
      onClick={handleExport}
      variant="default"
      className="gap-2"
      title="Download project report as PDF"
    >
      <Download className="w-4 h-4" />
      Export Report (PDF)
    </Button>
  );
};
