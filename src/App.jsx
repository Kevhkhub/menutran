import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Utensils, Loader2, AlertCircle, RefreshCw, ChevronRight, History, CreditCard, X, ChevronLeft, Copy, Check, ShoppingCart, Settings, Trash2 } from 'lucide-react';

// --- Configuration ---
// 優化環境變量讀取方式，確保在不同編譯環境下的兼容性
const getApiKey = () => {
  try {
    // 優先讀取 Vite 的環境變量
    return import.meta.env.VITE_GEMINI_API_KEY || "";
  } catch (e) {
    // 如果環境不支援 import.meta，則回傳空字串
    return "";
  }
};

const apiKey = getApiKey(); 
const MODEL_NAME = "gemini-2.5-flash-preview-09-2025";
const APP_NAME = "你真識食";
const VERSION = "v1.4.2"; // 修復編譯錯誤後的版本
const AUTHOR = "Kevin";

// --- Helpers ---
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const callGeminiVision = async (base64Image) => {
  if (!apiKey) {
    throw new Error("找不到 API Key，請在 GitHub Secrets 或設定中配置 VITE_GEMINI_API_KEY");
  }

  for (let i = 0; i < 5; i++) {
    try {
      if (i > 0) await sleep(Math.pow(2, i) * 1000);
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "你是一位專業翻譯家。請辨識圖片中的菜單。以 JSON 回傳一個物件，包含 'items' 陣列。每個項目包含：'original' (原名), 'translated' (港式繁中名), 'price' (純數字), 'currency' (貨幣代碼如 JPY, KRW, THB), 'description' (成分), 'language' (ja, ko, th)。注意：一定要用香港廣東話風格（如：三文魚、吞拿魚、炸雞、走青）。若有套餐，請列出內容。" },
              { inlineData: { mimeType: "image/png", data: base64Image } }
            ]
          }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      
      if (!response.ok) throw new Error(`API 請求失敗: ${response.status}`);
      
      const data = await response.json();
      const content = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text);
      return content.items || [];
    } catch (e) { 
      if (i === 4) throw e; 
    }
  }
};

export default function App() {
  const [view, setView] = useState('home'); 
  const [history, setHistory] = useState([]);
  const [currentSession, setCurrentSession] = useState([]); 
  const [activePage, setActivePage] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedItems, setSelectedItems] = useState([]); 
  const [error, setError] = useState(null);
  const [rates, setRates] = useState({ JPY: 0.052, KRW: 0.0058, THB: 0.22 });
  const [copied, setCopied] = useState(false);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('you_eat_well_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    
    const savedRates = localStorage.getItem('you_eat_well_rates');
    if (savedRates) setRates(JSON.parse(savedRates));
  }, []);

  const saveToHistory = (newSession) => {
    const updated = [{ 
      id: Date.now(), 
      timestamp: new Date().toLocaleString(), 
      data: newSession 
    }, ...history].slice(0, 15);
    setHistory(updated);
    localStorage.setItem('you_eat_well_history', JSON.stringify(updated));
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setView('processing');
    setLoadingProgress(0);
    setError(null);
    const sessionData = [];

    try {
      for (let i = 0; i < files.length; i++) {
        setLoadingProgress(Math.round(((i) / files.length) * 100));
        const file = files[i];
        const base64 = await new Promise((res) => {
          const reader = new FileReader();
          reader.onload = (re) => res(re.target.result);
          reader.readAsDataURL(file);
        });

        const results = await callGeminiVision(base64.split(',')[1]);
        sessionData.push({ image: base64, results });
      }
      
      setCurrentSession(sessionData);
      saveToHistory(sessionData);
      setActivePage(0);
      setView('result');
    } catch (err) {
      setError(err.message || "處理失敗，請檢查 API Key 或網絡。");
      setView('home');
    }
  };

  const toggleSelectItem = (item) => {
    const exists = selectedItems.find(i => i.original === item.original && i.translated === item.translated);
    if (exists) {
      setSelectedItems(selectedItems.filter(i => !(i.original === item.original && i.translated === item.translated)));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const convertPrice = (price, currency) => {
    const p = parseFloat(price);
    if (isNaN(p)) return null;
    const rate = rates[currency?.toUpperCase()] || 1;
    return (p * rate).toFixed(1);
  };

  const copyResults = () => {
    const text = currentSession[activePage].results.map(i => 
      `🍽️ ${i.translated} (${i.original})\n💰 ${i.currency} ${i.price} (約HKD $${convertPrice(i.price, i.currency)})`
    ).join('\n\n');
    
    const contentToCopy = `【${APP_NAME}】菜單翻譯分享：\n\n${text}`;
    const dummy = document.createElement("textarea");
    document.body.appendChild(dummy);
    dummy.value = contentToCopy;
    dummy.select();
    document.execCommand("copy");
    document.body.removeChild(dummy);
    
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('you_eat_well_history');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* 標頭 */}
      <header className="bg-white border-b px-4 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
          <div className="bg-blue-600 p-2 rounded-xl shadow-blue-100 shadow-lg">
            <Utensils className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-none tracking-tight">{APP_NAME}</h1>
            <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">港人出埠必備</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView('history')} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
            <History size={22} />
          </button>
          <button onClick={() => setView('settings')} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
            <Settings size={22} />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full p-4 relative">
        {view === 'home' && (
          <div className="space-y-6 mt-4 animate-in fade-in duration-500">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 text-white shadow-xl shadow-blue-200">
              <h2 className="text-2xl font-bold mb-2">睇唔明餐牌？</h2>
              <p className="opacity-90 mb-8 text-sm leading-relaxed">一次過影幾張相，我幫你轉做地道香港話，仲識自動計埋港幣添！</p>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-white text-blue-700 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg"
              >
                <Camera size={26} /> 立即拍照 / 揀相
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" multiple className="hidden" />
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <CreditCard size={18} className="text-blue-600" />
                  港幣匯率參考
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-2 font-mono text-center">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                   <p className="text-[10px] text-slate-400 font-bold">100 JPY</p>
                   <p className="text-sm font-bold text-blue-700">${(rates.JPY * 100).toFixed(1)}</p>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                   <p className="text-[10px] text-slate-400 font-bold">1000 KRW</p>
                   <p className="text-sm font-bold text-indigo-700">${(rates.KRW * 1000).toFixed(1)}</p>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                   <p className="text-[10px] text-slate-400 font-bold">100 THB</p>
                   <p className="text-sm font-bold text-cyan-700">${(rates.THB * 100).toFixed(1)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'processing' && (
          <div className="flex flex-col items-center justify-center py-24 space-y-6">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Utensils className="text-blue-600" size={32} />
              </div>
            </div>
            <div className="text-center">
              <p className="font-bold text-xl mb-1">正在大快朵頤... {loadingProgress}%</p>
              <p className="text-slate-400 text-sm">正在幫你翻譯緊地道菜名</p>
            </div>
          </div>
        )}

        {view === 'result' && (
          <div className="space-y-4 pb-24">
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {currentSession.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActivePage(i)}
                  className={`px-6 py-2 rounded-full text-xs font-bold shrink-0 transition-all ${activePage === i ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-400 border'}`}
                >
                  菜單 {i + 1}
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center px-1">
              <button onClick={() => setView('home')} className="text-slate-400 text-sm flex items-center gap-1">
                <ChevronLeft size={16} /> 返回
              </button>
              <button onClick={copyResults} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold shadow-sm transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-white'}`}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? '已複製' : 'WhatsApp 分享'}
              </button>
            </div>

            <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-lg">
               <div className="h-40">
                 <img src={currentSession[activePage].image} className="w-full h-full object-cover" />
               </div>
               <div className="divide-y divide-slate-50">
                 {currentSession[activePage].results.map((item, i) => {
                   const isSelected = selectedItems.some(si => si.original === item.original);
                   return (
                    <div 
                      key={i} 
                      onClick={() => toggleSelectItem(item)}
                      className={`p-4 flex items-start gap-3 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/70' : 'bg-white active:bg-slate-50'}`}
                    >
                      <div className={`mt-1 shrink-0 w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}>
                        {isSelected && <Check size={14} strokeWidth={4} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] text-slate-400 font-mono">{item.original}</p>
                            <h4 className="font-bold text-slate-900 text-lg leading-tight">{item.translated}</h4>
                          </div>
                          {item.price && (
                            <div className="text-right">
                              <p className="text-sm font-bold text-slate-800">{item.currency} {item.price}</p>
                              <p className="text-[10px] text-blue-600 font-black">≈ HKD ${convertPrice(item.price, item.currency)}</p>
                            </div>
                          )}
                        </div>
                        {item.description && <p className="text-[11px] text-slate-500 mt-1 leading-snug">{item.description}</p>}
                      </div>
                    </div>
                   );
                 })}
               </div>
            </div>
          </div>
        )}

        {view === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <History className="text-blue-600" /> 過往食記
              </h2>
              {history.length > 0 && <button onClick={clearHistory} className="text-xs text-red-500">清除紀錄</button>}
            </div>
            {history.length === 0 ? (
              <div className="text-center py-20 text-slate-300">暫無翻譯紀錄</div>
            ) : (
              <div className="space-y-3 pb-20">
                {history.map((h) => (
                  <div key={h.id} className="bg-white p-4 rounded-2xl border border-slate-100" onClick={() => {
                    setCurrentSession(h.data);
                    setView('result');
                  }}>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-bold text-slate-400">{h.timestamp}</span>
                      <span className="text-[10px] text-blue-600 font-bold">{h.data.length} 張菜單</span>
                    </div>
                    <div className="flex gap-2">
                      {h.data.slice(0, 3).map((d, idx) => (
                        <img key={idx} src={d.image} className="w-12 h-12 object-cover rounded-lg" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'order' && (
          <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-xl">點餐展示</h2>
              <button onClick={() => setView('result')}><X /></button>
            </div>
            <div className="bg-blue-600 p-6 rounded-3xl text-center text-white">
              <p className="text-base font-bold">請展示給職員看</p>
              <p className="text-[10px] opacity-80 uppercase font-black">Order for Staff</p>
            </div>
            <div className="space-y-8 px-2">
              {selectedItems.map((item, i) => (
                <div key={i} className="border-b-4 border-blue-50 pb-6">
                  <p className="text-4xl font-black text-slate-900 mb-2">{item.original}</p>
                  <div className="flex justify-between items-end">
                    <p className="text-xl font-bold text-blue-600">{item.translated}</p>
                    <p className="text-2xl font-mono font-black">{item.currency} {item.price}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setView('result')} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl">返回</button>
          </div>
        )}

        {view === 'settings' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="text-blue-600" />
              <h2 className="font-bold text-xl">匯率設定</h2>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-6 shadow-lg">
              <div>
                <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase">1 JPY = ? HKD</label>
                <input 
                  type="number" 
                  step="0.0001"
                  value={rates.JPY} 
                  onChange={(e) => setRates({...rates, JPY: parseFloat(e.target.value) || 0})}
                  className="w-full bg-slate-50 border rounded-2xl px-5 py-4 font-mono font-bold text-xl"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase">1 KRW = ? HKD</label>
                <input 
                  type="number" 
                  step="0.0001"
                  value={rates.KRW} 
                  onChange={(e) => setRates({...rates, KRW: parseFloat(e.target.value) || 0})}
                  className="w-full bg-slate-50 border rounded-2xl px-5 py-4 font-mono font-bold text-xl"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase">1 THB = ? HKD</label>
                <input 
                  type="number" 
                  step="0.001"
                  value={rates.THB} 
                  onChange={(e) => setRates({...rates, THB: parseFloat(e.target.value) || 0})}
                  className="w-full bg-slate-50 border rounded-2xl px-5 py-4 font-mono font-bold text-xl"
                />
              </div>
              <button onClick={() => { localStorage.setItem('you_eat_well_rates', JSON.stringify(rates)); setView('home'); }} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg">儲存並返回</button>
            </div>
          </div>
        )}
      </main>

      {/* 懸浮點餐按鈕 */}
      {selectedItems.length > 0 && view !== 'order' && (
        <div className="fixed bottom-24 right-4 z-40">
          <button 
            onClick={() => setView('order')}
            className="bg-blue-600 text-white px-6 py-5 rounded-3xl shadow-2xl flex items-center gap-4 animate-bounce"
          >
            <ShoppingCart size={24} />
            <div className="text-left">
              <p className="font-black text-sm">向職員點餐 ({selectedItems.length})</p>
            </div>
          </button>
        </div>
      )}

      {/* 底部導覽 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 border-t px-8 py-4 flex justify-around z-30">
        <button onClick={() => setView('home')} className={`flex flex-col items-center ${view === 'home' ? 'text-blue-600' : 'text-slate-300'}`}><Camera size={24} /><span className="text-[10px] font-bold">掃描</span></button>
        <button onClick={() => setView('history')} className={`flex flex-col items-center ${view === 'history' ? 'text-blue-600' : 'text-slate-300'}`}><History size={24} /><span className="text-[10px] font-bold">歷史</span></button>
        <button onClick={() => setView('settings')} className={`flex flex-col items-center ${view === 'settings' ? 'text-blue-600' : 'text-slate-300'}`}><CreditCard size={24} /><span className="text-[10px] font-bold">匯率</span></button>
      </nav>

      {/* 頁腳 */}
      <footer className="bg-slate-50 pt-8 pb-24 text-center">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{APP_NAME}</p>
        <p className="text-[10px] text-slate-400 font-bold mt-1">Version {VERSION} | Author: <span className="text-blue-600">{AUTHOR}</span></p>
      </footer>

      {/* 全域樣式修正（替代 index.css 以確保在預覽環境運行） */}
      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
