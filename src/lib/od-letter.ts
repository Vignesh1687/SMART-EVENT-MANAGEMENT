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
const body = `This is to certify that ${data.studentName} (Register Number: ${data.registerNumber}), Department of ${data.department}, has been granted On-Duty permission to participate in the event titled "${data.eventName}" scheduled for ${format(new Date(data.eventDate), "PPP")}. The student will take part in the event's academic and professional activities, including attendance at sessions, workshops, and collaborative engagements relevant to their field of study.

The student is permitted to be absent from regular classes on the above-mentioned date to attend these approved event activities, which contribute to their practical learning and professional development.

This letter is issued for official records and administrative purposes.`;

  doc.setFontSize(12);
  const lines = doc.splitTextToSize(body, pageWidth - 40);
  doc.text(lines, 20, 75);

  // Signature
  const yPos = 75 + lines.length * 7 + 30;
  doc.text("Approved by:", 20, yPos);
  doc.text("BELOVED SRM INSTITUTE OF SCIENCE AND TECHNOLOGY", 20, yPos + 7);
  doc.text("Authorized Signatory", pageWidth - 20, yPos + 22, { align: "right" });
  doc.text("Event Management System", pageWidth - 20, yPos + 29, { align: "right" });

  doc.save(`OD_Letter_${data.studentName.replace(/\s+/g, "_")}.pdf`);
}
