import React, { useState } from 'react';

const ConfigPanel = ({ config, setConfig }) => {
  const [whatsappNumber, setWhatsappNumber] = useState(config.whatsappNumber);
  const [checkInterval, setCheckInterval] = useState(config.checkInterval);

  const handleSave = () => {
    setConfig({ whatsappNumber, checkInterval });
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6 border border-white/20">
      <h2 className="text-xl font-semibold mb-4">Configuration</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-300 mb-2">WhatsApp Number</label>
          <input
            type="tel"
            placeholder="+1234567890"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-purple-400"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-2">Check Interval (seconds)</label>
          <input
            type="number"
            value={checkInterval}
            onChange={(e) => setCheckInterval(parseInt(e.target.value) || 60)}
            className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-400"
          />
        </div>
      </div>
      <button
        onClick={handleSave}
        className="mt-4 w-full py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:from-blue-600 hover:to-purple-600"
      >
        Save Configuration
      </button>
    </div>
  );
};

export default ConfigPanel;