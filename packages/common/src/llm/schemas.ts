import { z } from '@botpress/sdk'

const ToolCallSchema = z.object({
  id: z.string(),
  type: z.enum(['function']),
  function: z.object({
    name: z.string(),
    arguments: z.string(),
  }),
})

export type ToolCall = z.infer<typeof ToolCallSchema>

const ToolChoiceSchema = z.object({
  // TODO: remove empty value from enum once Studio issue is fixed
  type: z.enum(['auto', 'specific', 'any', 'none', '']).optional(), // note: Claude doesn't support "none" but we can simply strip out the tools when `type` is "none"
  functionName: z.string().optional().describe('Required if `type` is "specific"'),
})

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  type: z.enum(['text', 'tool_calls', 'tool_result', 'multipart']),
  toolCalls: z.array(ToolCallSchema).optional().describe('Required if `type` is "tool_calls"'),
  toolResultCallId: z.string().optional().describe('Required if `type` is "tool_result"'), // note: not supported by Gemini
  content: z
    .string()
    // TODO: union types are not supported yet by the Studio, comment this out when testing via an action card in the Studio
    .or(
      z.array(
        z.object({
          type: z.enum(['text', 'image']),
          mimeType: z.string(),
          text: z.string().optional().describe('Required if part type is "text" '),
          url: z.string().optional().describe('Required if part type is "image"'),
        })
      )
    )
    .optional()
    .describe(
      'Required unless `type` is "tool_call". If `type` is "multipart", this field must be an array of content objects. If `type` is "tool_result" then this field should be the result of the tool call (a plain string or a JSON-encoded array or object). If `type` is "tool_call" then the `toolCalls` field should be used instead.'
    ),
})

export type Message = z.infer<typeof MessageSchema>

export const GenerateContentInputSchema = z.object({
  model: z.string(),
  systemPrompt: z.string().optional(),
  messages: z.array(MessageSchema),
  responseFormat: z
    .enum(['text', 'json_object'])
    .optional()
    .describe(
      'If "json_object" specified then you must also instruct the model to generate JSON either via the system prompt or a user message.'
    ), // note: only OpenAI and Groq support this but for other models we can just append this as an indication in the system prompt
  // note: we don't support streaming yet
  maxTokens: z.number().optional(),
  temperature: z.number().default(1), // TODO: the Studio doesn't support empty number inputs so best to define a proper default value
  topP: z.number().default(1), // TODO: .placeholder() from zui doesn't work, so we have to use .default() which introduces some typing issues
  // note: topK is supported by Claude and Gemini but not by OpenAI or Groq
  stopSequences: z.array(z.string()).optional(),
  tools: z
    .array(
      z.object({
        type: z.literal('function'),
        function: z.object({
          name: z.string(),
          description: z.string().optional(),
          inputSchema: z.object({}).passthrough().optional(),
        }),
      })
    )
    .optional(),
  // TODO: an object with options doesn't seem to be supported by the Studio as it's not rendering correctly, the dropdown for "type" is not working and it's sending a blank value instead which causes a schema validation error unless an empty value is allowed in the `type` enum
  toolChoice: ToolChoiceSchema.optional(), // note: Gemini doesn't support this but we can just ignore it there
  userId: z.string().optional(),
})

export type GenerateContentInput = z.infer<typeof GenerateContentInputSchema>

export const GenerateContentOutputSchema = z.object({
  id: z.string(),
  provider: z.string(),
  model: z.string(),
  choices: z.array(
    MessageSchema.omit({ role: true }).extend({
      role: z.literal('assistant'),
      index: z.number().int(),
      stopReason: z.enum(['stop', 'max_tokens', 'tool_calls', 'content_filter', 'other']),
      // note: stopSequence is supported by Claude but not by OpenAI, Groq or Gemini
    })
  ),
  usage: z.object({
    inputTokens: z.number().int(),
    outputTokens: z.number().int(),
  }),
})

export type GenerateContentOutput = z.infer<typeof GenerateContentOutputSchema>
