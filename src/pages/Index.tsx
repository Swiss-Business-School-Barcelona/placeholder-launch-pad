import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect } from "react";

interface Message {
  id: number;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

const questions = [
  "What's your favorite hobby and why do you enjoy it?",
  "If you could travel anywhere in the world, where would you go?",
  "What's one skill you'd love to learn in the next year?"
];

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
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

  const startConversation = () => {
    setConversationStarted(true);
    simulateTyping(() => {
      addMessage("Hello! I'm excited to get to know you better. I have a few questions for you.", true);
      setTimeout(() => {
        simulateTyping(() => {
          addMessage(questions[0], true);
        }, 1000);
      }, 1000);
    });
  };

  const handleUserResponse = () => {
    if (!userInput.trim()) return;

    // Add user response
    addMessage(userInput, false);
    setUserInput("");

    // Move to next question or end conversation
    if (currentQuestion < questions.length - 1) {
      const nextQuestionIndex = currentQuestion + 1;
      setCurrentQuestion(nextQuestionIndex);
      
      simulateTyping(() => {
        addMessage("Thank you for sharing! Here's my next question:", true);
        setTimeout(() => {
          simulateTyping(() => {
            addMessage(questions[nextQuestionIndex], true);
          }, 1000);
        }, 1000);
      });
    } else {
      // End conversation
      simulateTyping(() => {
        addMessage("Thank you so much for answering all my questions! It was great getting to know you better. 😊", true);
      });
    }
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
              {currentQuestion < questions.length && !isTyping && (
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
