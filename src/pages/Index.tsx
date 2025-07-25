import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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

interface QAData {
  name: string;
  linkedin: string;
  motivation: string;
  available_days: string;
  preferred_time: string;
  email: string;
  phone: string;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showBootcampButton, setShowBootcampButton] = useState(false);
  const [bootcampButtonUrl, setBootcampButtonUrl] = useState("");
  const [showTimeOptions, setShowTimeOptions] = useState(false);
  const [selectedTimeOptions, setSelectedTimeOptions] = useState<string[]>([]);
  const [showDayOptions, setShowDayOptions] = useState(false);
  const [selectedDayOptions, setSelectedDayOptions] = useState<string[]>([]);
  const [qaData, setQaData] = useState<Partial<QAData>>({});
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

  // Auto-start conversation when component mounts
  useEffect(() => {
    const initializeConversation = async () => {
      setIsTyping(true);
      
      try {
        const { data, error } = await supabase.functions.invoke('chat-with-bootcamp-assistant', {
          body: { messages: [] }
        });
        
        if (error) throw error;
        
        setIsTyping(false);
        addMessage(data.message, true, data.showButton, data.buttonUrl);
      } catch (error) {
        console.error('Error starting conversation:', error);
        setIsTyping(false);
        addMessage("Hi! I'm here to help you with your bootcamp application. What's your name?", true);
      }
    };

    initializeConversation();
  }, []);

  const storeApplicationData = async (finalData: QAData) => {
    try {
      const { error } = await supabase.from('bootcamp_applications').insert([finalData]);
      if (error) {
        console.error('Error storing application data:', error);
      } else {
        console.log('Application data stored successfully');
      }
    } catch (error) {
      console.error('Error storing application:', error);
    }
  };

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
      // When the final message with button is shown, store the collected data
      if (qaData.name && (qaData.email || qaData.phone)) {
        storeApplicationData(qaData as QAData);
      }
    } else if (isBot) {
      // Track the current question being asked
      if (text.includes("What should I call you")) {
        setCurrentQuestion("name");
      } else if (text.includes("LinkedIn profile")) {
        setCurrentQuestion("linkedin");
      } else if (text.includes("wants to attend the bootcamp so")) {
        setCurrentQuestion("motivation");
      } else if (text.includes("which days of the week are you generally available")) {
        setShowDayOptions(true);
        setSelectedDayOptions([]);
        setCurrentQuestion("available_days");
      } else if (text.includes("When are you most alive and ready to learn")) {
        setShowTimeOptions(true);
        setSelectedTimeOptions([]);
        setCurrentQuestion("preferred_time");
      } else if (text.includes("email address or phone number")) {
        setCurrentQuestion("contact");
      } else {
        // Focus input when bot asks a new question (but not when showing button, time options, or day options)
        focusInput();
      }
    }
  };

  const handleTimeOptionChange = (option: string, checked: boolean) => {
    setSelectedTimeOptions(prev => 
      checked 
        ? [...prev, option]
        : prev.filter(item => item !== option)
    );
  };

  const handleDayOptionChange = (option: string, checked: boolean) => {
    if (option === "All the days") {
      if (checked) {
        // Select all weekdays
        setSelectedDayOptions(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);
      } else {
        // Deselect all
        setSelectedDayOptions([]);
      }
    } else {
      setSelectedDayOptions(prev => {
        const newSelection = checked 
          ? [...prev, option]
          : prev.filter(item => item !== option);
        
        // If "All the days" was previously selected and we're deselecting a day, remove "All the days"
        return newSelection.filter(item => item !== "All the days");
      });
    }
  };

  const handleTimeOptionsSubmit = async () => {
    if (selectedTimeOptions.length === 0) return;

    const timeResponse = selectedTimeOptions.join(", ");
    
    // Store the preferred time data
    setQaData(prev => ({ ...prev, preferred_time: timeResponse }));
    
    // Add user response
    addMessage(timeResponse, false);
    setShowTimeOptions(false);
    setSelectedTimeOptions([]);

    // Show typing indicator immediately
    setIsTyping(true);

    // Prepare conversation history for OpenAI
    const conversationHistory = messages.map(msg => ({
      role: msg.isBot ? 'assistant' : 'user',
      content: msg.text
    }));
    
    // Add the current user message
    conversationHistory.push({ role: 'user', content: timeResponse });

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

  const handleDayOptionsSubmit = async () => {
    if (selectedDayOptions.length === 0) return;

    const dayResponse = selectedDayOptions.join(", ");
    
    // Store the available days data
    setQaData(prev => ({ ...prev, available_days: dayResponse }));
    
    // Add user response
    addMessage(dayResponse, false);
    setShowDayOptions(false);
    setSelectedDayOptions([]);

    // Show typing indicator immediately
    setIsTyping(true);

    // Prepare conversation history for OpenAI
    const conversationHistory = messages.map(msg => ({
      role: msg.isBot ? 'assistant' : 'user',
      content: msg.text
    }));
    
    // Add the current user message
    conversationHistory.push({ role: 'user', content: dayResponse });

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

  const simulateTyping = (callback: () => void, delay = 1500) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      callback();
    }, delay);
  };

  const handleUserResponse = async () => {
    if (!userInput.trim()) return;

    // Store the answer based on current question
    const answer = userInput.trim();
    if (currentQuestion === "name") {
      setQaData(prev => ({ ...prev, name: answer }));
    } else if (currentQuestion === "linkedin") {
      setQaData(prev => ({ ...prev, linkedin: answer }));
    } else if (currentQuestion === "motivation") {
      setQaData(prev => ({ ...prev, motivation: answer }));
    } else if (currentQuestion === "contact") {
      // Parse email or phone from the contact response
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
      const phoneRegex = /[\+]?[1-9][\d]{3,14}\b/;
      
      const emailMatch = answer.match(emailRegex);
      const phoneMatch = answer.match(phoneRegex);
      
      setQaData(prev => ({ 
        ...prev, 
        email: emailMatch ? emailMatch[0] : "",
        phone: phoneMatch ? phoneMatch[0] : answer.includes("@") ? "" : answer
      }));
    }

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
    <div className="min-h-screen bg-gradient-background flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-2xl mx-auto h-screen sm:h-auto">
        <Card className="h-[calc(100vh-1rem)] sm:h-[600px]">
          <CardContent className="p-3 sm:p-6 h-full flex flex-col">
            {/* Chat Messages */}
            <div 
              className="overflow-y-auto space-y-4 pr-2 flex-1"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgb(203 213 225) rgb(241 245 249)',
              }}
            >
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
              
              {/* Auto-scroll target */}
              <div ref={messagesEndRef} />
            </div>

            {/* Bootcamp Button */}
            {showBootcampButton && (
              <div className="flex justify-center my-4">
                <Button 
                  onClick={() => window.open(bootcampButtonUrl, '_blank')}
                  variant="hero"
                >
                  Visit Bootcamp Page
                </Button>
              </div>
            )}

            {/* Day Options */}
            {showDayOptions && (
              <div className="space-y-4 mt-4">
                <div className="text-sm text-muted-foreground">
                  Select the day(s) you're available for the bootcamp:
                </div>
                <div className="space-y-3">
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "All the days"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <Checkbox
                        id={option}
                        checked={
                          option === "All the days" 
                            ? selectedDayOptions.length === 7 && ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].every(day => selectedDayOptions.includes(day))
                            : selectedDayOptions.includes(option)
                        }
                        onCheckedChange={(checked) => handleDayOptionChange(option, checked as boolean)}
                      />
                      <label
                        htmlFor={option}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {option}
                      </label>
                    </div>
                  ))}
                </div>
                <Button 
                  onClick={handleDayOptionsSubmit} 
                  disabled={selectedDayOptions.length === 0}
                  className="w-full"
                >
                  Continue
                </Button>
              </div>
            )}

            {/* Time Options */}
            {showTimeOptions && (
              <div className="space-y-4 mt-4">
                <div className="text-sm text-muted-foreground">
                  Select your preferred time(s) for the bootcamp:
                </div>
                <div className="space-y-3">
                  {["Morning 🌅", "Afternoon 🌞", "Evening 🌜"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <Checkbox
                        id={option}
                        checked={selectedTimeOptions.includes(option)}
                        onCheckedChange={(checked) => handleTimeOptionChange(option, checked as boolean)}
                      />
                      <label
                        htmlFor={option}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {option}
                      </label>
                    </div>
                  ))}
                </div>
                <Button 
                  onClick={handleTimeOptionsSubmit} 
                  disabled={selectedTimeOptions.length === 0}
                  className="w-full"
                >
                  Continue
                </Button>
              </div>
            )}

            {/* Input Area */}
            {!isTyping && !showBootcampButton && !showTimeOptions && !showDayOptions && (
              <div className="flex space-x-2 mt-4">
                <Input
                  ref={inputRef}
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
      </div>
    </div>
  );
};

export default Index;
