import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: number;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);

  const addMessage = (text: string, isBot: boolean) => {
    const newMessage: Message = {
      id: Date.now(),
      text,
      isBot,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const simulateTyping = (callback: () => void, delay = 1500) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      callback();
    }, delay);
  };

  const startConversation = async () => {
    setConversationStarted(true);
    
    // Start the conversation with the bootcamp assistant
    simulateTyping(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('chat-with-bootcamp-assistant', {
          body: { messages: [] }
        });
        
        if (error) throw error;
        
        addMessage(data.message, true);
      } catch (error) {
        console.error('Error starting conversation:', error);
        addMessage("Hi! I'm here to help you with your bootcamp application. What's your age?", true);
      }
    });
  };

  const handleUserResponse = async () => {
    if (!userInput.trim()) return;

    // Add user response
    addMessage(userInput, false);
    const userMessage = userInput;
    setUserInput("");

    // Prepare conversation history for OpenAI
    const conversationHistory = messages.map(msg => ({
      role: msg.isBot ? 'assistant' : 'user',
      content: msg.text
    }));
    
    // Add the current user message
    conversationHistory.push({ role: 'user', content: userMessage });

    simulateTyping(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('chat-with-bootcamp-assistant', {
          body: { messages: conversationHistory }
        });
        
        if (error) throw error;
        
        addMessage(data.message, true);
      } catch (error) {
        console.error('Error getting AI response:', error);
        addMessage("I'm sorry, there was an error. Could you please repeat that?", true);
      }
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUserResponse();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-background flex items-center justify-center px-4">
      <div className="w-full max-w-2xl mx-auto">
        {!conversationStarted ? (
          <div className="text-center space-y-6">
            <h1 className="text-6xl md:text-7xl font-bold tracking-tight bg-gradient-primary bg-clip-text text-transparent">
              Chat with Me
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground font-light">
              Let's have a friendly conversation!
            </p>
            <div className="pt-8">
              <Button 
                variant="hero" 
                className="transform transition-transform hover:scale-105"
                onClick={startConversation}
              >
                Start Chat
              </Button>
            </div>
          </div>
        ) : (
          <Card className="h-[600px] flex flex-col">
            <CardContent className="flex-1 flex flex-col p-6">
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.isBot
                          ? 'bg-secondary text-secondary-foreground'
                          : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
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
              </div>

              {/* Input Area */}
              {!isTyping && (
                <div className="flex space-x-2">
                  <Input
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your answer here..."
                    className="flex-1"
                  />
                  <Button onClick={handleUserResponse} disabled={!userInput.trim()}>
                    Send
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;
