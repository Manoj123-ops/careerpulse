import { jsPDF } from 'jspdf';

function createCvDoc(cv) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 42;
  const maxWidth = pageWidth - marginX * 2;
  let y = 42;

  const ensureSpace = (needed = 24) => {
    if (y + needed > pageHeight - 36) {
      doc.addPage();
      y = 40;
    }
  };

  const addSectionHeader = (title) => {
    ensureSpace(26);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(30, 58, 138);
    doc.text(title.toUpperCase(), marginX, y);
    y += 4;
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.75);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 12;
  };

  const addWrappedText = (text, options = {}) => {
    const {
      fontSize = 9.2,
      fontStyle = 'normal',
      color = [31, 41, 55],
      indent = 0,
      lineHeight = 12.2,
      bullet = false,
    } = options;

    doc.setFont('helvetica', fontStyle);
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);

    const availableWidth = maxWidth - indent - (bullet ? 10 : 0);
    const lines = doc.splitTextToSize(String(text || ''), availableWidth);

    lines.forEach((line, idx) => {
      ensureSpace(lineHeight + 2);
      if (bullet && idx === 0) {
        doc.text('•', marginX + indent, y);
      }
      doc.text(line, marginX + indent + (bullet ? 10 : 0), y);
      y += lineHeight;
    });
  };

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(cv.fullName || 'CANDIDATE NAME', pageWidth / 2, y, { align: 'center' });
  y += 16;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 64, 175);
  doc.text(cv.headline || '', pageWidth / 2, y, { align: 'center' });
  y += 13;

  const contactLine = [cv.phone, cv.email, cv.linkedin, cv.github].filter(Boolean).join('  |  ');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const contactWrapped = doc.splitTextToSize(contactLine, maxWidth);
  contactWrapped.forEach((line) => {
    doc.text(line, pageWidth / 2, y, { align: 'center' });
    y += 11;
  });

  // Summary
  if (cv.summary) {
    addSectionHeader('Professional Summary');
    addWrappedText(cv.summary, { fontSize: 9.1, lineHeight: 12.2 });
  }

  // Education
  if (cv.education?.length) {
    addSectionHeader('Education');
    cv.education.forEach((edu) => {
      ensureSpace(26);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.4);
      doc.setTextColor(15, 23, 42);
      doc.text(edu.degree || '', marginX, y);
      if (edu.period) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.8);
        doc.setTextColor(71, 85, 105);
        doc.text(edu.period, pageWidth - marginX, y, { align: 'right' });
      }
      y += 11.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.9);
      doc.setTextColor(51, 65, 85);
      doc.text([edu.institution, edu.score].filter(Boolean).join('  |  '), marginX, y);
      y += 13;
    });
  }

  // Technical Skills
  if (cv.skills?.length) {
    addSectionHeader('Technical Skills');
    cv.skills.forEach((skill) => {
      ensureSpace(14);
      const label = `${skill.category}: `;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      const labelWidth = doc.getTextWidth(label);
      const itemLines = doc.splitTextToSize(skill.items || '', maxWidth - labelWidth);

      doc.text(label, marginX, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(31, 41, 55);
      if (itemLines.length > 0) {
        doc.text(itemLines[0], marginX + labelWidth, y);
        y += 11.5;
        for (let i = 1; i < itemLines.length; i++) {
          ensureSpace(12);
          doc.text(itemLines[i], marginX + labelWidth, y);
          y += 11.5;
        }
      } else {
        y += 11.5;
      }
    });
  }

  // Experience
  if (cv.experience?.length) {
    addSectionHeader('Internship Experience');
    cv.experience.forEach((exp) => {
      ensureSpace(28);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      const titleLine = [exp.title, exp.company].filter(Boolean).join(' - ');
      doc.text(titleLine, marginX, y);
      if (exp.period) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.7);
        doc.setTextColor(71, 85, 105);
        doc.text(exp.period, pageWidth - marginX, y, { align: 'right' });
      }
      y += 12;
      (exp.bullets || []).forEach((bullet) => {
        addWrappedText(bullet, { fontSize: 8.9, lineHeight: 11.8, indent: 4, bullet: true });
      });
      y += 3;
    });
  }

  // Projects
  if (cv.projects?.length) {
    addSectionHeader('Projects');
    cv.projects.forEach((proj) => {
      ensureSpace(26);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(proj.title || '', marginX, y);
      if (proj.tech) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.3);
        doc.setTextColor(71, 85, 105);
        doc.text(proj.tech, pageWidth - marginX, y, { align: 'right' });
      }
      y += 12;
      (proj.bullets || []).forEach((bullet) => {
        addWrappedText(bullet, { fontSize: 8.9, lineHeight: 11.8, indent: 4, bullet: true });
      });
      y += 3;
    });
  }

  // Certifications
  if (cv.certifications?.length) {
    addSectionHeader('Certifications');
    cv.certifications.forEach((cert) => {
      addWrappedText(cert, { fontSize: 8.9, lineHeight: 11.8, indent: 4, bullet: true });
    });
  }

  return doc;
}

export function downloadCvPdf(cv, companyName = 'Tailored') {
  const doc = createCvDoc(cv);
  const safeName = (cv.fullName || 'Resume').replace(/[^a-zA-Z0-9]+/g, '_');
  const safeCompany = (companyName || 'CV').replace(/[^a-zA-Z0-9]+/g, '_');
  const filename = `${safeName}_${safeCompany}_CV.pdf`;
  doc.save(filename);
  return filename;
}

export function buildCvPdfBase64(cv) {
  const doc = createCvDoc(cv);
  const dataUri = doc.output('datauristring');
  return dataUri.split(',')[1];
}

export function downloadCvTxt(cv, companyName = 'Tailored', plainText) {
  const safeName = (cv.fullName || 'Resume').replace(/[^a-zA-Z0-9]+/g, '_');
  const safeCompany = (companyName || 'CV').replace(/[^a-zA-Z0-9]+/g, '_');
  const filename = `${safeName}_${safeCompany}_CV.txt`;
  const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return filename;
}
