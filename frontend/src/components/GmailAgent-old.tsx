// import React, { useState, useEffect } from 'react';
// import { Mail, FileText, MessageSquare, Trash2, Play, Square, CheckCircle, AlertCircle } from 'lucide-react';
// import { processAllEmails, testNotification } from '../services/api';
// import InvoiceList from './InvoiceList';

// const GmailAgent = () => {
//   const [isRunning, setIsRunning] = useState(false);
//   const [logs, setLogs] = useState([]);
//   const [stats, setStats] = useState({ invoices: 0, jobOffers: 0, spam: 0, processed: 0 });
//   const [config, setConfig] = useState({
//     notificationMethod: 'email',
//     checkInterval: 60
//   });

//   const addLog = (message, type = 'info') => {
//     setLogs(prev => [...prev, { 
//       message, 
//       type, 
//       timestamp: new Date().toLocaleTimeString() 
//     }].slice(-50));
//   };

//   const handleProcessAll = async () => {
//     try {
//       setIsRunning(true);
//       addLog('🚀 Starting email processing...', 'success');
      
//       const result = await processAllEmails();
      
//       setStats({
//         processed: result.results.processed,
//         invoices: result.results.invoices,
//         jobOffers: result.results.jobOffers,
//         spam: result.results.spam
//       });
      
//       addLog(`✅ Processed ${result.results.processed} emails`, 'success');
//       addLog(`📄 Invoices: ${result.results.invoices}`, 'info');
//       addLog(`💼 Job Offers: ${result.results.jobOffers}`, 'info');
//       addLog(`🗑️ Spam: ${result.results.spam}`, 'info');
      
//       if (result.results.errors > 0) {
//         addLog(`⚠️ Errors: ${result.results.errors}`, 'warning');
//       }
//     } catch (error) {
//       addLog(`❌ Error: ${error.message}`, 'error');
//     } finally {
//       setIsRunning(false);
//     }
//   };

//   const handleTestNotification = async () => {
//     try {
//       addLog('📧 Testing notification...', 'info');
//       const result = await testNotification();
//       addLog(`✅ Test notification sent via ${result.method}`, 'success');
//     } catch (error) {
//       addLog(`❌ Test failed: ${error.message}`, 'error');
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
//       <div className="max-w-7xl mx-auto">
//         <div className="text-center mb-8">
//           <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
//             🤖 AI Gmail Processing Agent
//           </h1>
//           <p className="text-slate-300">Intelligent email classification and automation with Hebrew support</p>
//         </div>

//         {/* Configuration Panel */}
//         <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6 border border-white/20">
//           <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
//             <MessageSquare className="w-5 h-5" />
//             Configuration
//           </h2>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div>
//               <label className="block text-sm text-slate-300 mb-2">Notification Method</label>
//               <select
//                 value={config.notificationMethod}
//                 onChange={(e) => setConfig(prev => ({ ...prev, notificationMethod: e.target.value }))}
//                 className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-400"
//               >
//                 <option value="email">Email (FREE)</option>
//                 <option value="discord">Discord (FREE)</option>
//                 <option value="telegram">Telegram (FREE)</option>
//                 <option value="all">All Methods</option>
//                 <option value="whatsapp" disabled>WhatsApp (Coming Soon)</option>
//               </select>
//               <p className="text-xs text-slate-400 mt-1">Configure in backend .env file</p>
//             </div>
//             <div>
//               <label className="block text-sm text-slate-300 mb-2">Check Interval (seconds)</label>
//               <input
//                 type="number"
//                 min="30"
//                 value={config.checkInterval}
//                 onChange={(e) => setConfig(prev => ({ ...prev, checkInterval: parseInt(e.target.value) }))}
//                 className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-purple-400"
//               />
//             </div>
//           </div>
//         </div>
//               <label className="block text-sm text-slate-300 mb-2">Check Interval (seconds)</label>
//               <input
//                 type="number"
//                 value={config.checkInterval}
//                 onChange={(e) => setConfig(prev => ({ ...prev, checkInterval: parseInt(e.target.value) || 60 }))}
//                 className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-400"
//               />
//             </div>
//           </div>
//         </div>

//         <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6 border border-white/20">
//           <button
//             onClick={() => setIsRunning(!isRunning)}
//             className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
//               isRunning 
//                 ? 'bg-red-500 hover:bg-red-600' 
//                 : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
//             }`}
//           >
//             {isRunning ? (
//               <>
//                 <Square className="w-5 h-5" />
//                 Stop Agent
//               </>
//             ) : (
//               <>
//                 <Play className="w-5 h-5" />
//                 Start Agent
//               </>
//             )}
//           </button>
//         </div>

//         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
//           <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
//             <div className="flex items-center gap-2 text-blue-400 mb-2">
//               <Mail className="w-5 h-5" />
//               <span className="text-sm">Processed</span>
//             </div>
//             <div className="text-3xl font-bold">{stats.processed}</div>
//           </div>
//           <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
//             <div className="flex items-center gap-2 text-green-400 mb-2">
//               <FileText className="w-5 h-5" />
//               <span className="text-sm">Invoices</span>
//             </div>
//             <div className="text-3xl font-bold">{stats.invoices}</div>
//           </div>
//           <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
//             <div className="flex items-center gap-2 text-purple-400 mb-2">
//               <CheckCircle className="w-5 h-5" />
//               <span className="text-sm">Job Offers</span>
//             </div>
//             <div className="text-3xl font-bold">{stats.jobOffers}</div>
//           </div>
//           <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
//             <div className="flex items-center gap-2 text-red-400 mb-2">
//               <Trash2 className="w-5 h-5" />
//               <span className="text-sm">Spam</span>
//             </div>
//             <div className="text-3xl font-bold">{stats.spam}</div>
//           </div>
//         </div>

//         <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
//           <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
//             <AlertCircle className="w-5 h-5" />
//             Activity Log
//           </h2>
//           <div className="bg-black/20 rounded-lg p-4 h-64 overflow-y-auto space-y-2">
//             {logs.length === 0 ? (
//               <div className="text-slate-400 text-center py-8">
//                 No activity yet. Start the agent to begin processing emails.
//               </div>
//             ) : (
//               logs.map((log, idx) => (
//                 <div 
//                   key={idx}
//                   className={`text-sm font-mono ${
//                     log.type === 'error' ? 'text-red-400' :
//                     log.type === 'success' ? 'text-green-400' :
//                     log.type === 'warning' ? 'text-yellow-400' :
//                     'text-slate-300'
//                   }`}
//                 >
//                   <span className="text-slate-500">[{log.timestamp}]</span> {log.message}
//                 </div>
//               ))
//             )}
//           </div>
//         </div>

//         <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
//         {/* Stats Display */}
//         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
//           <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
//             <div className="flex items-center gap-2 text-blue-400 mb-2">
//               <CheckCircle className="w-5 h-5" />
//               <span className="text-sm">Processed</span>
//             </div>
//             <div className="text-3xl font-bold">{stats.processed}</div>
//           </div>
//           <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
//             <div className="flex items-center gap-2 text-green-400 mb-2">
//               <FileText className="w-5 h-5" />
//               <span className="text-sm">Invoices</span>
//             </div>
//             <div className="text-3xl font-bold">{stats.invoices}</div>
//           </div>
//           <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
//             <div className="flex items-center gap-2 text-purple-400 mb-2">
//               <Mail className="w-5 h-5" />
//               <span className="text-sm">Job Offers</span>
//             </div>
//             <div className="text-3xl font-bold">{stats.jobOffers}</div>
//           </div>
//           <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
//             <div className="flex items-center gap-2 text-red-400 mb-2">
//               <Trash2 className="w-5 h-5" />
//               <span className="text-sm">Spam</span>
//             </div>
//             <div className="text-3xl font-bold">{stats.spam}</div>
//           </div>
//         </div>

//         {/* Control Panel */}
//         <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6 border border-white/20">
//           <div className="flex items-center justify-between">
//             <h2 className="text-xl font-semibold">Control Panel</h2>
//             <div className="flex gap-3">
//               <button
//                 onClick={handleTestNotification}
//                 className="flex items-center gap-2 bg-yellow-500/20 hover:bg-yellow-500/30 px-4 py-2 rounded-lg transition-colors"
//               >
//                 <AlertCircle className="w-5 h-5" />
//                 Test Notification
//               </button>
//               <button
//                 onClick={handleProcessAll}
//                 disabled={isRunning}
//                 className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 px-6 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
//               >
//                 {isRunning ? (
//                   <>
//                     <Square className="w-5 h-5" />
//                     Processing...
//                   </>
//                 ) : (
//                   <>
//                     <Play className="w-5 h-5" />
//                     Process All Emails
//                   </>
//                 )}
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* Two Column Layout */}
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
//           {/* Activity Log */}
//           <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
//             <h2 className="text-xl font-semibold mb-4">Activity Log</h2>
//             <div className="space-y-2 max-h-96 overflow-y-auto">
//               {logs.length === 0 ? (
//                 <p className="text-slate-400 text-center py-8">No activity yet. Click "Process All Emails" to start.</p>
//               ) : (
//                 logs.map((log, index) => (
//                   <div
//                     key={index}
//                     className={`p-3 rounded-lg text-sm ${
//                       log.type === 'success' ? 'bg-green-500/20 text-green-200' :
//                       log.type === 'error' ? 'bg-red-500/20 text-red-200' :
//                       log.type === 'warning' ? 'bg-yellow-500/20 text-yellow-200' :
//                       'bg-blue-500/20 text-blue-200'
//                     }`}
//                   >
//                     <span className="text-slate-400 text-xs">[{log.timestamp}]</span> {log.message}
//                   </div>
//                 ))
//               )}
//             </div>
//           </div>

//           {/* Invoice List */}
//           <InvoiceList />
//         </div>

//         {/* Info Panel */}
//         <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
//           <h3 className="text-lg font-semibold mb-3 text-blue-300">ℹ️ Features</h3>
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-300">
//             <div>
//               <h4 className="font-semibold text-white mb-2">📄 Invoice Processing</h4>
//               <ul className="space-y-1 text-xs">
//                 <li>• Hebrew & English support</li>
//                 <li>• Keywords: ארנונה, חשמל, מים</li>
//                 <li>• Auto-save to Google Drive</li>
//                 <li>• View & download anytime</li>
//               </ul>
//             </div>
//             <div>
//               <h4 className="font-semibold text-white mb-2">💼 Job Offers</h4>
//               <ul className="space-y-1 text-xs">
//                 <li>• Instant notifications</li>
//                 <li>• Email, Discord, Telegram</li>
//                 <li>• WhatsApp coming soon</li>
//                 <li>• Never miss opportunities</li>
//               </ul>
//             </div>
//             <div>
//               <h4 className="font-semibold text-white mb-2">🗑️ Spam Filtering</h4>
//               <ul className="space-y-1 text-xs">
//                 <li>• AI-powered detection</li>
//                 <li>• Auto-move to folder</li>
//                 <li>• Keep inbox clean</li>
//                 <li>• Learns patterns</li>
//               </ul>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default GmailAgent;