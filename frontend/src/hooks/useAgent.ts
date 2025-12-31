import { useState, useEffect } from 'react';
import { fetchEmails, processEmail } from '../services/api';

const useAgent = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ invoices: 0, jobOffers: 0, spam: 0, processed: 0 });

  const addLog = (message, type = 'info') => {
    setLogs(prev => [...prev, { message, type, timestamp: new Date().toLocaleTimeString() }].slice(-50));
  };

  const startAgent = async () => {
    setIsRunning(true);
    addLog('🚀 Agent started', 'success');
    await processEmails();
  };

  const stopAgent = () => {
    setIsRunning(false);
    addLog('⏹️ Agent stopped', 'info');
  };

  const processEmails = async () => {
    while (isRunning) {
      const emails = await fetchEmails();
      for (const email of emails) {
        addLog(`📧 Processing: ${email.subject}`);
        const analysis = await processEmail(email);
        if (analysis && analysis.confidence > 0.7) {
          switch (analysis.category) {
            case 'INVOICE':
              // Handle invoice
              setStats(prev => ({ ...prev, invoices: prev.invoices + 1 }));
              break;
            case 'JOB_OFFER':
              // Handle job offer
              setStats(prev => ({ ...prev, jobOffers: prev.jobOffers + 1 }));
              break;
            case 'SPAM':
              // Handle spam
              setStats(prev => ({ ...prev, spam: prev.spam + 1 }));
              break;
          }
          setStats(prev => ({ ...prev, processed: prev.processed + 1 }));
        } else {
          addLog(`⚠️ Low confidence classification: ${email.subject}`, 'warning');
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      await new Promise(resolve => setTimeout(resolve, 60000)); // Check every minute
    }
  };

  useEffect(() => {
    return () => {
      if (isRunning) {
        stopAgent();
      }
    };
  }, [isRunning]);

  return {
    isRunning,
    logs,
    stats,
    startAgent,
    stopAgent,
  };
};

export default useAgent;