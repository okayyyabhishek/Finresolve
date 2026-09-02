import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Loader2, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { GlassCard } from './GlassCard';
import { api } from '../../api/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: string[];
}

interface ControllerCopilotProps {
  activeExceptionId?: string | null;
  activeBatchId?: string | null;
}

function formatMathNotation(text: string): string {
  return text
    .replace(/\$([^$\n]+)\$/g, (_, inner) => {
      return inner
        .replace(/\\ge\b/g, '≥')
        .replace(/\\le\b/g, '≤')
        .replace(/\\tau\b/g, 'τ')
        .replace(/\\times\b/g, '×')
        .replace(/\\pm\b/g, '±')
        .trim();
    })
    .replace(/\\ge\b/g, '≥')
    .replace(/\\le\b/g, '≤')
    .replace(/\\tau\b/g, 'τ');
}

export const ControllerCopilot: React.FC<ControllerCopilotProps> = ({
  activeExceptionId,
  activeBatchId
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `👋 **Hello! I'm your FINRESOLVE AI Settlement Copilot.**

I can explain root causes of settlement exceptions, verify fee and GST deductions, breakdown discrepancy evidence, and walk you through Policy Gate automated decisions.

How can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const quickPrompts = [
    activeExceptionId
      ? `Why was ${activeExceptionId} escalated / auto-resolved?`
      : 'Why do duplicate settlements require human escalation?',
    'What is the formula for expected net settlement & GST?',
    'Explain the 6 deterministic Policy Gate criteria',
    'How does the 21-point Coverage-Risk curve evaluate financial exposure?'
  ];

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const res = await api.sendChatMessage({
        message: text,
        exceptionId: activeExceptionId || undefined,
        batchId: activeBatchId || undefined,
        history: messages.map((m) => ({ role: m.role, content: m.content }))
      });

      const assistantMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: res.response,
        sources: res.sources,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: `⚠️ Sorry, I encountered an issue retrieving the response: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Sleek Compact Floating Orb Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 md:bottom-5 right-4 sm:right-5 z-40 flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-xl shadow-indigo-500/40 border border-indigo-300/40 transition-all hover:scale-110 active:scale-95 group"
          title="Open AI Settlement Copilot"
          aria-label="Open AI Copilot"
        >
          <div className="relative flex items-center justify-center">
            <Bot size={22} className="group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-indigo-950" />
          </div>
        </button>
      )}

      {/* Slide-in Copilot Drawer / Bottom Sheet */}
      {isOpen && (
        <div
          className={`fixed bottom-20 md:bottom-5 right-2 sm:right-5 z-50 transition-all duration-300 ${
            isExpanded ? 'w-[680px] h-[720px]' : 'w-[calc(100vw-16px)] sm:w-[400px] h-[520px] sm:h-[560px]'
          } max-w-[calc(100vw-16px)] sm:max-w-[calc(100vw-32px)] max-h-[calc(100vh-100px)] sm:max-h-[calc(100vh-32px)]`}
        >
          <div className="h-full flex flex-col p-0 bg-white/95 dark:bg-[#0e0e18]/95 backdrop-blur-2xl border border-slate-200 dark:border-indigo-500/30 shadow-2xl overflow-hidden rounded-2xl">
            {/* Header */}
            <div className="p-3.5 px-4 bg-gradient-to-r from-indigo-900/60 to-slate-900/80 dark:from-indigo-950/80 dark:to-[#0a0a0f] border-b border-slate-200 dark:border-indigo-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400">
                  <Bot size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold font-sans text-white">AI Settlement Copilot</h3>
                    <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                      ONLINE
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-200/70 font-mono">Gemini 2.5 Controller Assistant</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMessages([messages[0]])}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
                  title="Clear conversation"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
                  title={isExpanded ? 'Minimize' : 'Expand'}
                >
                  {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Active Context Banner */}
            {activeExceptionId && (
              <div className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-200 dark:border-indigo-500/20 flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-600 dark:text-slate-400">Context:</span>
                <span className="text-indigo-600 dark:text-indigo-300 font-bold">Selected {activeExceptionId}</span>
              </div>
            )}

            {/* Messages Scroll Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-none shadow-md'
                        : 'bg-slate-100 dark:bg-[#1a1a2e]/90 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-indigo-500/20 rounded-bl-none'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                          strong: ({ children }) => (
                            <strong className="font-bold text-slate-900 dark:text-white">
                              {children}
                            </strong>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc list-inside ml-1 space-y-0.5">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal list-inside ml-1 space-y-0.5">{children}</ol>
                          ),
                          code: ({ children }) => (
                            <code className="px-1 py-0.5 bg-slate-200 dark:bg-indigo-950 rounded text-[11px] font-mono">
                              {children}
                            </code>
                          )
                        }}
                      >
                        {formatMathNotation(msg.content)}
                      </ReactMarkdown>
                    ) : (
                      msg.content
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono mt-1 px-1">{msg.timestamp}</span>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-[#1a1a2e]/90 border border-slate-200 dark:border-indigo-500/20 rounded-2xl text-xs text-indigo-600 dark:text-indigo-300 w-fit">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Analyzing settlement ledgers & policy rules...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts Suggestions (F-17 font-size fix) */}
            <div className="px-3 py-2 bg-slate-50 dark:bg-black/20 border-t border-slate-200 dark:border-indigo-500/10 flex gap-1.5 overflow-x-auto no-scrollbar">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  disabled={isLoading}
                  className="whitespace-nowrap text-[11px] font-medium px-2.5 py-1 rounded-full bg-white dark:bg-indigo-950/40 hover:bg-indigo-50 dark:hover:bg-indigo-900/60 border border-slate-200 dark:border-indigo-500/30 text-slate-700 dark:text-indigo-300 transition-colors flex-shrink-0"
                >
                  ✨ {prompt}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-white dark:bg-[#0e0e18] border-t border-slate-200 dark:border-indigo-500/20 flex items-center gap-2">
              <input
                id="copilot-chat-input"
                name="copilotChatInput"
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about exceptions, GST, fees, or policy rules..."
                aria-label="Ask Settlement Copilot AI"
                autoComplete="off"
                className="flex-1 px-3.5 py-2 text-xs bg-slate-100 dark:bg-[#0a0a0f] border border-slate-300 dark:border-indigo-500/30 rounded-xl text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors font-sans"
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputMessage.trim() || isLoading}
                className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-all shadow-md shadow-indigo-500/30"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
