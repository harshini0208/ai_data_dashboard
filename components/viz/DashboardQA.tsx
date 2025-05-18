import React from "react";
import { IDashboard, IDataset } from "../../types";
import styles from "../../styles/Components.module.scss";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ChatMessage {
  id: string;
  type: 'welcome' | 'user' | 'bot' | 'suggestion';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  structuredContent?: {
    summary?: string;
    points?: string[];
    conclusion?: string;
  };
}

// Helper function to generate context-aware suggestions based on previous conversation
const generateContextAwareSuggestions = (
  question: string,
  answer: string,
  dashboard: IDashboard
): string[] => {
  const suggestions: string[] = [];
  const lowerQuestion = question.toLowerCase();
  const lowerAnswer = answer.toLowerCase();

  // Add chart-specific follow-up questions
  dashboard.charts.forEach(chart => {
    const chartTitle = chart.title.toLowerCase();
    if (lowerQuestion.includes(chartTitle) || lowerAnswer.includes(chartTitle)) {
      suggestions.push(
        `Can you explain the trends in the ${chart.title}?`,
        `What factors influence the ${chart.title}?`,
        `How does ${chart.title} relate to other metrics?`
      );
    }
  });

  // Add KPI-specific follow-up questions
  dashboard.kpis.forEach(kpi => {
    const kpiTitle = kpi.title.toLowerCase();
    if (lowerQuestion.includes(kpiTitle) || lowerAnswer.includes(kpiTitle)) {
      suggestions.push(
        `What affects the ${kpi.title}?`,
        `How has ${kpi.title} changed over time?`,
        `What's the significance of the current ${kpi.title}?`
      );
    }
  });

  // Add general analysis suggestions based on the context
  if (lowerAnswer.includes("trend") || lowerAnswer.includes("increase") || lowerAnswer.includes("decrease")) {
    suggestions.push(
      "What's causing this trend?",
      "Is this trend expected to continue?",
      "How does this compare to industry standards?"
    );
  }

  if (lowerAnswer.includes("correlation") || lowerAnswer.includes("relationship")) {
    suggestions.push(
      "Are there other correlations to consider?",
      "What other factors might influence this relationship?",
      "Can you quantify this relationship?"
    );
  }

  // Add comparison suggestions
  if (lowerAnswer.includes("highest") || lowerAnswer.includes("lowest") || lowerAnswer.includes("average")) {
    suggestions.push(
      "What contributes to these values?",
      "How do these values compare historically?",
      "What actions could improve these metrics?"
    );
  }

  // Add data quality suggestions
  if (lowerAnswer.includes("missing") || lowerAnswer.includes("anomaly") || lowerAnswer.includes("outlier")) {
    suggestions.push(
      "How should we handle these data issues?",
      "Are there similar patterns elsewhere?",
      "What's the impact of these anomalies?"
    );
  }

  // If no specific suggestions were generated, add general follow-up questions
  if (suggestions.length === 0) {
    suggestions.push(
      "Can you provide more details about this?",
      "What other insights can you share?",
      "How does this impact the overall performance?"
    );
  }

  // Return unique suggestions, limited to 3
  return Array.from(new Set(suggestions)).slice(0, 3);
};

const formatBotResponse = (response: string): ChatMessage['structuredContent'] => {
  // Split response into sections if they exist
  const sections = response.split(/\n\n|\r\n\r\n/);
  
  let structured: ChatMessage['structuredContent'] = {
    points: []
  };

  // Process each section
  sections.forEach(section => {
    const trimmedSection = section.trim();
    
    // Skip empty sections
    if (!trimmedSection) return;

    // If section starts with bullet points or numbers
    if (trimmedSection.match(/^[•\-\*\d\.]|\n[•\-\*\d\.]/)) {
      // Split into individual points
      const points = trimmedSection
        .split(/\n/)
        .map(point => point.replace(/^[•\-\*\d\.]\s*/, '').trim())
        .filter(point => point.length > 0);
      structured.points?.push(...points);
    } else {
      // If it's the first non-bullet section, treat as summary
      if (!structured.summary) {
        structured.summary = trimmedSection;
      } else {
        // If we already have a summary, this is the conclusion
        structured.conclusion = trimmedSection;
      }
    }
  });

  return structured;
};

export function DashboardQA(props: {
  data: IDataset;
  dashboard: IDashboard;
  onAskQuestion: (question: string) => Promise<string>;
  children?: React.ReactNode;
}) {
  const [question, setQuestion] = React.useState("");
  const [chatHistory, setChatHistory] = React.useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const dashboardRef = React.useRef<HTMLDivElement>(null);
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Initial welcome message and suggestions
  React.useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      type: 'welcome',
      content: "👋 Hi! I'm your AI data assistant. I can help you analyze your data and answer questions about the dashboard. Here are some questions to get started:",
      timestamp: new Date(),
      suggestions: [
        ...props.dashboard.charts.slice(0, 2).map(chart => `Tell me about the ${chart.title}`),
        ...props.dashboard.kpis.slice(0, 2).map(kpi => `What does the ${kpi.title} indicate?`),
        "What are the main insights from this dashboard?"
      ].slice(0, 4)
    };
    setChatHistory([welcomeMessage]);
  }, [props.dashboard]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const handleSuggestionClick = (suggestion: string) => {
    setQuestion(suggestion);
    inputRef.current?.focus();
  };

  const enhanceQuestion = (userQuestion: string): string => {
    // Add context about the specific charts or KPIs mentioned
    const mentionedCharts = props.dashboard.charts
      .filter(chart => userQuestion.toLowerCase().includes(chart.title.toLowerCase()))
      .map(chart => `For the ${chart.title} chart, the data is visualized as a ${chart.chartType}.`);
    
    const mentionedKPIs = props.dashboard.kpis
      .filter(kpi => userQuestion.toLowerCase().includes(kpi.title.toLowerCase()))
      .map(kpi => `Regarding the ${kpi.title} KPI, please consider its current value and historical context.`);

    // Combine the original question with additional context
    const enhancedQuestion = [
      userQuestion,
      ...mentionedCharts,
      ...mentionedKPIs,
      "Please provide a structured answer with a clear summary, specific points, and a conclusion if applicable."
    ].join("\n\n");

    return enhancedQuestion;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    const currentQuestion = question;
    setQuestion("");
    setIsLoading(true);

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: currentQuestion,
      timestamp: new Date()
    };
    setChatHistory(prev => [...prev, userMessage]);

    try {
      // Enhance the question with context
      const enhancedQuestion = enhanceQuestion(currentQuestion);
      const response = await props.onAskQuestion(enhancedQuestion);
      const structuredContent = formatBotResponse(response);
      
      // Generate context-aware suggestions based on the question and answer
      const suggestions = generateContextAwareSuggestions(currentQuestion, response, props.dashboard);
      
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: response,
        timestamp: new Date(),
        structuredContent,
        suggestions
      };
      
      setChatHistory(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: "Sorry, I couldn't process your question. Please try asking in a different way.",
        timestamp: new Date(),
        suggestions: [
          "Try being more specific",
          "Ask about a particular chart or KPI",
          "Rephrase your question"
        ]
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!dashboardRef.current || chatHistory.length === 0) return;
    
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

      // Add chat history
      pdf.setFontSize(14);
      pdf.text('Conversation History', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      for (const message of chatHistory) {
        if (message.type === 'user' || message.type === 'bot') {
          const prefix = message.type === 'user' ? 'Q: ' : 'A: ';
          
          if (message.type === 'user') {
            const lines = pdf.splitTextToSize(`${prefix}${message.content}`, pageWidth - (2 * margin));
            pdf.text(lines, margin, yPosition);
            yPosition += (lines.length * 6) + 10;
          } else if (message.structuredContent) {
            // Add summary if exists
            if (message.structuredContent.summary) {
              const summaryLines = pdf.splitTextToSize(message.structuredContent.summary, pageWidth - (2 * margin));
              pdf.text(summaryLines, margin, yPosition);
              yPosition += (summaryLines.length * 6) + 5;
            }

            // Add points
            if (message.structuredContent.points && message.structuredContent.points.length > 0) {
              message.structuredContent.points.forEach((point, index) => {
                const bulletPoint = `• ${point}`;
                const pointLines = pdf.splitTextToSize(bulletPoint, pageWidth - (2 * margin) - 5);
                pdf.text(pointLines, margin + 5, yPosition);
                yPosition += (pointLines.length * 6) + 3;
              });
              yPosition += 5;
            }

            // Add conclusion if exists
            if (message.structuredContent.conclusion) {
              const conclusionLines = pdf.splitTextToSize(message.structuredContent.conclusion, pageWidth - (2 * margin));
              pdf.text(conclusionLines, margin, yPosition);
              yPosition += (conclusionLines.length * 6) + 10;
            }
          } else {
            const lines = pdf.splitTextToSize(`${prefix}${message.content}`, pageWidth - (2 * margin));
            pdf.text(lines, margin, yPosition);
            yPosition += (lines.length * 6) + 10;
          }

          if (yPosition > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          }
        }
      }

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
      <div className={styles.chatbotContainer}>
        <div className={styles.chatMessages}>
          {chatHistory.map((message) => (
            <div
              key={message.id}
              className={`${styles.messageItem} ${styles[message.type]}`}
            >
              <div className={styles.messageContent}>
                {message.type === 'welcome' && <div className={styles.welcomeIcon}>👋</div>}
                {message.type === 'bot' && message.structuredContent ? (
                  <div className={styles.structuredContent}>
                    {message.structuredContent.summary && (
                      <div className={styles.summary}>{message.structuredContent.summary}</div>
                    )}
                    {message.structuredContent.points && message.structuredContent.points.length > 0 && (
                      <ul className={styles.points}>
                        {message.structuredContent.points.map((point, index) => (
                          <li key={index}>{point}</li>
                        ))}
                      </ul>
                    )}
                    {message.structuredContent.conclusion && (
                      <div className={styles.conclusion}>{message.structuredContent.conclusion}</div>
                    )}
                  </div>
                ) : (
                  message.content
                )}
              </div>
              {message.suggestions && (
                <div className={styles.suggestions}>
                  {message.suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      className={styles.suggestionButton}
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
              <div className={styles.messageTime}>
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className={styles.chatInputContainer}>
          <form onSubmit={handleSubmit} className={styles.chatForm}>
            <input
              ref={inputRef}
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask me anything about your data..."
              className={styles.chatInput}
              disabled={isLoading}
            />
            <button type="submit" className={styles.chatButton} disabled={isLoading}>
              {isLoading ? "Thinking..." : "Ask"}
            </button>
            {chatHistory.length > 1 && (
              <button
                type="button"
                onClick={handleDownload}
                className={styles.chatButton}
                disabled={isDownloading}
              >
                {isDownloading ? "Generating..." : "Save PDF"}
              </button>
            )}
          </form>
        </div>
      </div>
      <div ref={dashboardRef} className={styles.dashboardContent}>
        {props.children}
      </div>
    </>
  );
} 