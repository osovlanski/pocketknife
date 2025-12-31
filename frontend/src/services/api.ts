import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

export const fetchEmails = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/agent/emails`);
    return response.data;
  } catch (error: any) {
    throw new Error('Error fetching emails: ' + (error?.message || 'Unknown error'));
  }
};

export const classifyEmail = async (email: any) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/agent/classify`, { email });
    return response.data;
  } catch (error: any) {
    throw new Error('Error classifying email: ' + (error?.message || 'Unknown error'));
  }
};

export const processEmail = async (email: any) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/agent/process`, { email });
    return response.data;
  } catch (error: any) {
    throw new Error('Error processing email: ' + (error?.message || 'Unknown error'));
  }
};

export const processAllEmails = async () => {
  try {
    const response = await axios.post(`${API_BASE_URL}/agent/process-all`);
    return response.data;
  } catch (error: any) {
    throw new Error('Error processing all emails: ' + (error?.message || 'Unknown error'));
  }
};

export const getInvoices = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/agent/invoices`);
    return response.data;
  } catch (error: any) {
    throw new Error('Error fetching invoices: ' + (error?.message || 'Unknown error'));
  }
};

export const testNotification = async () => {
  try {
    const response = await axios.post(`${API_BASE_URL}/agent/test-notification`);
    return response.data;
  } catch (error: any) {
    throw new Error('Error testing notification: ' + (error?.message || 'Unknown error'));
  }
};

// Scheduler API functions
export const getSchedulerStatus = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/agent/scheduler/status`);
    return response.data;
  } catch (error: any) {
    throw new Error('Error getting scheduler status: ' + (error?.message || 'Unknown error'));
  }
};

export const startScheduler = async (cronExpression?: string) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/agent/scheduler/start`, { cronExpression });
    return response.data;
  } catch (error: any) {
    throw new Error('Error starting scheduler: ' + (error?.message || 'Unknown error'));
  }
};

export const stopScheduler = async () => {
  try {
    const response = await axios.post(`${API_BASE_URL}/agent/scheduler/stop`);
    return response.data;
  } catch (error: any) {
    throw new Error('Error stopping scheduler: ' + (error?.message || 'Unknown error'));
  }
};

export const updateSchedule = async (cronExpression: string) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/agent/scheduler/update`, { cronExpression });
    return response.data;
  } catch (error: any) {
    throw new Error('Error updating schedule: ' + (error?.message || 'Unknown error'));
  }
};