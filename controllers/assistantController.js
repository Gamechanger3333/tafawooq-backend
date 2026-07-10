// Tafawoq AI landing-page assistant
// Proxies visitor chat messages to the Groq API. The API key never
// reaches the client — this endpoint is the only thing that talks to
// api.groq.com.

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'openai/gpt-oss-120b';
const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2000;

const SYSTEM_PROMPT = `You are the Tafawoq assistant, a friendly guide embedded on the Tafawoq landing page.

About Tafawoq:
- Tafawoq is a personalized online tutoring platform that connects students with expert mentors.
- Core features: 1-on-1 and group tutoring sessions, live video sessions, course catalog across subjects, progress tracking, assignments, and a mentor/tutor marketplace.
- Visitors on the landing page can browse courses, read about the team, check FAQs, and get started by creating an account.
- Contact email: tafawouk@outlook.com

Your job:
- Answer visitor questions about Tafawoq (what it is, how tutoring works, pricing basics, how to sign up) clearly and briefly.
- If asked something you cannot answer confidently (exact pricing, account-specific issues, technical support), suggest they use the "Send a message" form in the Contact Us section or email tafawouk@outlook.com.
- Keep replies short (2-4 sentences) and conversational — this is a chat widget, not an essay.
- Never invent specific prices, discounts, or guarantees that weren't provided to you.
- If the visitor seems ready to sign up, point them to the "Get Started" button.`;

const isValidMessage = msg =>
  msg &&
  typeof msg.content === 'string' &&
  msg.content.trim().length > 0 &&
  msg.content.length <= MAX_MESSAGE_LENGTH &&
  (msg.role === 'user' || msg.role === 'assistant');

exports.chat = async (req, res) => {
  try {
    const { messages, section } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: 'messages must be a non-empty array' });
    }

    if (messages.length > MAX_MESSAGES) {
      return res.status(400).json({ success: false, message: `Conversation too long (max ${MAX_MESSAGES} messages)` });
    }

    if (!messages.every(isValidMessage)) {
      return res
        .status(400)
        .json({ success: false, message: 'Each message needs a valid role (user/assistant) and non-empty content' });
    }

    if (!process.env.GROQ_API_KEY) {
      console.error('GROQ_API_KEY is not configured');

      return res.status(503).json({ success: false, message: 'Assistant is temporarily unavailable' });
    }

    const contextNote = section
      ? `\n\nThe visitor is currently looking at the "${section}" section of the landing page.`
      : '';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    let groqRes;

    try {
      groqRes = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          max_tokens: 400,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT + contextNote },
            ...messages.map(m => ({ role: m.role, content: m.content }))
          ]
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!groqRes.ok) {
      const errBody = await groqRes.text().catch(() => '');

      console.error('Groq API error:', groqRes.status, errBody);

      return res.status(502).json({ success: false, message: 'Assistant is temporarily unavailable' });
    }

    const data = await groqRes.json();

    const reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(502).json({ success: false, message: 'Assistant could not generate a reply' });
    }

    return res.status(200).json({ success: true, reply });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ success: false, message: 'Assistant took too long to respond' });
    }

    console.error('Assistant chat error:', err);

    return res.status(500).json({ success: false, message: 'Something went wrong' });
  }
};
