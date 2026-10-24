import 'dotenv/config';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || 'gpt-6-luna',
    input: 'Reply with: VetStock OpenAI connection successful.',
  });

  console.log(response.output_text);
}

main().catch((error) => {
  console.error('OpenAI request failed:', error.message);
  process.exitCode = 1;
});