import OpenAI from "openai";

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new OpenAI({ apiKey });
}

export function buildQueryPrompt(type: string, prompt: string): string {
  const base = `You are an expert IT administrator and deployment engineer for Windows workstations. Provide concise, practical, and actionable guidance. `;
  switch (type) {
    case "application":
      return `${base}The user is asking about a software application or install method. Recommend silent install switches, detection rules, and best practices where applicable.\n\nUser question: ${prompt}`;
    case "extension":
      return `${base}The user is asking about browser extension deployment via policy or webstore. Recommend the appropriate install method, registry/policy settings, and caveats.\n\nUser question: ${prompt}`;
    case "startup":
      return `${base}The user is asking about startup actions, scheduled tasks, or first-run scripts. Recommend safe implementation patterns and order-of-operations.\n\nUser question: ${prompt}`;
    case "bundle":
      return `${base}The user is asking about composing a deployment bundle. Help them select compatible items, avoid conflicts, and keep manifests maintainable.\n\nUser question: ${prompt}`;
    default:
      return `${base}\n\nUser question: ${prompt}`;
  }
}

export function buildReviewPrompt(contentType: string, content: string): string {
  return `You are a senior security and deployment reviewer. Review the following ${contentType} for issues, risks, and improvements. Be concise and list top concerns with actionable fixes.\n\n${content}`;
}
