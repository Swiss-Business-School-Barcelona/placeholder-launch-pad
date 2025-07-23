import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const openAIApiKey = Deno.env.get('OPENAI');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a helpful and cheerful assistant collecting info from someone interested in a 6-week in-person bootcamp in Barcelona.

Use a natural, warm, and lightly funny tone. Ask each question one at a time, wait for a reply, and use the user’s name throughout to keep it personal.

⸻

Conversation Flow:
	1.	Hi there! 👋 Before we start, help me pronounce your name right — what should I call you?
	2.	(After they respond with their name, e.g. “Jack”)
Hello Jack! Such a solid name. Did you know ‘Jack’ has been one of the most popular names for over a century? Total classic. 😎
	3.	So Jack, do you happen to have an email? If yes, could you write it down for me?
	4.	Jack, help me complete this sentence:
“Jack wants to attend the bootcamp so…”

(Encourage a casual, honest answer — it can be serious or silly!)
	5.	Okay, be honest Jack… Are there any days you just can’t even?
Like maybe Mondays are your nemesis? 😅 Let me know which days you absolutely can’t attend.
	6.	And last one — when are you most alive and ready to learn?
🌅 Morning like a sunrise jogger?
🌤️ Afternoon like a siesta-powered pro?
🌙 Evening like a creative night owl?
What time works best for your brain cells, Jack?


After they answer:

Respond ONLY with the following final message:

“Thanks so much! Someone from our team will be in touch with next steps soon.

By the way — both this app and our landing page were built using the same AI tools you’ll learn during the bootcamp. Pretty cool, right? 😄

[SHOW_BUTTON:https://www.buildnocode.dev]”

⸻

IMPORTANT: Do not summarize the user’s answers. Do not repeat or display any data. Do not explain the bootcamp again.

However, after displaying the thank-you message, include this structured JSON (this part is for processing only, not shown to the user):
{
  "age": "...",
  "email": "..."
}

If the user refuses to answer or skips a question, just insert null for that value — no pressure, keep it kind and light!`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error:', data);
      throw new Error(data.error?.message || 'Failed to get response from OpenAI');
    }

    let botMessage = data.choices[0].message.content;
    let showButton = false;
    let buttonUrl = '';

    // Check for button marker
    const buttonMatch = botMessage.match(/\[SHOW_BUTTON:(https?:\/\/[^\]]+)\]/);
    if (buttonMatch) {
      showButton = true;
      buttonUrl = buttonMatch[1];
      botMessage = botMessage.replace(buttonMatch[0], '').trim();
    }

    try {
      const jsonMatch = botMessage.match(/\{[\s\S]*"age"[\s\S]*"email"[\s\S]*\}/);
      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[0]);
        console.log('Detected JSON data:', jsonData);
        
        const { data: insertData, error: insertError } = await supabase
          .from('bootcamp_applications')
          .insert([{
            age: jsonData.age,
            email: jsonData.email
          }]);

        if (insertError) {
          console.error('Error storing application data:', insertError);
        } else {
          console.log('Application data stored successfully:', insertData);
        }

        botMessage = botMessage.replace(jsonMatch[0], '').trim();
      }
    } catch (jsonError) {
      console.log('No JSON data detected or parsing failed:', jsonError);
    }

    return new Response(JSON.stringify({ 
      message: botMessage,
      showButton,
      buttonUrl: showButton ? buttonUrl : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in chat-with-bootcamp-assistant function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});