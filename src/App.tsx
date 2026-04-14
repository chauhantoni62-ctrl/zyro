/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Mic, 
  Terminal, 
  Cpu, 
  Settings, 
  User, 
  Bot, 
  Code, 
  Zap, 
  Power,
  Volume2,
  VolumeX,
  Command
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatWithToni } from '@/src/lib/gemini';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Welcome back, Toni. Zyro systems are online and ready for your command. How can I assist you today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [activeMode, setActiveMode] = useState('Smart');
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Memory System: Load preferences
  useEffect(() => {
    const savedPrefs = localStorage.getItem('toni_assistant_prefs');
    if (savedPrefs) {
      const prefs = JSON.parse(savedPrefs);
      setIsMuted(prefs.isMuted ?? false);
      setIsLocalMode(prefs.isLocalMode ?? false);
    }
  }, []);

  // Memory System: Save preferences
  useEffect(() => {
    localStorage.setItem('toni_assistant_prefs', JSON.stringify({ isMuted, isLocalMode }));
  }, [isMuted, isLocalMode]);

  // Text-to-Speech (Jarvis Voice)
  const speak = (text: string) => {
    if (isMuted) return;
    
    // Clean markdown for speech
    const cleanText = text.replace(/[*_#`]/g, '').replace(/\[.*?\]\(.*?\)/g, '');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    
    // Try to find a "Jarvis-like" voice (usually a deep male voice)
    const jarvisVoice = voices.find(v => 
      v.name.includes('Google UK English Male') || 
      v.name.includes('Daniel') || 
      v.name.includes('Male')
    );
    
    if (jarvisVoice) utterance.voice = jarvisVoice;
    utterance.pitch = 0.9; // Slightly deeper
    utterance.rate = 1.0;
    
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Auto-detect mode
    const lowerInput = input.toLowerCase();
    if (lowerInput.includes('code') || lowerInput.includes('write a program')) setActiveMode('Code');
    else if (lowerInput.includes('explain') || lowerInput.includes('what is')) setActiveMode('Explain');
    else if (lowerInput.includes('quick') || lowerInput.includes('short')) setActiveMode('Quick');
    else if (lowerInput.includes('open') || lowerInput.includes('search')) setActiveMode('Automation');
    else setActiveMode('Smart');

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    let response = "";
    if (isLocalMode) {
      // Simulated Local LLM Response
      await new Promise(r => setTimeout(r, 800));
      response = "I am currently operating in Local Mode (Offline). My processing power is limited, but I can still assist with basic tasks. For complex reasoning, please reconnect to my Neural Cloud.";
    } else {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      history.push({ role: 'user', parts: [{ text: input }] });
      response = await chatWithToni(history);
    }

    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: response,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, botMessage]);
    setIsLoading(false);
    
    // Jarvis speaks
    speak(response);
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      console.warn("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-cyan-500/30">
        {/* Background Effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
        </div>

        <div className="relative max-w-5xl mx-auto h-screen flex flex-col p-4 md:p-6 gap-6">
          {/* Header */}
          <header className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="relative">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center"
                >
                  <Cpu className="w-6 h-6 text-cyan-400" />
                </motion.div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#050505] animate-pulse" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-white">Zyro</h1>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn(
                    "text-[10px] py-0 px-1.5 h-4 bg-cyan-500/5 border-cyan-500/20 text-cyan-400",
                    isLocalMode && "border-amber-500/20 text-amber-400 bg-amber-500/5"
                  )}>
                    {isLocalMode ? 'LOCAL MODE' : 'SYSTEMS OPTIMAL'}
                  </Badge>
                  <span className="text-[10px] text-slate-500 font-mono">v3.0.0</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => setIsLocalMode(!isLocalMode)}
                      className={cn(
                        "text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10",
                        isLocalMode && "text-amber-400 bg-amber-500/10"
                      )}
                    >
                      <Terminal className="w-5 h-5" />
                    </Button>
                  }
                />
                <TooltipContent>{isLocalMode ? 'Switch to Cloud LLM' : 'Switch to Local LLM'}</TooltipContent>
              </Tooltip>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  if (isMuted) {
                    setIsMuted(false);
                    speak("Zyro voice synthesis activated, Toni.");
                  } else {
                    setIsMuted(true);
                    window.speechSynthesis.cancel();
                  }
                }}
                className="text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </Button>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10">
                <Settings className="w-5 h-5" />
              </Button>
              <div className="h-8 w-[1px] bg-slate-800 mx-2" />
              <Button variant="outline" className="border-slate-800 bg-slate-900/50 text-slate-300 hover:bg-slate-800">
                <Power className="w-4 h-4 mr-2 text-red-500" />
                Disconnect
              </Button>
            </div>
          </header>

          {/* Main Content Area */}
          <div className="flex-1 flex gap-6 overflow-hidden">
            {/* Sidebar - System Status */}
            <aside className="hidden lg:flex flex-col gap-4 w-64">
              <Card className="bg-slate-900/40 border-slate-800/50 backdrop-blur-xl p-4 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Core Status</span>
                  <Zap className="w-3 h-3 text-yellow-500" />
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500 uppercase">
                      <span>Neural Load</span>
                      <span>{isLoading ? '88%' : '24%'}</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-cyan-500"
                        initial={{ width: 0 }}
                        animate={{ width: isLoading ? '88%' : '24%' }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500 uppercase">
                      <span>Memory Sync</span>
                      <span>98%</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-blue-500"
                        initial={{ width: 0 }}
                        animate={{ width: '98%' }}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="bg-slate-900/40 border-slate-800/50 backdrop-blur-xl p-4 flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Active Modules</span>
                </div>
                <div className="space-y-2">
                  {[
                    { name: 'Code Interpreter', icon: Code, active: true },
                    { name: 'Web Automation', icon: Command, active: true },
                    { name: 'System Control', icon: Zap, active: true },
                    { name: 'Voice Synthesis', icon: Volume2, active: !isMuted },
                  ].map((module) => (
                    <div key={module.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30 border border-slate-800/50">
                      <div className="flex items-center gap-2">
                        <module.icon className={cn("w-3.5 h-3.5", module.active ? "text-cyan-400" : "text-slate-600")} />
                        <span className={cn("text-xs", module.active ? "text-slate-300" : "text-slate-600")}>{module.name}</span>
                      </div>
                      <div className={cn("w-1.5 h-1.5 rounded-full", module.active ? "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" : "bg-slate-700")} />
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 pt-6 border-t border-slate-800/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Bot className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Active Mode</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['Smart', 'Code', 'Explain', 'Quick', 'Automation'].map((mode) => (
                      <Badge 
                        key={mode} 
                        variant={activeMode === mode ? 'default' : 'outline'}
                        className={cn(
                          "text-[10px] cursor-pointer transition-all",
                          activeMode === mode 
                            ? "bg-cyan-600 text-white" 
                            : "bg-transparent text-slate-500 border-slate-800 hover:border-slate-600"
                        )}
                        onClick={() => setActiveMode(mode)}
                      >
                        {mode}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Card>
            </aside>

            {/* Chat Area */}
            <main className="flex-1 flex flex-col bg-slate-900/20 border border-slate-800/50 rounded-3xl overflow-hidden backdrop-blur-sm relative">
              <ScrollArea className="flex-1 p-4 md:p-6">
                <div className="space-y-6 pb-4" ref={scrollRef}>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex gap-3 max-w-[85%]",
                        message.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1",
                        message.role === 'user' ? "bg-blue-600" : "bg-cyan-500/20 border border-cyan-500/30"
                      )}>
                        {message.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-cyan-400" />}
                      </div>
                      <div className={cn(
                        "space-y-1",
                        message.role === 'user' ? "text-right" : "text-left"
                      )}>
                        <div className={cn(
                          "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                          message.role === 'user' 
                            ? "bg-blue-600 text-white rounded-tr-none" 
                            : "bg-slate-800/50 text-slate-200 border border-slate-700/50 rounded-tl-none"
                        )}>
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code({ node, inline, className, children, ...props }: any) {
                                const match = /language-(\w+)/.exec(className || '');
                                return !inline ? (
                                  <div className="relative group my-4">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                                    <pre className="relative bg-[#0d1117] p-4 rounded-lg overflow-x-auto border border-slate-800">
                                      <code className={cn("text-xs font-mono text-cyan-300", className)} {...props}>
                                        {children}
                                      </code>
                                    </pre>
                                  </div>
                                ) : (
                                  <code className="bg-slate-700/50 px-1.5 py-0.5 rounded text-cyan-300 font-mono text-xs" {...props}>
                                    {children}
                                  </code>
                                );
                              },
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                            }}
                          >
                            {message.text}
                          </ReactMarkdown>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono px-1">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-3 mr-auto"
                    >
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                        <Bot className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="bg-slate-800/50 border border-slate-700/50 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" />
                      </div>
                    </motion.div>
                  )}
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="p-4 md:p-6 bg-slate-900/60 border-t border-slate-800/50 backdrop-blur-xl">
                <div className="relative flex items-end gap-3">
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Enter command, Toni..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                      className="bg-slate-800/50 border-slate-700/50 text-slate-200 placeholder:text-slate-500 h-12 pr-12 rounded-xl focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500/50"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              type="button"
                              onClick={toggleListening}
                              className={cn(
                                "h-8 w-8 rounded-lg transition-all",
                                isListening ? "bg-red-500/20 text-red-400 animate-pulse" : "text-slate-500 hover:text-cyan-400"
                              )}
                            >
                              <Mic className="w-4 h-4" />
                            </Button>
                          }
                        />
                        <TooltipContent>Voice Command</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <Button 
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="h-12 w-12 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500 font-mono px-1">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">Enter</kbd> to send
                    </span>
                    <span className="flex items-center gap-1.5">
                      <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">Shift + Enter</kbd> for new line
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span>ENCRYPTED CHANNEL</span>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
