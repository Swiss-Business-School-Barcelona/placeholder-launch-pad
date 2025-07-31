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
  const [applicationId, setApplicationId] = useState<string | null>(null);
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

  const storeOrUpdateApplicationData = async (dataToStore: Partial<QAData>) => {
    try {
      if (applicationId) {
        // Update existing application
        const { error } = await supabase
          .from('bootcamp_applications')
          .update(dataToStore)
          .eq('id', applicationId);
        
        if (error) {
          console.error('Error updating application data:', error);
        } else {
          console.log('Application data updated successfully');
        }
      } else {
        // Insert new application
        const { data, error } = await supabase
          .from('bootcamp_applications')
          .insert([dataToStore])
          .select('id')
          .single();
        
        if (error) {
          console.error('Error storing application data:', error);
        } else {
          console.log('Application data stored successfully');
          setApplicationId(data.id);
        }
      }
    } catch (error) {
      console.error('Error storing/updating application:', error);
    }
  };

  const addMessage = (text: string, isBot: boolean, showButton?: boolean, buttonUrl?: string) => {
    console.log('Adding message:', { text, isBot, showButton, buttonUrl });
    
    if (isBot && !text.includes('[SHOW_BUTTON:') && !showButton) {
      // Hardcoded splitting rules
      let parts: string[] = [];
      
      if (text.includes("Nice to meet you!")) {
        parts = text.split("Nice to meet you!");
        if (parts.length === 2) {
          parts[0] = parts[0].trim() + " Nice to meet you!";
          parts[1] = parts[1].trim();
        }
      } else if (text.includes("Do you have a LinkedIn profile")) {
        const splitIndex = text.indexOf("Do you have a LinkedIn profile");
        parts = [
          text.substring(0, splitIndex).trim(),
          text.substring(splitIndex).trim()
        ];
      } else if (text.includes("To make sure we don't accidentally schedule")) {
        const splitIndex = text.indexOf("To make sure we don't accidentally schedule");
        parts = [
          text.substring(0, splitIndex).trim(),
          text.substring(splitIndex).trim()
        ];
      } else if (text.includes("which days of the week are you generally available")) {
        const splitIndex = text.indexOf("To make sure we don't accidentally schedule");
        parts = [
          text.substring(0, splitIndex).trim(),
          text.substring(splitIndex).trim()
        ];
      } else if (text.includes("When are you most alive and ready to learn")) {
        const splitIndex = text.indexOf("When are you most alive and ready to learn");
        parts = [
          text.substring(0, splitIndex).trim(),
          text.substring(splitIndex).trim()
        ];
      } else if (text.includes("Now help me complete this sentence:")) {
        const splitIndex = text.indexOf("Now help me complete this sentence:");
        parts = [
          text.substring(0, splitIndex).trim(),
          text.substring(splitIndex).trim()
        ];
      } else if (text.includes("Thanks so much! Someone from our team will be in touch with next steps soon.")) {
        const splitPhrase = "Thanks so much! Someone from our team will be in touch with next steps soon. 🎉";
        const splitIndex = text.indexOf(splitPhrase) + splitPhrase.length;
        parts = [
          text.substring(0, splitIndex).trim(),
          text.substring(splitIndex).trim()
        ];
      } else {
        // No splitting rule matches, treat as single message
        parts = [text];
      }
      
      // Filter out empty parts
      parts = parts.filter(part => part.trim() !== '');
      
      if (parts.length > 1) {
        console.log('Splitting message into parts:', parts);
        
        parts.forEach((part, index) => {
          setTimeout(() => {
            const newMessage: Message = {
              id: Date.now() + index,
              text: part.trim(),
              isBot: true,
              timestamp: new Date(),
              showButton: false,
              buttonUrl: undefined
            };
            setMessages(prev => [...prev, newMessage]);
            
            // Handle question detection on the last part AND ensure we process the complete text
            if (index === parts.length - 1) {
              console.log('Processing question detection for complete text:', text);
              // Use the original complete text for question detection to ensure accuracy
              handleQuestionDetection(text);
            }
          }, index * 1000); // 1 second delay between messages
        });
      } else {
        // Single message
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
          console.log('Processing question detection for single message:', text);
          handleQuestionDetection(text);
        }
      }
    } else {
      // Non-bot message or button message
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
        console.log('Processing question detection for single message:', text);
        handleQuestionDetection(text);
      }
    }
  };

  const handleQuestionDetection = (text: string) => {
    // Track the current question being asked
    if (text.includes("What should I call you")) {
      setCurrentQuestion("name");
    } else if (text.includes("wants to attend the bootcamp so")) {
      setCurrentQuestion("motivation");
    } else if (text.includes("LinkedIn profile")) {
      setCurrentQuestion("linkedin");
      setUserInput("https://www.linkedin.com/in/");
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
        }
      }, 100);
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
    const newData = { preferred_time: timeResponse };
    setQaData(prev => ({ ...prev, ...newData }));
    storeOrUpdateApplicationData(newData);
    
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
    const newData = { available_days: dayResponse };
    setQaData(prev => ({ ...prev, ...newData }));
    storeOrUpdateApplicationData(newData);
    
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
      const newData = { name: answer };
      setQaData(prev => ({ ...prev, ...newData }));
      storeOrUpdateApplicationData(newData);
    } else if (currentQuestion === "linkedin") {
      const newData = { linkedin: answer };
      setQaData(prev => ({ ...prev, ...newData }));
      storeOrUpdateApplicationData(newData);
    } else if (currentQuestion === "motivation") {
      const newData = { motivation: answer };
      setQaData(prev => ({ ...prev, ...newData }));
      storeOrUpdateApplicationData(newData);
    } else if (currentQuestion === "contact") {
      // Parse email or phone from the contact response
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
      const phoneRegex = /[\+]?[1-9][\d]{3,14}\b/;
      
      const emailMatch = answer.match(emailRegex);
      const phoneMatch = answer.match(phoneRegex);
      
      const newData = { 
        email: emailMatch ? emailMatch[0] : "",
        phone: phoneMatch ? phoneMatch[0] : answer.includes("@") ? "" : answer
      };
      setQaData(prev => ({ ...prev, ...newData }));
      storeOrUpdateApplicationData(newData);
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
    <div className="h-[100dvh] bg-gradient-background flex flex-col">
      <div className="w-full max-w-2xl mx-auto h-full flex flex-col px-1 sm:px-4 py-1 sm:py-4">
        <Card className="h-full flex flex-col border-0 sm:border shadow-none sm:shadow-sm rounded-none sm:rounded-lg">
          <CardContent className="p-2 sm:p-6 h-full flex flex-col">
            {/* Chat Messages */}
            <div 
              className="overflow-y-auto space-y-3 sm:space-y-4 pr-1 sm:pr-2 flex-1 min-h-0"
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
                    className={`max-w-[85%] sm:max-w-[80%] rounded-lg px-3 py-2 sm:px-4 sm:py-2 ${
                      message.isBot
                        ? 'bg-secondary text-secondary-foreground'
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    <p className="text-sm sm:text-base leading-relaxed">{message.text}</p>
                  </div>
                </div>
              ))}
              
              {/* Typing indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-secondary text-secondary-foreground rounded-lg px-3 py-2 sm:px-4 sm:py-2">
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
              <div className="flex justify-center my-3 sm:my-4 px-2">
                <Button 
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'No-Code AI Bootcamp in Barcelona',
                        text: 'Check out this amazing 6-week in-person bootcamp in Barcelona!',
                        url: bootcampButtonUrl
                      });
                    } else {
                      // Fallback for browsers that don't support Web Share API
                      const shareText = `Check out this amazing 6-week in-person bootcamp in Barcelona! ${bootcampButtonUrl}`;
                      navigator.clipboard.writeText(shareText).then(() => {
                        alert('Link copied to clipboard!');
                      });
                    }
                  }}
                  variant="hero"
                  className="w-full max-w-xs sm:w-auto text-sm sm:text-base py-3 sm:py-2"
                >
                  Share Bootcamp
                </Button>
              </div>
            )}

            {/* Day Options */}
            {showDayOptions && (
              <div className="space-y-3 sm:space-y-4 mt-3 sm:mt-4 px-1 sm:px-0">
                <div className="text-sm text-muted-foreground">
                  Select the day(s) you're available for the bootcamp:
                </div>
                <div className="relative">
                  <div className="space-y-2 sm:space-y-3 max-h-48 overflow-y-auto">
                    {["All the days", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((option) => (
                      <div key={option} className="flex items-center space-x-3 py-1">
                        <Checkbox
                          id={option}
                          checked={
                            option === "All the days" 
                              ? selectedDayOptions.length === 7 && ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].every(day => selectedDayOptions.includes(day))
                              : selectedDayOptions.includes(option)
                          }
                          onCheckedChange={(checked) => handleDayOptionChange(option, checked as boolean)}
                          className="h-5 w-5"
                        />
                        <label
                          htmlFor={option}
                          className="text-sm sm:text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 py-2"
                        >
                          {option}
                        </label>
                      </div>
                    ))}
                  </div>
                  {/* Scroll indicator gradient */}
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none"></div>
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  Scroll to see more options ↓
                </div>
                <Button 
                  onClick={handleDayOptionsSubmit} 
                  disabled={selectedDayOptions.length === 0}
                  className="w-full py-3 text-sm sm:text-base"
                >
                  Continue
                </Button>
              </div>
            )}

            {/* Time Options */}
            {showTimeOptions && (
              <div className="space-y-3 sm:space-y-4 mt-3 sm:mt-4 px-1 sm:px-0">
                <div className="text-sm text-muted-foreground">
                  Select your preferred time(s) for the bootcamp:
                </div>
                <div className="space-y-2 sm:space-y-3">
                  {["Morning 🌅", "Afternoon 🌞", "Evening 🌜"].map((option) => (
                    <div key={option} className="flex items-center space-x-3 py-1">
                      <Checkbox
                        id={option}
                        checked={selectedTimeOptions.includes(option)}
                        onCheckedChange={(checked) => handleTimeOptionChange(option, checked as boolean)}
                        className="h-5 w-5"
                      />
                      <label
                        htmlFor={option}
                        className="text-sm sm:text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 py-2"
                      >
                        {option}
                      </label>
                    </div>
                  ))}
                </div>
                <Button 
                  onClick={handleTimeOptionsSubmit} 
                  disabled={selectedTimeOptions.length === 0}
                  className="w-full py-3 text-sm sm:text-base"
                >
                  Continue
                </Button>
              </div>
            )}

            {/* Bottom padding for fixed input */}
            <div className="h-16 sm:h-20" />
          </CardContent>
        </Card>
      </div>
      
      {/* Fixed Input Area */}
      {!isTyping && !showBootcampButton && !showTimeOptions && !showDayOptions && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-2 sm:p-4">
          <div className="w-full max-w-2xl mx-auto flex space-x-2">
            <Input
              ref={inputRef}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                currentQuestion === "linkedin" 
                  ? "https://www.linkedin.com/in/" 
                  : "Type your answer here..."
              }
              className="flex-1 text-base py-3 sm:py-2 px-3 sm:px-4"
            />
            <Button 
              onClick={handleUserResponse} 
              disabled={!userInput.trim()}
              className="px-4 sm:px-6 py-3 sm:py-2 text-sm sm:text-base whitespace-nowrap"
            >
              Send
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
