import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: number;
  text: string;
  isBot: boolean;
  timestamp: Date;
  showButton?: boolean;
  buttonUrl?: string;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showBootcampButton, setShowBootcampButton] = useState(false);
  const [bootcampButtonUrl, setBootcampButtonUrl] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50); // Small delay to ensure DOM is updated
  };

  // Focus input field
  const focusInput = () => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100); // Small delay to ensure the input is rendered
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

    // Additional effect to ensure initial scroll works
  useEffect(() => {
    if (messages.length === 1) {
      // For the first message, try multiple scroll attempts
      setTimeout(() => scrollToBottom(), 100);
      setTimeout(() => scrollToBottom(), 300);
      setTimeout(() => scrollToBottom(), 500);
    }
  }, [messages.length]);

  // Auto-start conversation when component mounts
  useEffect(() => {
    const initializeConversation = async () => {
      simulateTyping(async () => {
        try {
          const { data, error } = await supabase.functions.invoke('chat-with-bootcamp-assistant', {
            body: { messages: [] }
          });
          
          if (error) throw error;
          
          addMessage(data.message, true, data.showButton, data.buttonUrl);
        } catch (error) {
          console.error('Error starting conversation:', error);
          addMessage("Hi! I'm here to help you with your bootcamp application. What's your age?", true);
        }
      });
    };

    initializeConversation();
  }, []);

  const addMessage = (text: string, isBot: boolean, showButton?: boolean, buttonUrl?: string) => {
    const newMessage: Message = {
      id: Date.now(),
      text,
      isBot,
      timestamp: new Date(),
      showButton,
      buttonUrl
    };
    setMessages(prev => [...prev, newMessage]);
    
    if (showButton && buttonUrl) {
      setShowBootcampButton(true);
      setBootcampButtonUrl(buttonUrl);
    } else if (isBot) {
      // Focus input when bot asks a new question (but not when showing button)
      focusInput();
    }
  };

  const simulateTyping = (callback: () => void, delay = 1500) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      callback();
    }, delay);
  };

  const handleUserResponse = async () => {
    if (!userInput.trim()) return;

    // Add user response
    addMessage(userInput, false);
    const userMessage = userInput;
    setUserInput("");

    // Show typing indicator immediately
    setIsTyping(true);

    // Prepare conversation history for OpenAI
    const conversationHistory = messages.map(msg => ({
      role: msg.isBot ? 'assistant' : 'user',
      content: msg.text
    }));
    
    // Add the current user message
    conversationHistory.push({ role: 'user', content: userMessage });

    try {
      const { data, error } = await supabase.functions.invoke('chat-with-bootcamp-assistant', {
        body: { messages: conversationHistory }
      });
      
      if (error) throw error;
      
      // Hide typing indicator and show response
      setIsTyping(false);
      addMessage(data.message, true, data.showButton, data.buttonUrl);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setIsTyping(false);
      addMessage("I'm sorry, there was an error. Could you please repeat that?", true);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUserResponse();
    }
  };

  return (
    <div className="h-screen bg-gradient-background md:flex md:items-center md:justify-center md:p-4">
      <div className="w-full max-w-2xl mx-auto h-full md:h-[600px] flex flex-col">
        <Card className="h-full md:rounded-lg rounded-none border-0 md:border shadow-none md:shadow-sm flex flex-col">
          <CardContent className="p-3 md:p-6 h-full flex flex-col min-h-0 pt-safe-top">
            {/* Chat Messages */}
            <div 
              className="overflow-y-auto space-y-3 md:space-y-4 pr-1 md:pr-2 flex-1 min-h-0 py-2"
              style={{ scrollBehavior: 'smooth' }}
            >
              <div className="flex flex-col space-y-3 md:space-y-4 justify-end min-h-full">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[85%] md:max-w-[80%] rounded-lg px-3 md:px-4 py-2 ${
                        message.isBot
                          ? 'bg-secondary text-secondary-foreground'
                          : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.text}</p>
                    </div>
                  </div>
                ))}
                
                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-secondary text-secondary-foreground rounded-lg px-4 py-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Auto-scroll target */}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Bootcamp Button */}
            {showBootcampButton && (
              <div className="flex justify-center my-3 md:my-4">
                <Button 
                  onClick={() => window.open(bootcampButtonUrl, '_blank')}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium px-4 md:px-6 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg w-full md:w-auto max-w-xs"
                >
                  Visit Bootcamp Page
                </Button>
              </div>
            )}

            {/* Input Area */}
            {!isTyping && !showBootcampButton && (
              <div className="flex space-x-2 mt-3 md:mt-4 pt-2 border-t border-border/20 md:border-t-0 md:pt-0 pb-safe">
                <Input
                  ref={inputRef}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your answer here..."
                  className="flex-1 h-12 md:h-10 text-base md:text-sm"
                />
                <Button 
                  onClick={handleUserResponse} 
                  disabled={!userInput.trim()}
                  className="h-12 md:h-10 px-6 md:px-4 text-base md:text-sm"
                >
                  Send
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
