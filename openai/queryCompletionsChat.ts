interface Message {
  question: string;
  reply?: string;
}

interface CompletionOptions {
  apikey: string;
  model: string;
}

export async function queryCompletionsChat(
  systemPrompt: string,
  messages: Message[],
  options: CompletionOptions
): Promise<Message[]> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${options.apikey}`,
    },
    body: JSON.stringify({
      model: options.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...messages.map(msg => ({
          role: msg.reply ? 'assistant' : 'user',
          content: msg.reply || msg.question,
        })),
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  
  return messages.map((msg, index) => ({
    ...msg,
    reply: data.choices[index]?.message?.content || msg.reply,
  }));
} 