// Tafawoq AI landing-page assistant
// Proxies visitor chat messages to the Groq API. The API key never
// reaches the client — this endpoint is the only thing that talks to
// api.groq.com.

const Courses = require('../models/coursesModel');

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

/**
 * Shared Groq chat-completions call used by the landing-page assistant, the
 * per-course AI Study Assistant, and AI quiz/summary generation. Throws on
 * any failure — callers funnel that into handleGroqError() for a
 * consistent HTTP response shape.
 */
const callGroq = async (messages, maxTokens = 400, responseFormat) => {
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
        max_tokens: maxTokens,
        messages,
        ...(responseFormat ? { response_format: responseFormat } : {})
      }),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!groqRes.ok) {
    const errBody = await groqRes.text().catch(() => '');

    console.error('Groq API error:', groqRes.status, errBody);

    const err = new Error('Groq API request failed');

    err.isGroqError = true;
    throw err;
  }

  const data = await groqRes.json();
  const reply = data.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    const err = new Error('Assistant could not generate a reply');

    err.isGroqError = true;
    throw err;
  }

  return reply;
};

const handleGroqError = (err, res) => {
  if (err.name === 'AbortError') {
    return res.status(504).json({ success: false, message: 'Assistant took too long to respond' });
  }

  if (err.isGroqError) {
    return res.status(502).json({ success: false, message: 'Assistant is temporarily unavailable' });
  }

  console.error('Assistant error:', err);

  return res.status(500).json({ success: false, message: 'Something went wrong' });
};

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

    const reply = await callGroq([{ role: 'system', content: SYSTEM_PROMPT + contextNote }, ...messages], 400);

    return res.status(200).json({ success: true, reply });
  } catch (err) {
    return handleGroqError(err, res);
  }
};

/**
 * Builds a compact, token-cheap text summary of a course's syllabus
 * (title/about/description + section & topic titles) to ground the AI on
 * — we deliberately don't have full lesson transcripts in the DB, only the
 * structured outline, so that's what the model gets grounded on.
 */
const buildCourseContext = course => {
  const sections = (course.courseDetails?.content || [])
    .map((section, i) => {
      const topics = (section.topics || []).map(t => `    - ${t.title}`).join('\n');

      return `  ${i + 1}. ${section.title}\n${topics}`;
    })
    .join('\n');

  return [
    `Course title: ${course.courseTitle}`,
    `Education level: ${course.education_level}`,
    `About: ${course.courseDetails?.about || 'N/A'}`,
    `Description: ${course.courseDetails?.description || course.desc || 'N/A'}`,
    'Syllabus:',
    sections || '  (no sections published yet)'
  ].join('\n');
};

/**
 * Loads a course and checks that the requesting user is allowed to use AI
 * features on it: the tutor who owns it, an enrolled/purchasing student,
 * or an admin. Returns the course doc, or sends an error response and
 * returns null.
 */
const loadAuthorizedCourse = async (req, res) => {
  const { courseId } = req.params;

  const course = await Courses.findById(courseId);

  if (!course) {
    res.status(404).json({ success: false, message: 'Course not found' });

    return null;
  }

  const isOwner = course.user_id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  const isEnrolled = (req.user.purchasedCourses || []).some(id => id.toString() === course._id.toString());

  if (!isOwner && !isAdmin && !isEnrolled) {
    res.status(403).json({ success: false, message: 'You need to be enrolled in this course to use its AI tools' });

    return null;
  }

  return course;
};

/**
 * POST /assistant/courses/:courseId/qa
 * AI Study Assistant — students ask course-related questions and get a
 * contextual answer grounded in that course's syllabus.
 */
exports.courseQA = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ success: false, message: 'question is required' });
    }

    if (question.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ success: false, message: `Question too long (max ${MAX_MESSAGE_LENGTH} chars)` });
    }

    if (!process.env.GROQ_API_KEY) {
      console.error('GROQ_API_KEY is not configured');

      return res.status(503).json({ success: false, message: 'Assistant is temporarily unavailable' });
    }

    const course = await loadAuthorizedCourse(req, res);

    if (!course) return; // response already sent

    const systemPrompt = `You are a study assistant helping a student with the course "${course.courseTitle}" on Tafawoq.
Answer using only the course context below. If the question is unrelated to this course or asks about something not
covered in the syllabus, say so briefly and suggest the student ask their tutor. Keep answers focused and under 6
sentences unless the student is asking for a worked example.

Course context:
${buildCourseContext(course)}`;

    const reply = await callGroq(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question.trim() }
      ],
      500
    );

    return res.status(200).json({ success: true, reply });
  } catch (err) {
    return handleGroqError(err, res);
  }
};

/**
 * POST /assistant/courses/:courseId/generate
 * AI Content Generation — auto-generates a practice quiz or a summary from
 * the course's syllabus. body: { type: 'quiz' | 'summary', topic?: string }
 */
exports.generateCourseContent = async (req, res) => {
  try {
    const { type, topic } = req.body;

    if (type !== 'quiz' && type !== 'summary') {
      return res.status(400).json({ success: false, message: `type must be "quiz" or "summary"` });
    }

    if (!process.env.GROQ_API_KEY) {
      console.error('GROQ_API_KEY is not configured');

      return res.status(503).json({ success: false, message: 'Assistant is temporarily unavailable' });
    }

    const course = await loadAuthorizedCourse(req, res);

    if (!course) return; // response already sent

    const focus = topic && typeof topic === 'string' && topic.trim() ? `\n\nFocus specifically on: ${topic.trim()}` : '';

    let systemPrompt;
    let responseFormat;

    if (type === 'quiz') {
      systemPrompt = `You are generating a short practice quiz for the course "${course.courseTitle}" on Tafawoq, based
only on the course context below.${focus}

Respond with ONLY valid JSON (no markdown fences, no commentary) matching this shape:
{"questions":[{"question":"string","options":["string","string","string","string"],"correctIndex":0,"explanation":"string"}]}
Generate exactly 5 multiple-choice questions. Each question needs exactly 4 options and one correct answer.

Course context:
${buildCourseContext(course)}`;
      responseFormat = { type: 'json_object' };
    } else {
      systemPrompt = `You are writing a concise study summary for the course "${course.courseTitle}" on Tafawoq, based
only on the course context below.${focus} Keep it to 150-250 words, organized as short bullet points a student can
review before an exam.

Course context:
${buildCourseContext(course)}`;
      responseFormat = undefined;
    }

    const reply = await callGroq(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: type === 'quiz' ? 'Generate the quiz.' : 'Generate the summary.' }],
      1200,
      responseFormat
    );

    if (type === 'quiz') {
      try {
        const parsed = JSON.parse(reply);

        return res.status(200).json({ success: true, quiz: parsed.questions || [] });
      } catch (parseErr) {
        console.error('Failed to parse quiz JSON from Groq:', parseErr, reply);

        return res.status(502).json({ success: false, message: 'Assistant returned an unexpected format' });
      }
    }

    return res.status(200).json({ success: true, summary: reply });
  } catch (err) {
    return handleGroqError(err, res);
  }
};
