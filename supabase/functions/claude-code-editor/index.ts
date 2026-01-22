import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CodeChangeRequest {
  prompt: string;
  targetFile?: string;
  context?: string;
  repoOwner?: string;
  repoName?: string;
}

interface FileChange {
  path: string;
  originalContent: string;
  newContent: string;
  explanation: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, targetFile, context, repoOwner, repoName } = await req.json() as CodeChangeRequest;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');

    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured. Add it to Supabase secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default repo info
    const owner = repoOwner || 'FastFix-SF';
    const repo = repoName || 'premier-remediation-2-app';

    console.log(`Processing code change request: "${prompt}"`);

    // Step 1: If we have GitHub token and target file, fetch current content
    let currentFileContent = '';
    if (GITHUB_TOKEN && targetFile) {
      try {
        const githubResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${targetFile}`,
          {
            headers: {
              'Authorization': `Bearer ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github.v3+json',
            }
          }
        );

        if (githubResponse.ok) {
          const fileData = await githubResponse.json();
          currentFileContent = atob(fileData.content.replace(/\n/g, ''));
        }
      } catch (err) {
        console.error('Error fetching file from GitHub:', err);
      }
    }

    // Step 2: Build the system prompt for Claude
    const systemPrompt = `You are an expert React/TypeScript developer helping to make code changes in a white-label business website project.

The project structure:
- src/config/business.json - Business configuration (name, colors, contact info)
- src/config/services.json - Services offered
- src/config/areas.json - Service areas
- src/config/faqs.json - FAQ content
- src/components/ - React components
- src/pages/ - Page components
- src/hooks/useBusinessConfig.ts - Hooks to read JSON config

When making changes:
1. Always preserve existing functionality
2. Use TypeScript properly
3. Follow the existing code style
4. If modifying JSON config, ensure valid JSON format
5. If modifying components, use existing imports and patterns

Respond with a JSON object containing:
{
  "explanation": "Brief explanation of what the change does",
  "changes": [
    {
      "path": "relative/path/to/file.tsx",
      "action": "modify" | "create" | "delete",
      "searchReplace": [
        {
          "search": "exact text to find",
          "replace": "new text to use"
        }
      ],
      "fullContent": "For new files or complete rewrites, the full file content"
    }
  ],
  "warnings": ["Any warnings or caveats about the change"]
}

Only respond with valid JSON, no markdown code blocks.`;

    // Step 3: Call Claude API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `${context ? `Current context:\n${context}\n\n` : ''}${currentFileContent ? `Current file content (${targetFile}):\n\`\`\`\n${currentFileContent}\n\`\`\`\n\n` : ''}User request: ${prompt}`
          }
        ]
      })
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error('Claude API error:', claudeResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `Claude API error: ${claudeResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const claudeData = await claudeResponse.json();
    const assistantMessage = claudeData.content[0]?.text;

    if (!assistantMessage) {
      return new Response(
        JSON.stringify({ error: 'No response from Claude' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Parse the response
    let parsedResponse;
    try {
      // Try to extract JSON from the response
      const jsonMatch = assistantMessage.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing Claude response:', parseError);
      return new Response(
        JSON.stringify({
          error: 'Failed to parse Claude response',
          rawResponse: assistantMessage
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully generated code changes');

    return new Response(
      JSON.stringify({
        success: true,
        explanation: parsedResponse.explanation,
        changes: parsedResponse.changes,
        warnings: parsedResponse.warnings || [],
        canAutoApply: !!GITHUB_TOKEN
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in claude-code-editor:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to process code change request'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
