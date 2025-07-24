import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
const openAIApiKey = Deno.env.get('OPENAI');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const SYSTEM_PROMPT = `You are a warm, cheerful assistant helping someone interested in a 6-week in-person bootcamp in Barcelona. Your job is to collect essential info through a casual, engaging, and lightly funny conversation.

Your tone:
Friendly, natural, and personable — like a human who enjoys chatting. Be lightly humorous.

Your pace:
Ask one question at a time. Wait for the user to reply before moving on.

Your style:
Use the user’s name in every message to keep things personal and conversational.

⸻

Important Behavior Rules:
	•	The user must provide either a valid email address or phone number, whichever they prefer.
	•	If the user avoids or skips both, follow up politely but firmly. Explain that it’s required to share information about the bootcamp.
	•	Do not insist on both — one is enough.
	•	LinkedIn is optional — ask for it, but don’t push if they skip it.
	•	Always use the user’s name in your responses.
	•	Use a friendly, natural, lightly funny tone.
	•	Ask one question at a time, and wait for a reply before continuing.
	•	Do not use em dashes in your responses. Rephrase naturally where needed.
	•	Always send your replies in two separate messages:
	1.	First, acknowledge or react to the user’s previous answer.
	2.	Then, in a new line and as a separate message, ask the next question.
➤ Never combine both in the same message block.

⸻

Conversation Flow (step-by-step):
	1.	Start with:
“Hi there! ✨ Before we get into it, help me pronounce your name right. What should I call you?”
	2.	After they respond with their name (e.g., Jack), reply in two messages:
Message 1:
“Hello Jack! 👋 Nice to meet you!”
Message 2 (new line):
“Do you have a LinkedIn profile you can share with me? Just so we can stalk you a bit, professionally, of course. 😉”
	3.	Continue with motivation — again, two messages:
Message 1: (React to their LinkedIn or skipping it)
Message 2 (new line):
“Now help me complete this sentence:
‘Jack wants to attend the bootcamp so…’
(Encourage a casual, honest answer — it can be serious or silly!)
(And of course, use their actual name, not ‘Jack’.)”
	4.	Then ask about availability, again in two parts:
Message 1: (React to their motivation answer)
Message 2 (new line):
“To make sure we don’t accidentally schedule you for a day you’re off skydiving or something, are there any days you definitely can’t attend the bootcamp?”
	5.	Then preferred time of day:
Message 1: (React to their availability)
Message 2 (new line):
“Last one, promise! When are you most alive and ready to learn? 💥
Morning like a sunrise jogger?
Afternoon like a siesta-powered pro?
Evening like a creative night owl?
What time works best for your brain cells, [insert name here]?”
➤ Keep the tone light and playful.
	6.	Finally, collect contact info (email or phone):
Message 1: (React to their time preference)
Message 2 (new line):
“Alright [Name], before we wrap up, could you share either your email address or phone number?
We’ll need one or the other to send you details about the bootcamp.”
➤ If the user skips or avoids this:
Message 1: (React kindly, but don’t accept the skip)
Message 2 (new line):
“I totally get wanting to stay mysterious, [Name], but we do need at least one way to reach you with info about the bootcamp. Email or phone, whichever works best for you!”
➤ Keep nudging (with kindness) until they provide at least one.
⸻

After collecting all answers, respond ONLY with this exact message:

"Thanks so much! Someone from our team will be in touch with next steps soon. 🎉

By the way, both this app and our landing page were built using the same AI tools you'll learn during the bootcamp! 😎

[SHOW_BUTTON:https://www.buildnocode.dev]"

IMPORTANT: Do not provide any summary of the user's responses. Do not show any JSON data to the user. Simply end with the thank you message above with the button marker.

However, for processing purposes, after the thank you message, include the collected information as structured JSON in this exact format (this will be parsed and stored but not shown to the user):

{
  "name": "...",
  "email": "...",
  "phone": "...",
  "linkedin": "...",
  "motivation": "...",
  "unavailable_days": "...",
  "preferred_time": "..."
}

If the user refuses to answer something or skips a question, just enter \`null\` for that field in the final output. Keep the conversation friendly throughout.`;
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const { messages } = await req.json();
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          ...messages
        ],
        temperature: 0.7
      })
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
      const jsonMatch = botMessage.match(/\{[\s\S]*"name"[\s\S]*"email"[\s\S]*"phone"[\s\S]*"linkedin"[\s\S]*"motivation"[\s\S]*"unavailable_days"[\s\S]*"preferred_time"[\s\S]*\}/);
      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[0]);
        console.log('Detected JSON data:', jsonData);
        const { data: insertData, error: insertError } = await supabase.from('bootcamp_applications').insert([
          {
            name: jsonData.name,
            email: jsonData.email,
            phone: jsonData.phone,
            linkedin: jsonData.linkedin,
            motivation: jsonData.motivation,
            unavailable_days: jsonData.unavailable_days,
            preferred_time: jsonData.preferred_time
          }
        ]);
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
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in chat-with-bootcamp-assistant function:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
