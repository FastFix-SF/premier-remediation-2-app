import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FileChange {
  path: string;
  action: 'modify' | 'create' | 'delete';
  searchReplace?: Array<{ search: string; replace: string }>;
  fullContent?: string;
}

interface ApplyChangesRequest {
  changes: FileChange[];
  commitMessage: string;
  repoOwner?: string;
  repoName?: string;
  branch?: string;
}

async function getFileSha(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  token: string
): Promise<{ sha: string; content: string } | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      const content = atob(data.content.replace(/\n/g, ''));
      return { sha: data.sha, content };
    }
    return null;
  } catch {
    return null;
  }
}

async function updateFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string,
  sha: string | null,
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const body: any = {
      message,
      content: btoa(content),
      branch
    };

    if (sha) {
      body.sha = sha;
    }

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      }
    );

    if (response.ok) {
      return { success: true };
    } else {
      const error = await response.text();
      return { success: false, error };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

async function deleteFile(
  owner: string,
  repo: string,
  path: string,
  message: string,
  branch: string,
  sha: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sha,
          branch
        })
      }
    );

    if (response.ok) {
      return { success: true };
    } else {
      const error = await response.text();
      return { success: false, error };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { changes, commitMessage, repoOwner, repoName, branch = 'main' } = await req.json() as ApplyChangesRequest;

    if (!changes || changes.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No changes provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');

    if (!GITHUB_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'GITHUB_TOKEN is not configured. Add it to Supabase secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const owner = repoOwner || 'FastFix-SF';
    const repo = repoName || 'premier-remediation-2-app';

    console.log(`Applying ${changes.length} changes to ${owner}/${repo}`);

    const results: Array<{ path: string; success: boolean; error?: string }> = [];

    for (const change of changes) {
      console.log(`Processing ${change.action} for ${change.path}`);

      // Get current file info
      const fileInfo = await getFileSha(owner, repo, change.path, branch, GITHUB_TOKEN);

      if (change.action === 'delete') {
        if (!fileInfo) {
          results.push({ path: change.path, success: false, error: 'File not found' });
          continue;
        }

        const result = await deleteFile(
          owner, repo, change.path,
          commitMessage || `Delete ${change.path}`,
          branch, fileInfo.sha, GITHUB_TOKEN
        );
        results.push({ path: change.path, ...result });

      } else if (change.action === 'create' || change.action === 'modify') {
        let newContent: string;

        if (change.fullContent) {
          newContent = change.fullContent;
        } else if (change.searchReplace && fileInfo) {
          // Apply search/replace
          newContent = fileInfo.content;
          for (const { search, replace } of change.searchReplace) {
            newContent = newContent.replace(search, replace);
          }
        } else if (change.searchReplace && !fileInfo) {
          results.push({ path: change.path, success: false, error: 'File not found for search/replace' });
          continue;
        } else {
          results.push({ path: change.path, success: false, error: 'No content provided' });
          continue;
        }

        const result = await updateFile(
          owner, repo, change.path,
          newContent,
          commitMessage || `Update ${change.path}`,
          branch,
          fileInfo?.sha || null,
          GITHUB_TOKEN
        );
        results.push({ path: change.path, ...result });
      }
    }

    const allSuccess = results.every(r => r.success);

    return new Response(
      JSON.stringify({
        success: allSuccess,
        results,
        message: allSuccess
          ? `Successfully applied ${changes.length} changes`
          : `Some changes failed`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in apply-code-changes:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to apply changes'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
