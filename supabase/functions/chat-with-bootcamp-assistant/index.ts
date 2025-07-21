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

const SYSTEM_PROMPT = `You are a helpful and friendly assistant that collects information from candidates interested in attending a 6-week in-person bootcamp in Barcelona.

Your role is to engage users in a natural, conversational way and collect specific information by asking a series of questions one at a time. Be warm, encouraging, and supportive.

Ask the following questions in order, only proceeding after the user responds:

1. What's your age?
2. What's your email address?
3. Can you share your LinkedIn profile? (optional)
4. Tell me a bit about yourself. (background, interests, what you're doing now)
5. Why do you want to join this bootcamp?
6. What do you want to achieve by the end of the bootcamp?
7. How much experience do you have with building apps? (None / Beginner / Intermediate / Advanced)
8. How much experience do you have with AI tools? (None / Beginner / Intermediate / Advanced)
9. What time of day works best for you? (Morning / Afternoon / Evening)
10. Are there any days you cannot attend sessions?
11. How did you hear about the bootcamp?

After collecting all the answers, thank the user warmly and say the following message:

"Thanks so much! Someone from our team will be in touch with next steps soon.

By the way — both this app and our landing page were built using the same AI tools you'll learn during the bootcamp. Pretty cool, right? 😄"

Finally, return all the collected information as structured JSON using this format:

{
"age": "...",
"email": "...",
"linkedin": "...",
"about": "...",
"motivation": "...",
"goal": "...",
"app_experience": "...",
"ai_experience": "...",
"preferred_time": "...",
"unavailable_days": "...",
"referral_source": "..."
}

If the user refuses to answer something or skips a question, just enter \`null\` for that field in the final output. Keep the conversation friendly throughout.`;

serve(async (req) => {
  // Handle CORS preflight requests
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

    const botMessage = data.choices[0].message.content;

    // Check if the message contains JSON data (indicating completion of questionnaire)
    try {
      const jsonMatch = botMessage.match(/\{[\s\S]*"age"[\s\S]*"referral_source"[\s\S]*\}/);
      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[0]);
        console.log('Detected JSON data:', jsonData);
        
        // Store the application data in Supabase
        const { data: insertData, error: insertError } = await supabase
          .from('bootcamp_applications')
          .insert([{
            age: jsonData.age,
            email: jsonData.email,
            linkedin: jsonData.linkedin,
            about: jsonData.about,
            motivation: jsonData.motivation,
            goal: jsonData.goal,
            app_experience: jsonData.app_experience,
            ai_experience: jsonData.ai_experience,
            preferred_time: jsonData.preferred_time,
            unavailable_days: jsonData.unavailable_days,
            referral_source: jsonData.referral_source
          }]);

        if (insertError) {
          console.error('Error storing application data:', insertError);
        } else {
          console.log('Application data stored successfully:', insertData);
        }
        
        // Remove the JSON from the bot message before sending to user
        botMessage = botMessage.replace(jsonMatch[0], '').trim();
      }
    } catch (jsonError) {
      console.log('No JSON data detected or parsing failed:', jsonError);
    }

    return new Response(JSON.stringify({ message: botMessage }), {
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