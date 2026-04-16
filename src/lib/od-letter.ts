import jsPDF from "jspdf";
import { format } from "date-fns";

interface ODLetterData {
  studentName: string;
  registerNumber: string;
  department: string;
  eventName: string;
  eventDate: string;
}

export function generateODLetter(data: ODLetterData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("SRM UNIVERSITY", pageWidth / 2, 30, { align: "center" });

  doc.setFontSize(14);
  doc.text("ON-DUTY LETTER", pageWidth / 2, 42, { align: "center" });

  // Line
  doc.setLineWidth(0.5);
  doc.line(20, 48, pageWidth - 20, 48);

  // Date
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${format(new Date(), "PPP")}`, 20, 60);

  // Body
  const body = `This is to certify that ${data.studentName} (Register Number: ${data.registerNumber}), Department of ${data.department}, has been granted On-Duty permission for attending the event "${data.eventName}" held on ${format(new Date(data.eventDate), "PPP")}.

The student is permitted to be absent from regular classes on the above-mentioned date for the purpose of participating in the said event.

This letter is issued upon request for official records.`;

  doc.setFontSize(12);
  const lines = doc.splitTextToSize(body, pageWidth - 40);
  doc.text(lines, 20, 75);

  // Signature
  const yPos = 75 + lines.length * 7 + 30;
  doc.text("Authorized Signatory", pageWidth - 20, yPos, { align: "right" });
  doc.text("Event Management System", pageWidth - 20, yPos + 7, { align: "right" });

  doc.save(`OD_Letter_${data.studentName.replace(/\s+/g, "_")}.pdf`);
}
