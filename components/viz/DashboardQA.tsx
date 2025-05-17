import React from "react";
import { IDashboard, IDataset } from "../../types";
import styles from "../../styles/Components.module.scss";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export function DashboardQA(props: {
  data: IDataset;
  dashboard: IDashboard;
  onAskQuestion: (question: string) => Promise<string>;
  children?: React.ReactNode;
}) {
  const [question, setQuestion] = React.useState("");
  const [answer, setAnswer] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const dashboardRef = React.useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);
    try {
      const response = await props.onAskQuestion(question);
      setAnswer(response);
    } catch (error) {
      setAnswer("Sorry, I couldn't process your question. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!dashboardRef.current || !answer) return;
    
    setIsDownloading(true);
    try {
      // Wait for any chart animations to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // Add title
      pdf.setFontSize(20);
      pdf.text('Dashboard Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 20;

      // Add Q&A section
      pdf.setFontSize(14);
      pdf.text('Question & Answer', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      const questionLines = pdf.splitTextToSize(`Q: ${question}`, pageWidth - (2 * margin));
      pdf.text(questionLines, margin, yPosition);
      yPosition += (questionLines.length * 6) + 5;

      const answerLines = pdf.splitTextToSize(`A: ${answer}`, pageWidth - (2 * margin));
      pdf.text(answerLines, margin, yPosition);
      yPosition += (answerLines.length * 6) + 15;

      // Capture dashboard
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        windowWidth: dashboardRef.current.scrollWidth,
        windowHeight: dashboardRef.current.scrollHeight
      });

      // Add new page for dashboard
      pdf.addPage();

      // Add dashboard title
      pdf.setFontSize(16);
      pdf.text('Dashboard Visualization', margin, margin);

      // Calculate image dimensions
      const imgWidth = pageWidth - (2 * margin);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add the dashboard image
      pdf.addImage(
        canvas.toDataURL('image/jpeg', 1.0),
        'JPEG',
        margin,
        margin + 10,
        imgWidth,
        imgHeight,
        undefined,
        'FAST'
      );

      // Download PDF
      pdf.save('dashboard-report.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <div className={styles.qaContainer}>
        <form onSubmit={handleSubmit} className={styles.qaForm}>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about your data..."
            className={styles.qaInput}
            disabled={isLoading}
          />
          <button type="submit" className={styles.qaButton} disabled={isLoading}>
            {isLoading ? "Thinking..." : "Ask"}
          </button>
          {answer && (
            <button
              type="button"
              onClick={handleDownload}
              className={styles.qaButton}
              disabled={isDownloading}
            >
              {isDownloading ? "Generating PDF..." : "Download PDF"}
            </button>
          )}
        </form>
        {answer && (
          <div className={styles.qaAnswer}>
            <h4>Answer:</h4>
            <p>{answer}</p>
          </div>
        )}
      </div>
      <div ref={dashboardRef} className={styles.dashboardContent}>
        {props.children}
      </div>
    </>
  );
} 