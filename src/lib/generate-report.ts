import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { Event, Profile, Registration } from '@/types/database';

const formatDateDisplay = (date: string) => {
  try {
    return format(new Date(date), 'PPP');
  } catch {
    return date;
  }
};

export const generateDailyRegistrationReport = async (reportDate: string) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 15;
  const lineHeight = 5;
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  // Helper functions
  const addTitle = (text: string, fontSize: number = 20) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', 'bold');
    yPosition += 5;
    doc.text(text, margin, yPosition);
    yPosition += fontSize / 2 + 3;
    return yPosition;
  };

  const addHeading = (text: string, fontSize: number = 14) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', 'bold');
    yPosition += 3;
    doc.text(text, margin, yPosition);
    yPosition += fontSize / 2 + 2;
    return yPosition;
  };

  const addSubheading = (text: string) => {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    yPosition += 2;
    doc.text(text, margin, yPosition);
    yPosition += 6;
    return yPosition;
  };

  const addText = (text: string, fontSize: number = 10, isBold: boolean = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const textLines = doc.splitTextToSize(text, contentWidth);
    doc.text(textLines, margin, yPosition);
    yPosition += textLines.length * lineHeight;
    return yPosition;
  };

  const checkPageBreak = (spaceNeeded: number = 30) => {
    if (yPosition + spaceNeeded > pageHeight - 10) {
      doc.addPage();
      yPosition = 15;
      // Add page number
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Page ${doc.internal.pages.length - 1}`, pageWidth - 20, pageHeight - 10);
    }
  };

  // Title
  addTitle('🎓 SMART EVENT MANAGEMENT SYSTEM');
  addTitle('DAILY REGISTRATION REPORT', 14);
  const reportDateDisplay = formatDateDisplay(reportDate);
  addText(`Report Date: ${reportDateDisplay}`, 10);
  addText(`Generated: ${format(new Date(), 'PPP')}`, 10);

  const { data: eventsOnDate, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('event_date', reportDate)
    .order('start_time', { ascending: true });

  if (eventError) {
    console.error('Error fetching events for PDF report:', eventError);
  }

  if (!eventsOnDate || eventsOnDate.length === 0) {
    checkPageBreak();
    addHeading('SUMMARY');
    addText(`No events are scheduled for ${reportDateDisplay}.`, 10);
    addText('There are no registrations for this date.', 10);
  } else {
    checkPageBreak();
    addHeading('SUMMARY');
    addText(`Events scheduled: ${eventsOnDate.length}`, 10);

    const eventIds = eventsOnDate.map((event) => event.id);
    const { data: registrations, error: registrationError } = await supabase
      .from('registrations')
      .select('*')
      .in('event_id', eventIds);

    if (registrationError) {
      console.error('Error fetching registrations for PDF report:', registrationError);
    }

    const uniqueStudentIds = Array.from(new Set((registrations || []).map((reg) => reg.user_id)));
    const { data: studentProfiles, error: profileError } = uniqueStudentIds.length
      ? await supabase.from('profiles').select('*').in('user_id', uniqueStudentIds)
      : { data: [], error: null };

    if (profileError) {
      console.error('Error fetching profiles for PDF report:', profileError);
    }

    const totalRegistrations = registrations?.length || 0;
    const totalApproved = (registrations || []).filter((reg) => reg.status === 'approved').length;
    const totalPending = (registrations || []).filter((reg) => reg.status === 'pending').length;
    const totalRejected = (registrations || []).filter((reg) => reg.status === 'rejected').length;
    addText(`Total registrations: ${totalRegistrations}`, 10);
    addText(`Approved registrations: ${totalApproved}`, 10);
    addText(`Pending registrations: ${totalPending}`, 10);
    addText(`Rejected registrations: ${totalRejected}`, 10);
    addText(`Unique students registered: ${studentProfiles?.length ?? 0}`, 10);

    for (const event of eventsOnDate) {
      checkPageBreak(30);
      addHeading(`${event.title}`);
      addText(`Date: ${reportDateDisplay}`, 9);
      addText(`Time: ${event.start_time} — ${event.end_time}`, 9);
      addText(`Venue: ${event.venue || 'N/A'}`, 9);

      const eventRegistrations = (registrations || []).filter((reg) => reg.event_id === event.id);
      const approvedRegistrations = eventRegistrations.filter((reg) => reg.status === 'approved');
      addText(`Registrations: ${eventRegistrations.length} (${approvedRegistrations.length} approved)`, 9);

      if (approvedRegistrations.length === 0) {
        addText('No approved student registrations are available for this event yet.', 9);
      } else {
        addSubheading('Approved Students');
        const approvedParticipants = approvedRegistrations
          .map((reg) => {
            const profile = (studentProfiles || []).find((profile) => profile.user_id === reg.user_id);
            return profile
              ? {
                  profile,
                  status: reg.status,
                }
              : null;
          })
          .filter(Boolean) as Array<{ profile: Profile; status: Registration['status'] }>;

        approvedParticipants.sort((a, b) => a.profile.full_name.localeCompare(b.profile.full_name));

        approvedParticipants.forEach((item) => {
          const studentLine = `${item.profile.full_name} | ${item.profile.register_number || '—'} | ${item.profile.department || '—'} | ${item.status}`;
          addText(studentLine, 9);
        });
      }

      const otherRegistrations = eventRegistrations.filter((reg) => reg.status !== 'approved');
      if (otherRegistrations.length > 0) {
        addSubheading('Pending / Rejected');
        const otherParticipants = otherRegistrations
          .map((reg) => {
            const profile = (studentProfiles || []).find((profile) => profile.user_id === reg.user_id);
            return profile
              ? {
                  profile,
                  status: reg.status,
                }
              : null;
          })
          .filter(Boolean) as Array<{ profile: Profile; status: Registration['status'] }>;

        otherParticipants.sort((a, b) => a.profile.full_name.localeCompare(b.profile.full_name));
        otherParticipants.forEach((item) => {
          const studentLine = `${item.profile.full_name} | ${item.profile.register_number || '—'} | ${item.profile.department || '—'} | ${item.status}`;
          addText(studentLine, 9);
        });
      }
    }
  }

  // Footer
  yPosition = pageHeight - 15;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Smart Event Management System - Daily Registration Report', margin, yPosition);
  doc.text(`Generated: ${format(new Date(), 'PPP')}`, pageWidth - margin - 40, yPosition);

  // Save the PDF
  const safeDate = reportDate.replace(/[^0-9a-zA-Z-_]/g, '_');
  doc.save(`Daily_Registration_Report_${safeDate}.pdf`);
};
