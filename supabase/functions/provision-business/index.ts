import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProvisionRequest {
  businessName: string;        // e.g., "Acme Plumbing"
  businessSlug: string;        // e.g., "acme-plumbing"
  ownerEmail: string;          // Business owner's email
  templateRepo?: string;       // Template to clone (default: premier-remediation-2-app)
  businessConfig?: {           // Initial business config
    name: string;
    tagline?: string;
    phone?: string;
    email?: string;
    logo?: string;
    primaryColor?: string;
  };
}

interface ProvisionResult {
  success: boolean;
  github?: {
    repoUrl: string;
    repoName: string;
  };
  supabase?: {
    projectId: string;
    projectUrl: string;
    anonKey: string;
  };
  vercel?: {
    projectId: string;
    deploymentUrl: string;
  };
  error?: string;
}

// Step 1: Create GitHub repo from template
async function createGitHubRepo(
  token: string,
  templateOwner: string,
  templateRepo: string,
  newRepoName: string,
  description: string
): Promise<{ success: boolean; repoUrl?: string; error?: string }> {
  try {
    // Use GitHub's template repository feature
    const response = await fetch(
      `https://api.github.com/repos/${templateOwner}/${templateRepo}/generate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          owner: templateOwner,  // Create under same org
          name: newRepoName,
          description,
          private: false,  // Or true for private repos
          include_all_branches: false
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.message || 'Failed to create repo' };
    }

    const data = await response.json();
    return { success: true, repoUrl: data.html_url };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'GitHub API error' };
  }
}

// Step 2: Create Supabase project
async function createSupabaseProject(
  accessToken: string,
  organizationId: string,
  projectName: string,
  dbPassword: string,
  region: string = 'us-west-1'
): Promise<{ success: boolean; projectId?: string; projectUrl?: string; anonKey?: string; error?: string }> {
  try {
    const response = await fetch('https://api.supabase.com/v1/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        organization_id: organizationId,
        name: projectName,
        db_pass: dbPassword,
        region,
        plan: 'free'  // Or 'pro' for paid
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.message || 'Failed to create Supabase project' };
    }

    const data = await response.json();

    // Wait for project to be ready (Supabase takes a few seconds)
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Get project API keys
    const keysResponse = await fetch(`https://api.supabase.com/v1/projects/${data.id}/api-keys`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    let anonKey = '';
    if (keysResponse.ok) {
      const keys = await keysResponse.json();
      const anonKeyData = keys.find((k: any) => k.name === 'anon');
      anonKey = anonKeyData?.api_key || '';
    }

    return {
      success: true,
      projectId: data.id,
      projectUrl: `https://${data.id}.supabase.co`,
      anonKey
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Supabase API error' };
  }
}

// Step 3: Create Vercel project and deployment
async function createVercelDeployment(
  token: string,
  teamId: string,
  projectName: string,
  gitRepoUrl: string,
  envVars: Record<string, string>
): Promise<{ success: boolean; projectId?: string; deploymentUrl?: string; error?: string }> {
  try {
    // First, create the project
    const projectResponse = await fetch(`https://api.vercel.com/v9/projects?teamId=${teamId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName,
        framework: 'vite',
        gitRepository: {
          type: 'github',
          repo: gitRepoUrl.replace('https://github.com/', '')
        },
        environmentVariables: Object.entries(envVars).map(([key, value]) => ({
          key,
          value,
          target: ['production', 'preview', 'development']
        }))
      })
    });

    if (!projectResponse.ok) {
      const errorData = await projectResponse.json();
      return { success: false, error: errorData.error?.message || 'Failed to create Vercel project' };
    }

    const projectData = await projectResponse.json();

    // Trigger initial deployment
    const deployResponse = await fetch(`https://api.vercel.com/v13/deployments?teamId=${teamId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName,
        project: projectData.id,
        gitSource: {
          type: 'github',
          repoId: projectData.link?.repoId,
          ref: 'main'
        }
      })
    });

    let deploymentUrl = `https://${projectName}.vercel.app`;
    if (deployResponse.ok) {
      const deployData = await deployResponse.json();
      deploymentUrl = deployData.url ? `https://${deployData.url}` : deploymentUrl;
    }

    return {
      success: true,
      projectId: projectData.id,
      deploymentUrl
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Vercel API error' };
  }
}

// Step 4: Update business config in the new repo
async function updateBusinessConfig(
  token: string,
  owner: string,
  repo: string,
  config: ProvisionRequest['businessConfig']
): Promise<boolean> {
  if (!config) return true;

  try {
    // Fetch current business.json
    const getResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/src/config/business.json`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        }
      }
    );

    if (!getResponse.ok) return false;

    const fileData = await getResponse.json();
    const currentContent = JSON.parse(atob(fileData.content.replace(/\n/g, '')));

    // Merge new config
    const updatedContent = {
      ...currentContent,
      ...config
    };

    // Update the file
    const updateResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/src/config/business.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: '[FastFix] Initialize business config',
          content: btoa(JSON.stringify(updatedContent, null, 2)),
          sha: fileData.sha,
          branch: 'main'
        })
      }
    );

    return updateResponse.ok;
  } catch (err) {
    console.error('Failed to update business config:', err);
    return false;
  }
}

// Step 5: Set Supabase secrets for the new project
async function setSupabaseSecrets(
  accessToken: string,
  projectId: string,
  secrets: Record<string, string>
): Promise<boolean> {
  try {
    for (const [name, value] of Object.entries(secrets)) {
      await fetch(`https://api.supabase.com/v1/projects/${projectId}/secrets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{ name, value }])
      });
    }
    return true;
  } catch (err) {
    console.error('Failed to set Supabase secrets:', err);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: ProvisionRequest = await req.json();

    // Validate required fields
    if (!request.businessName || !request.businessSlug || !request.ownerEmail) {
      return new Response(
        JSON.stringify({ error: 'businessName, businessSlug, and ownerEmail are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API tokens from environment
    const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');
    const SUPABASE_ACCESS_TOKEN = Deno.env.get('SUPABASE_ACCESS_TOKEN');
    const SUPABASE_ORG_ID = Deno.env.get('SUPABASE_ORG_ID');
    const VERCEL_TOKEN = Deno.env.get('VERCEL_TOKEN');
    const VERCEL_TEAM_ID = Deno.env.get('VERCEL_TEAM_ID');
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GITHUB_TOKEN || !SUPABASE_ACCESS_TOKEN || !VERCEL_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Missing required API tokens (GITHUB_TOKEN, SUPABASE_ACCESS_TOKEN, VERCEL_TOKEN)' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: ProvisionResult = { success: false };
    const templateOwner = 'FastFix-SF';
    const templateRepo = request.templateRepo || 'premier-remediation-2-app';
    const newRepoName = `${request.businessSlug}-app`;

    console.log(`Provisioning new business: ${request.businessName} (${request.businessSlug})`);

    // Step 1: Create GitHub repo
    console.log('Step 1: Creating GitHub repo...');
    const githubResult = await createGitHubRepo(
      GITHUB_TOKEN,
      templateOwner,
      templateRepo,
      newRepoName,
      `Website for ${request.businessName} - Powered by FastFix.ai`
    );

    if (!githubResult.success) {
      return new Response(
        JSON.stringify({ error: `GitHub: ${githubResult.error}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    result.github = {
      repoUrl: githubResult.repoUrl!,
      repoName: newRepoName
    };

    // Wait for repo to be ready
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Update business config in new repo
    if (request.businessConfig) {
      console.log('Updating business config...');
      await updateBusinessConfig(GITHUB_TOKEN, templateOwner, newRepoName, request.businessConfig);
    }

    // Step 2: Create Supabase project
    if (SUPABASE_ACCESS_TOKEN && SUPABASE_ORG_ID) {
      console.log('Step 2: Creating Supabase project...');
      const dbPassword = crypto.randomUUID().replace(/-/g, '').slice(0, 24);

      const supabaseResult = await createSupabaseProject(
        SUPABASE_ACCESS_TOKEN,
        SUPABASE_ORG_ID,
        request.businessSlug,
        dbPassword
      );

      if (supabaseResult.success) {
        result.supabase = {
          projectId: supabaseResult.projectId!,
          projectUrl: supabaseResult.projectUrl!,
          anonKey: supabaseResult.anonKey!
        };

        // Set secrets for the new Supabase project
        await setSupabaseSecrets(SUPABASE_ACCESS_TOKEN, supabaseResult.projectId!, {
          GITHUB_TOKEN,
          GITHUB_OWNER: templateOwner,
          GITHUB_REPO: newRepoName,
          GEMINI_API_KEY: GEMINI_API_KEY || ''
        });
      }
    }

    // Step 3: Create Vercel deployment
    if (VERCEL_TOKEN && VERCEL_TEAM_ID && result.github) {
      console.log('Step 3: Creating Vercel deployment...');
      const vercelResult = await createVercelDeployment(
        VERCEL_TOKEN,
        VERCEL_TEAM_ID,
        request.businessSlug,
        result.github.repoUrl,
        {
          VITE_SUPABASE_URL: result.supabase?.projectUrl || '',
          VITE_SUPABASE_ANON_KEY: result.supabase?.anonKey || ''
        }
      );

      if (vercelResult.success) {
        result.vercel = {
          projectId: vercelResult.projectId!,
          deploymentUrl: vercelResult.deploymentUrl!
        };
      }
    }

    result.success = true;

    console.log('Provisioning complete!', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Provisioning error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to provision business'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
