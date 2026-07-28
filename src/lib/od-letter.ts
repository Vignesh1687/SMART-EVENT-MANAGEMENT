import jsPDF from "jspdf";
import { format } from "date-fns";

interface ODLetterData {
  studentName: string;
  registerNumber: string;
  department: string;
  eventName: string;
  eventType?: string;
  eventDate: string;
  eventTime?: string;
  eventVenue?: string;
}

async function createLogoWatermarkDataUrl(url: string, width: number, height: number, opacity = 0.08) {
  const image = new Image();
  image.crossOrigin = "Anonymous";
  image.src = url;

  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create canvas context for watermark");

  ctx.globalAlpha = opacity;
  ctx.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/png");
}

function drawLetterHeader(doc: jsPDF, pageWidth: number, leftMargin: number, rightMargin: number) {
  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(0.8);
  doc.rect(15, 15, pageWidth - 30, doc.internal.pageSize.getHeight() - 30);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("SRM UNIVERSITY", pageWidth / 2, 32, { align: "center" });
  doc.setFontSize(14);
  doc.text("ON-DUTY LETTER", pageWidth / 2, 44, { align: "center" });
  doc.setLineWidth(0.5);
  doc.line(leftMargin, 52, rightMargin, 52);
}

async function drawWatermark(doc: jsPDF, pageWidth: number) {
  try {
    const watermarkDataUrl = await createLogoWatermarkDataUrl("/logo.png", 140, 140, 0.08);
    const watermarkSize = 120;
    const x = (pageWidth - watermarkSize) / 2;
    const y = 90;
    doc.addImage(watermarkDataUrl, "PNG", x, y, watermarkSize, watermarkSize, undefined, "FAST");
  } catch {
    // If the watermark cannot be loaded, continue without it
  }
}

export async function generateODLetter(data: ODLetterData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const leftMargin = 20;
  const rightMargin = pageWidth - 20;
  const contentWidth = pageWidth - leftMargin * 2;

  drawLetterHeader(doc, pageWidth, leftMargin, rightMargin);
  await drawWatermark(doc, pageWidth);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Date: ${format(new Date(), "PPP")}`, leftMargin, 62);
  doc.text("Ref: OD/2026/001", rightMargin, 62, { align: "right" });

  const studentName = data.studentName || "—";
  const registerNumber = data.registerNumber?.trim() || "";
  const department = data.department?.trim() || "";
  const eventTypeSegment = data.eventType ? ` (${data.eventType})` : "";
  const eventTimeSegment = data.eventTime ? ` from ${data.eventTime}` : "";
  const eventVenueSegment = data.eventVenue ? ` at ${data.eventVenue}` : "";

  const studentDetails: string[] = [];
  if (registerNumber) studentDetails.push(`Register Number: ${registerNumber}`);
  if (department) studentDetails.push(`Department of ${department}`);

  const studentDescriptor = studentDetails.length > 0 ? ` (${studentDetails.join(" | ")})` : "";

  const bodyLines = [
    `This is to certify that ${studentName}${studentDescriptor} has been granted On-Duty permission for attending the event "${data.eventName}"${eventTypeSegment} held on ${format(new Date(data.eventDate), "PPP")}${eventTimeSegment}${eventVenueSegment}.",
    "",
    "The student is permitted to be absent from regular classes on the above-mentioned date for the purpose of participating in the said event.",
    "",
    "This letter is issued upon request for official records.",
  ];

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  const wrappedBody = doc.splitTextToSize(bodyLines.join("\n"), contentWidth);
  doc.text(wrappedBody, leftMargin, 76);

  const signatureY = 76 + wrappedBody.length * 7 + 20;
  doc.setFontSize(10);
  doc.text("For and on behalf of SRM UNIVERSITY", leftMargin, signatureY);
  doc.text("Authorized Signatory", rightMargin, signatureY, { align: "right" });

  doc.setLineWidth(0.3);
  doc.line(rightMargin - 55, signatureY + 22, rightMargin, signatureY + 22);
  doc.text("Event Management System", rightMargin, signatureY + 28, { align: "right" });

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    "This is a computer generated letter and does not require a physical signature.",
    leftMargin,
    doc.internal.pageSize.getHeight() - 20
  );

  doc.addPage();
  drawLetterHeader(doc, pageWidth, leftMargin, rightMargin);
  await drawWatermark(doc, pageWidth);

  doc.setFontSize(12);
  doc.setTextColor(20);
  doc.text("Event Details", leftMargin, 50);
  doc.setFontSize(10);
  const detailLines = [
    `Student Name: ${studentName}`,
    `Register Number: ${registerNumber}`,
    `Department: ${department}`,
    `Event Name: ${data.eventName}`,
    `Event Type: ${data.eventType || "N/A"}`,
    `Event Date: ${format(new Date(data.eventDate), "PPP")}`,
    `Event Time: ${data.eventTime || "N/A"}`,
    `Event Venue: ${data.eventVenue || "N/A"}`,
    "",
    "Notes:",
    "This letter is valid only for the event and date specified above.",
    "Please carry this letter to the concerned authorities when requested.",
  ];
  doc.text(detailLines, leftMargin, 60);

  doc.save(`OD_Letter_${studentName.replace(/\s+/g, "_")}.pdf`);
}
